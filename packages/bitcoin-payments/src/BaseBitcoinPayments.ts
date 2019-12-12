import bitcoin from 'bitcoinjs-lib'
import request from 'request-promise-native'
import BigNumber from 'bignumber.js'
import {
  BasePayments, NetworkType, BalanceResult, Payport, FeeOption, ResolvedFeeOption,
  FeeLevel, FeeOptionCustom, FeeRateType, ResolveablePayport, GetPayportOptions,
  CreateTransactionOptions, FromTo, FeeRate, TransactionStatus,
} from '@faast/payments-common'
import { assertType, isUndefined, isType, toBigNumber, Numeric, isNumber } from '@faast/ts-common'

import { estimateTxFee, getBlockcypherFeeEstimate } from './utils'
import { xprvToXpub, deriveAddress, deriveHdNode } from './bip44'
import {
  BaseBitcoinPaymentsConfig, BitcoinishUnsignedTransaction, BitcoinishPaymentTx, BitcoinishSignedTransaction,
} from './types'
import {
  DEFAULT_DERIVATION_PATH,
  DEFAULT_SAT_PER_BYTE_LEVELS,
  MIN_RELAY_FEE,
  DEFAULT_FEE_LEVEL,
  BITCOIN_CONFIG,
} from './constants'
import { toBaseDenominationNumber, toMainDenominationNumber, isValidAddress } from './helpers'
import { BitcoinishPayments } from './BitcoinishPayments'

export abstract class BaseBitcoinPayments<Config extends BaseBitcoinPaymentsConfig> extends BitcoinishPayments<Config> {

  constructor(config: BaseBitcoinPaymentsConfig) {
    super({
      ...BITCOIN_CONFIG,
      bitcoinjsNetwork: config.network === NetworkType.Testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin,
      ...config,
    })
  }

  abstract getKeyPair(index: number): bitcoin.ECPair

  async isValidAddress(address: string): Promise<boolean> {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  async getFeeRateRecommendation(feeLevel: FeeLevel.High | FeeLevel.Medium | FeeLevel.Low): Promise<FeeRate> {
    let satPerByte: number
    try {
      satPerByte = await getBlockcypherFeeEstimate(feeLevel, this.networkType)
    } catch (e) {
      satPerByte = DEFAULT_SAT_PER_BYTE_LEVELS[feeLevel]
      this.logger.warn(
        `Failed to get bitcoin ${this.networkType} fee estimate, using hardcoded default of ${feeLevel} sat/byte -- ${e.message}`
      )
    }
    return {
      feeRate: satPerByte.toString(),
      feeRateType: FeeRateType.BasePerWeight,
    }
  }

  async signTransaction(tx: BitcoinishUnsignedTransaction): Promise<BitcoinishSignedTransaction> {
    const keyPair = this.getKeyPair(tx.fromIndex)
    const { inputs, outputs } = tx.data as BitcoinishPaymentTx

    let redeemScript = undefined
    if (this.isSegwit) {
      redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(
        bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
    }

    let builder = new bitcoin.TransactionBuilder(this.bitcoinjsNetwork)
    for (let output of outputs) {
      builder.addOutput(output.address, toBaseDenominationNumber(output.amount))
    }
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      builder.addInput(input.txid, input.vout)
      builder.sign(
        i,
        keyPair,
        redeemScript,
        undefined, // undefined for simple Segwit
        toBaseDenominationNumber(input.value)
      )
    }
    const built = builder.build()
    const txId = built.getId()
    const txHex = built.toHex()
    return {
      ...tx,
      status: TransactionStatus.Signed,
      id: txId,
      data: {
        hex: txHex,
      },
    }
  }
}
