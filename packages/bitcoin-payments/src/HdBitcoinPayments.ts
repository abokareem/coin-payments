import bitcoin from 'bitcoinjs-lib'
import request from 'request-promise-native'
import BigNumber from 'bignumber.js'
import { omit } from 'lodash'
import {
  BasePayments, NetworkType, BalanceResult, Payport, FeeOption, ResolvedFeeOption,
  FeeLevel, FeeOptionCustom, FeeRateType, ResolveablePayport, CreateTransactionOptions,
} from '@faast/payments-common'
import {
  assertType, isUndefined, isType, isNumber, toBigNumber,
} from '@faast/ts-common'
import { estimateTxFee, getBlockcypherFeeEstimate } from './utils'
import { BitcoinPaymentsUtils } from './BitcoinPaymentsUtils'
import { xprvToXpub, deriveAddress, deriveHdNode, derivePrivateKey } from './bip44';
import {
  HdBitcoinPaymentsConfig,
  BitcoinTransactionInfo,
  BitcoinBroadcastResult,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  BitcoinjsNetwork,
  BaseBitcoinPaymentsConfig,
} from './types'
import {
  DEFAULT_SERVER,
  DEFAULT_DERIVATION_PATH,
  DEFAULT_SAT_PER_BYTE_LEVELS,
  MIN_RELAY_FEE,
  DEFAULT_FEE_LEVEL,
  BASE_PER_MAIN,
} from './constants'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { toBaseDenominationNumber, toMainDenominationNumber } from './helpers'

export class HdBitcoinPayments extends BaseBitcoinPayments<HdBitcoinPaymentsConfig> {
  readonly derivationPath: string
  readonly xpub: string
  readonly xprv: string | null

  constructor(public config: HdBitcoinPaymentsConfig) {
    super(config)
    assertType(HdBitcoinPaymentsConfig, config)
    this.derivationPath = config.derivationPath || DEFAULT_DERIVATION_PATH

    if (this.isValidXpub(config.hdKey)) {
      this.xpub = config.hdKey
      this.xprv = null
    } else if (this.isValidXprv(config.hdKey)) {
      this.xpub = xprvToXpub(config.hdKey, this.bitcoinjsNetwork)
      this.xprv = config.hdKey
    } else {
      throw new Error('Invalid xprv/xpub provided to bitcoin payments config hdKey')
    }
  }

  getFullConfig() {
    return this.config
  }
  getPublicConfig() {
    return {
      ...omit(this.config, ['logger', 'server']),
      hdKey: this.xpub,
      derivationPath: this.derivationPath,
    }
  }
  getAccountId(index: number): string {
    return this.xpub
  }
  getAccountIds(): string[] {
    return [this.xpub]
  }

  async getPayport(index: number): Promise<Payport> {
    const xpub = this.xpub
    const address = deriveAddress(xpub, index, this.bitcoinjsNetwork)
    if (!this.isValidAddress(address)) {
      // This should never happen
      throw new Error(`Cannot get address ${index} - validation failed for derived address`)
    }
    return { address }
  }

  async getPrivateKey(index: number): Promise<string> {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - HdBitcoinPayments was created with an xpub`)
    }
    return derivePrivateKey(this.xprv, index, this.bitcoinjsNetwork)
  }

  async init() {}
  async destroy() {}

  requiresBalanceMonitor() {
    return false
  }

  async getBalance(address: string): Promise<BalanceResult> {
    const url = this.server + 'addr/' + address
    let body
    try {
      body = await request.get({
        url,
        json: true
      })
    } catch (e) {
      throw new Error(`Unable to get balance from ${url} - ${e.message}`)
    }
    const confirmedBalance = new BigNumber(body.balance)
    const unconfirmedBalance = new BigNumber(body.unconfirmedBalance)
    return {
      confirmedBalance: confirmedBalance.toString(),
      unconfirmedBalance: unconfirmedBalance.toString(),
      sweepable: confirmedBalance.gt(MIN_RELAY_FEE)
    }
  }

  async getUTXOs(index: number) {
    let address = deriveAddress(this.xpub, index, this.bitcoinjsNetwork)
    // console.log('sweeping ', address)
    let url = this.server + 'addr/' + address + '/utxo'
    const body = await request.get({ json: true, url: url })
    if (!Array.isArray(body) || body.length === 0) {
      throw new Error('Unable to get UTXOs from ' + url)
    }
    let cleanUTXOs = body.map((utxo) => {
      delete utxo['confirmations']
      delete utxo['height']
      delete utxo['ts']
      return utxo
    })
    this.logger.log('TESTNET ENABLED: Clipping UTXO length to 2 for test purposes')
    if (this.bitcoinjsNetwork === bitcoin.networks.testnet) {
      cleanUTXOs = cleanUTXOs.slice(0, 2)
    }
    return cleanUTXOs
  }

  async resolveFeeOption(
    feeOption: FeeOption,
    options: { inputCount?: number, outputCount?: number } = {}
  ): Promise<ResolvedFeeOption> {
    let targetFeeLevel: FeeLevel
    let targetFeeRateType: FeeRateType
    let targetFeeRate: number
    let feeBase: number
    let feeMain: number
    if (isType(FeeOptionCustom, feeOption)) {
      targetFeeLevel = FeeLevel.Custom
      targetFeeRateType = feeOption.feeRateType
      targetFeeRate = Number.parseInt(feeOption.feeRate)
    } else {
      targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
      targetFeeRateType = FeeRateType.BasePerWeight
      try {
        targetFeeRate = await getBlockcypherFeeEstimate(targetFeeLevel, this.networkType)
      } catch (e) {
        targetFeeRate = DEFAULT_SAT_PER_BYTE_LEVELS[targetFeeLevel]
        this.logger.warn(
          `Failed to get bitcoin ${this.networkType} fee estimate, using hardcoded default of ${targetFeeRate} sat/byte -- ${e.message}`
        )
      }
    }
    if (targetFeeRateType === FeeRateType.BasePerWeight) {
      const { inputCount, outputCount } = options
      if (!isNumber(inputCount) || !isNumber(outputCount)) {
        throw new Error(
          'inputCount and outputCount options must be provided to resolveFeeOption to calculate fee estimate'
        )
      }
      feeBase = estimateTxFee(targetFeeRate, inputCount, outputCount, true)
      feeMain = toMainDenominationNumber(feeBase)
    } else if (targetFeeRateType === FeeRateType.Base) {
      feeBase = targetFeeRate
      feeMain = toMainDenominationNumber(targetFeeRate)
    } else {
      feeBase = toBaseDenominationNumber(targetFeeRate)
      feeMain = targetFeeRate
    }
    return {
      targetFeeLevel,
      targetFeeRate: targetFeeRate.toString(),
      targetFeeRateType,
      feeBase: feeBase.toString(),
      feeMain: feeMain.toString(),
    }
  }

  async createSweepTransaction(from: number, to: ResolveablePayport, options: CreateTransactionOptions = {}) {
    const txb = new bitcoin.TransactionBuilder(this.bitcoinjsNetwork)
    let inputUtxos = options.inputUtxos
    let totalBalance = 0
    if (inputUtxos.length === 0) {
      return new Error('no input UTXOs provided to createSweepTransaction')
    }
    inputUtxos.forEach((utxo) {
      totalBalance += utxo.satoshis
      txb.addInput(utxo.txid, utxo.vout)
    })
    const { targetFeeRate, targetFeeRateType, } = await this.resolveFeeOption(options, {
      inputCount: inputUtxos.length,
      outputCount: 1,
    })
    if (txfee < MIN_RELAY_FEE) txfee = MIN_RELAY_FEE
    if ((totalBalance - txfee) < txfee) return new Error('Balance too small to sweep!' + totalBalance + ' ' + txfee)
    txb.addOutput(to, totalBalance - txfee)

  }

  async signTransaction(tx) {
    if (this.xprv === null) {
      throw new Error('xprv is null, cannot sign transaction')
    }
    let keyPair = deriveHdNode(this.xprv, tx.from, this.bitcoinjsNetwork).keyPair
    let redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(
      bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
    let txb = tx.txb
    for (let i = 0; i < tx.utxo.length; i++) {
      txb.sign(i,
        keyPair,
        redeemScript,
        undefined, // undefined for simple Segwit
        tx.utxo[i].satoshis
      )
    }
    return { signedTx: txb.build().toHex(), txid: txb.build().getId() }
  }

  async broadcastTransaction(txObject, done, retryUrl, originalResponse): Promise<BitcoinBroadcastResult> {
    let textBody = '{"rawtx":"' + txObject.signedTx + '"}'
    const broadcastHeaders = {
      'pragma': 'no-cache',
      'cookie': '__cfduid=d365c2b104e8c0e947ad9991de7515e131528318303',
      'origin': 'https://blockexplorer.com',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'en-US,en;q=0.9,fr;q=0.8,es;q=0.7',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
      'content-type': 'application/json;charset=UTF-8',
      'accept': 'application/json, text/plain, */*',
      'cache-control': 'no-cache',
      'authority': 'blockexplorer.com',
      'referer': 'https://blockexplorer.com/tx/send'
    }
    let url
    if (retryUrl) url = retryUrl
    else url = this.server
    let options = {
      url: url + 'tx/send',
      method: 'POST',
      headers: broadcastHeaders,
      body: textBody
    }
    let body
    try {
      body = await request(options)
    } catch (e) {
      if (url !== retryUrl) { // First broadcast attempt. Lets try again.
        return this.broadcastTransaction(txObject, done, this.options.backupBroadcastUrl, body)
      } else {
        // Second attempt failed
        throw new Error(
          `unable to broadcast. Some debug info: ${body.toString()} ---- ${originalResponse.toString()}`
        )
      }
    }
    return {
      id: txObject.id,
    }
  }
}
