import bitcoin, { networks } from 'bitcoinjs-lib'
import request from 'request-promise-native'
import { BasePayments, NetworkType, BalanceResult } from '@faast/payments-common'
import { assertType, Logger, DelegateLogger, isUndefined } from '@faast/ts-common'
import { estimateTxFee } from './utils'
import { xprvToXpub } from './bip44';
import BigNumber from 'bignumber.js';
import {
  BitcoinTransactionInfo,
  BitcoinBroadcastResult,
  BaseBitcoinPaymentsConfig,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  BitcoinjsNetwork,
} from './types'
import {
  PACKAGE_NAME,
  DEFAULT_SERVER,
  DEFAULT_DERIVATION_PATH,
  DEFAULT_SAT_PER_BYTE,
  MIN_RELAY_FEE,
} from './constants'

export class BitcoinPayments implements BasePayments<
  BaseBitcoinPaymentsConfig,
  BitcoinUnsignedTransaction,
  BitcoinSignedTransaction,
  BitcoinBroadcastResult,
  BitcoinTransactionInfo
> {
  networkType: NetworkType
  bitcoinjsNetwork: BitcoinjsNetwork
  logger: Logger
  derivationPath: string
  server: string | null

  constructor(public config: BaseBitcoinPaymentsConfig) {
    assertType(BaseBitcoinPaymentsConfig, config)
    this.networkType = config.network || NetworkType.Mainnet
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    this.derivationPath = config.derivationPath || DEFAULT_DERIVATION_PATH

    if (isUndefined(config.server)) {
      this.server = DEFAULT_SERVER
      this.logger.warn(
        'Using default bitcoin block explorer. It is highly suggested you set one yourself!',
        this.server,
      )
    } else {
      this.server = config.server
    }
    this.bitcoinjsNetwork = this.networkType === NetworkType.Mainnet
      ? networks.bitcoin
      : networks.testnet
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

  async getUTXOs(xpub, path, done) {
    let address = this.bip44(xpub, path)
    // console.log('sweeping ', address)
    let url = this.server + 'addr/' + address + '/utxo'
    request.get({json: true, url: url}, function (err, response, body) {
      if (!err && response.statusCode !== 200) {
        return done(new Error('Unable to get UTXOs from ' + url))
      } else if (body.length === 0) {
        return done(new Error('Unable to get UTXOs from ' + url))
      } else {
        let cleanUTXOs = []
        body.forEach(function (utxo) {
          delete utxo['confirmations']
          delete utxo['height']
          delete utxo['ts']
          cleanUTXOs.push(utxo)
        })
        console.log('TESTNET ENABLED: Clipping UTXO length to 2 for test purposes')
        if (this.bitcoinjsNetwork === bitcoin.networks.testnet) {
          cleanUTXOs = cleanUTXOs.slice(0, 2)
        }
        done(null, cleanUTXOs)
      }
    })
  }

  async createSweepTransaction(xprv, path, to, utxo, feePerByte) {
    const txb = new bitcoin.TransactionBuilder(this.bitcoinjsNetwork)
    let totalBalance = 0
    if (utxo.length === 0) {
      return new Error('no UTXOs')
    }
    utxo.forEach(function (spendable) {
      totalBalance += spendable.satoshis
      txb.addInput(spendable.txid, spendable.vout) // alice1 unspent
    })
    if (!feePerByte) feePerByte = DEFAULT_SAT_PER_BYTE
    let txfee = estimateTxFee(feePerByte, utxo.length, 1, true)
    if (txfee < MIN_RELAY_FEE) txfee = MIN_RELAY_FEE
    if ((totalBalance - txfee) < txfee) return new Error('Balance too small to sweep!' + totalBalance + ' ' + txfee)
    txb.addOutput(to, totalBalance - txfee)
    let keyPair = bitcoin.HDNode.fromBase58(xprv, this.bitcoinjsNetwork)
      .derivePath(this.derivationPath)
      .derive(0).derive(path).keyPair
    let redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(
      bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
    for (let i = 0; i < utxo.length; i++) {
      txb.sign(i,
        keyPair,
        redeemScript,
        undefined, // undefined for simple Segwit
        utxo[i].satoshis
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
