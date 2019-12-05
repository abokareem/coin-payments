import bitcoin from 'bitcoinjs-lib'
import request from 'request-promise-native'
import BigNumber from 'bignumber.js'
import {
  BasePayments, NetworkType, BalanceResult, Payport, FeeOption, ResolvedFeeOption,
  FeeLevel, FeeOptionCustom, FeeRateType, ResolveablePayport, GetPayportOptions,
} from '@faast/payments-common'
import {
  assertType, isUndefined, isType, toBigNumber,
} from '@faast/ts-common'

import { estimateTxFee, getBlockcypherFeeEstimate } from './utils'
import { BitcoinPaymentsUtils } from './BitcoinPaymentsUtils'
import { xprvToXpub, deriveAddress, deriveHdNode } from './bip44'
import {
  HdBitcoinPaymentsConfig,
  BitcoinTransactionInfo,
  BitcoinBroadcastResult,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  BitcoinjsNetwork,
  BaseBitcoinPaymentsConfig,
  BitcoinUtxo,
} from './types'
import {
  DEFAULT_DERIVATION_PATH,
  DEFAULT_SAT_PER_BYTE_LEVELS,
  MIN_RELAY_FEE,
  DEFAULT_FEE_LEVEL,
} from './constants'

/**
 * Sort the utxos for input selection
 */
function sortUtxos(utxoList: BitcoinUtxo[]): BitcoinUtxo[] {
  const matureList: BitcoinUtxo[] = []
  const immatureList: BitcoinUtxo[] = []
  utxoList.forEach((utxo) => {
    if (utxo.confirmations && utxo.confirmations >= 6) {
      matureList.push(utxo)
    } else {
      immatureList.push(utxo)
    }
  })
  matureList.sort((a, b) => toBigNumber(a.value).minus(b.value).toNumber()) // Ascending order by value
  immatureList.sort((a, b) => (b.confirmations || 0) - (a.confirmations || 0)) // Descending order by confirmations
  return matureList.concat(immatureList)
}


  /**
   * Build a simple payment transaction.
   * Note: fee will be subtracted from first output when attempting to send entire account balance
   *
   * @param {Object} account - The result of calling discoverAccount
   * @param {Number} account.changeIndex - The index of the next unused changeAddress
   * @param {String[]} account.changeAddresses - An array of all change addresses
   * @param {Object[]} account.utxos - The unspent transaction outputs for the account
   * @param {Number} account.utxos[].value - The value of the utxo (unit: satoshi)
   * @param {Number} account.utxos[].confirmations - The confirmations of the utxo
   * @param {String} account.utxos[].transactionHash - The hash of the transaction this utxo is in
   * @param {Number} account.utxos[].index - The index of this utxo in the transaction
   * @param {Number[]} account.utxos[].addressPath - The bip44 address path of the utxo
   * @param {Object[]} desiredOutputs - Outputs for the transaction (excluding change)
   * @param {String} desiredOutputs[].address - address to send to
   * @param {Number} desiredOutputs[].amount - amount to send (unit: satoshi)
   * @param {FeeRate|Number} feeRate - desired fee (unit: satoshi per byte)
   * @param {Boolean} [isSegwit=true] - True if this is a segwit transaction
   * @param {Number} [dustThreshold=546] - A change output will only be included when greater than this value.
   *   Otherwise it will be included as a fee instead (unit: satoshi)
   * @returns {Object}
   */
  function buildPaymentTx(
    account: AccountInfo,
    desiredOutputs: Array<{ address: string, amount: number}>,
    feeRate: FeeRate | number,
    isSegwit = true,
    dustThreshold?: number,
  ): PaymentTx {
    const { utxos, changeIndex, changeAddresses } = account
    let changeAddress = changeAddresses[changeIndex]
    const sortedUtxos = sortUtxos(utxos)

    if (isSegwit && !isSegwitSupported(this.network)) {
      throw new Error(`Segwit not supported for ${this.network.symbol}`)
    }

    if (typeof dustThreshold === 'undefined') {
      dustThreshold = typeof this.network.dustThreshold !== 'undefined'
        ? this.network.dustThreshold
        : 546
    }

    const outputs = desiredOutputs
      .map(({ address, amount }, i) => {
        // validate
        if (typeof address !== 'string') {
          throw new Error(`Invalid address ${address} provided for output ${i}`)
        }
        if (typeof amount !== 'number') {
          throw new Error(`Invalid amount ${amount} provided for output ${i}`)
        }
        if (this.network.symbol === 'BCH') {
          // Convert to legacy for compatability with bitcoinjs-lib
          address = bchaddr.toLegacyAddress(address)
        }
        // return copy
        return { address, amount }
      })
    const outputCount = outputs.length + 1 // Plus one for change output
    let outputTotal = outputs.reduce((total, { amount }) => total + amount, 0)

    /* Select inputs and calculate appropriate fee */
    const minTxFee = this.network.minTxFee
    let fee = 0 // Total fee is recalculated when adding each input
    let amountWithFee = outputTotal + fee
    const inputUtxos = []
    let inputTotal = 0
    for (const utxo of sortedUtxos) {
      fee = estimateTxFee(feeRate, inputUtxos.length + 1, outputCount, isSegwit)

      // Ensure calculated fee is above network minimum
      if (minTxFee) {
        const minTxFeeSat = estimateTxFee(minTxFee, inputUtxos.length, outputCount, isSegwit)
        if (fee < minTxFeeSat) {
          fee = minTxFeeSat
        }
      }

      amountWithFee = outputTotal + fee
      inputTotal = inputTotal + utxo.satoshis
      inputUtxos.push(utxo)
      if (inputTotal >= amountWithFee) {
        break
      }
    }

    if (amountWithFee > inputTotal) {
      const amountWithSymbol = `${outputTotal * 1e-8} ${this.assetSymbol}`
      if (outputTotal === inputTotal) {
        log.debug(`Attempting to send entire ${amountWithSymbol} balance. ` +
          `Subtracting fee of ${fee} sat from first output.`)
        amountWithFee = outputTotal
        outputs[0].amount -= fee
        outputTotal -= fee
        if (outputs[0].amount <= dustThreshold) {
          throw new Error('First output minus fee is below dust threshold')
        }
      } else {
        throw new Error(`You do not have enough UTXOs to send ${amountWithSymbol} with ${feeRate} sat/byte fee`)
      }
    }

    /* Build outputs */
    log.debug(`Creating ${this.assetSymbol} tx with outputs`, outputs)
    const outputBuilder = new TransactionBuilder(this.network.bitcoinJsNetwork)
    outputs.forEach(({ amount, address }) => outputBuilder.addOutput(address, amount))

    let change = inputTotal - amountWithFee
    let changePath = [1, changeIndex]
    if (change > dustThreshold) { // Avoid creating dust outputs
      outputBuilder.addOutput(changeAddress, change)
    } else {
      log.debug(`Change of ${change} sat is below dustThreshold of ${dustThreshold}, adding to fee`)
      fee += change
      change = 0
      changeAddress = null
      changePath = null
    }
    const outputScript = outputBuilder.buildIncomplete().toHex().slice(10, -8) // required by ledgerjs api

    return {
      inputUtxos,
      outputs,
      outputScript,
      fee,
      change,
      changePath,
      changeAddress,
      isSegwit,
    }

  }

export abstract class BaseBitcoinPayments<Config extends BaseBitcoinPaymentsConfig> extends BitcoinPaymentsUtils
  implements BasePayments<
    Config,
    BitcoinUnsignedTransaction,
    BitcoinSignedTransaction,
    BitcoinBroadcastResult,
    BitcoinTransactionInfo,
    BitcoinUtxo,
  > {

  abstract getFullConfig(): Config
  abstract getPublicConfig(): Config
  abstract getAccountId(index: number): string
  abstract getAccountIds(): string[]
  abstract async getPayport(index: number, options?: GetPayportOptions): Promise<Payport>
  abstract async getPrivateKey(index: number): Promise<string>

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

  async resolvePayport(payport: ResolveablePayport): Promise<Payport> {
    if (typeof payport === 'number') {
      return this.getPayport(payport)
    } else if (typeof payport === 'string') {
      if (!this.isValidAddress(payport)) {
        throw new Error(`Invalid BTC address: ${payport}`)
      }
      return { address: payport }
    }
    if (!this.isValidPayport(payport)) {
      throw new Error(`Invalid BTC payport: ${payport.address}/${payport.extraId}`)
    }
    return payport
  }

  usesUtxos() {
    return true
  }

  async getAvailableUtxos(payport: ResolveablePayport): Promise<BitcoinUtxo[]> {
    const { address } = await this.resolvePayport(payport)
    let utxosRaw = await this.getApi().getUtxosForAddress(address)
    if (this.networkType === NetworkType.Testnet) {
      this.logger.log('TESTNET ENABLED: Clipping UTXO length to 2 for test purposes')
      utxosRaw = utxosRaw.slice(0, 2)
    }
    const utxos: BitcoinUtxo[] = utxosRaw.map((data) => {
      const { value, height, lockTime } = data
      return {
        ...data,
        value: this.toMainDenomination(value),
        height: isUndefined(height) ? undefined : String(height),
        lockTime: isUndefined(lockTime) ? undefined : String(lockTime),
      }
    })
    return utxos
  }

  usesSequenceNumber() {
    return false
  }

  async getNextSequenceNumber() {
    return null
  }

  async resolveFeeOption(feeOption: FeeOption): Promise<ResolvedFeeOption> {
    let targetFeeLevel: FeeLevel
    let targetFeeRateType: FeeRateType
    let targetFeeRate: string
    if (isType(FeeOptionCustom, feeOption)) {
      targetFeeLevel = FeeLevel.Custom
      targetFeeRateType = feeOption.feeRateType
      targetFeeRate = feeOption.feeRate
    } else {
      targetFeeLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
      targetFeeRateType = FeeRateType.BasePerWeight
      try {
        targetFeeRate = (await getBlockcypherFeeEstimate(targetFeeLevel, this.networkType)).toString()
      } catch (e) {
        targetFeeRate = DEFAULT_SAT_PER_BYTE_LEVELS[targetFeeLevel].toString()
        this.logger.warn(
          `Failed to get bitcoin ${this.networkType} fee estimate, using hardcoded default of ${targetFeeRate} sat/byte -- ${e.message}`
        )
      }
    }
    return {
      targetFeeLevel,
      targetFeeRate,
      targetFeeRateType,
      feeBase: '',
      feeMain: '',
    }
  }


  async createSweepTransaction(from: number, to: ResolveablePayport, options: CreateBitcoinTransactionOptions) {
    const txb = new bitcoin.TransactionBuilder(this.bitcoinjsNetwork)
    let totalBalance = 0
    if (utxo.length === 0) {
      return new Error('no UTXOs')
    }
    utxo.forEach((spendable) {
      totalBalance += spendable.satoshis
      txb.addInput(spendable.txid, spendable.vout)
    })
    if (!feePerByte) feePerByte = DEFAULT_SAT_PER_BYTE
    let txfee = estimateTxFee(feePerByte, utxo.length, 1, true)
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
