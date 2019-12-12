import {
  BasePayments, UtxoInfo, FeeOptionCustom, FeeRateType, FeeRate, FeeOption,
  ResolvedFeeOption, FeeLevel, AutoFeeLevels, Payport, ResolveablePayport,
  BalanceResult, NetworkType, FromTo, TransactionStatus, CreateTransactionOptions,
} from '@faast/payments-common'
import { isUndefined, isType, Numeric, toBigNumber } from '@faast/ts-common'
import BigNumber from 'bignumber.js'
import { get } from 'lodash'

import {
  BitcoinishUnsignedTransaction, BitcoinishSignedTransaction, BitcoinishBroadcastResult, BitcoinishTransactionInfo,
  BitcoinishPaymentsConfig, BlockbookConnectedConfig,
  BitcoinishPaymentTx,
  AddressType,
} from './types'
import { sortUtxos, estimateTxFee } from './utils'
import { DEFAULT_FEE_LEVEL, MIN_RELAY_FEE } from './constants'
import { BitcoinishPaymentsUtils } from './BitcoinishPaymentsUtils'

export abstract class BitcoinishPayments<Config extends BlockbookConnectedConfig> extends BitcoinishPaymentsUtils
  implements BasePayments<
    Config,
    BitcoinishUnsignedTransaction,
    BitcoinishSignedTransaction,
    BitcoinishBroadcastResult,
    BitcoinishTransactionInfo
  > {
  coinSymbol: string
  coinName: string
  addressType: AddressType
  minTxFee?: FeeRate
  dustThreshold: number
  networkMinRelayFee: number

  constructor(config: BitcoinishPaymentsConfig) {
    super(config)
    this.coinSymbol = config.coinSymbol
    this.coinName = config.coinName
    this.decimals = config.decimals
    this.bitcoinjsNetwork = config.bitcoinjsNetwork
    this.addressType = config.addressType
    this.minTxFee = config.minTxFee
    this.dustThreshold = config.dustThreshold
    this.networkMinRelayFee = config.networkMinRelayFee
  }

  abstract getFullConfig(): Config
  abstract getPublicConfig(): Config
  abstract getAccountId(index: number): string
  abstract getAccountIds(): string[]
  abstract getAddress(index: number): string
  abstract getFeeRateRecommendation(feeLevel: AutoFeeLevels): Promise<FeeRate>
  abstract isValidAddress(address: string): Promise<boolean>
  abstract signTransaction(tx: BitcoinishUnsignedTransaction): Promise<BitcoinishSignedTransaction>

  async init() {}
  async destroy() {}

  get isSegwit() {
    return this.addressType === 'segwit-p2sh' || this.addressType === 'segwit-native'
  }

  requiresBalanceMonitor() {
    return false
  }

  isSweepableBalance(balance: Numeric): boolean {
    return new BigNumber(balance).gt(MIN_RELAY_FEE)
  }

  async getPayport(index: number): Promise<Payport> {
    return { address: this.getAddress(index) }
  }

  async resolvePayport(payport: ResolveablePayport): Promise<Payport> {
    if (typeof payport === 'number') {
      return this.getPayport(payport)
    } else if (typeof payport === 'string') {
      if (!await this.isValidAddress(payport)) {
        throw new Error(`Invalid BTC address: ${payport}`)
      }
      return { address: payport }
    } else if (Payport.is(payport)) {
      if (!await this.isValidAddress(payport.address)) {
        throw new Error(`Invalid BTC payport.address: ${payport.address}`)
      }
      return payport
    } else {
      throw new Error('Invalid payport')
    }
  }

  _feeRateToSatoshis(
    { feeRate, feeRateType }: FeeRate,
    inputCount: number,
    outputCount: number,
  ): number {
    if (feeRateType === FeeRateType.BasePerWeight) {
      return estimateTxFee(Number.parseFloat(feeRate), inputCount, outputCount, this.isSegwit)
    } else if (feeRateType === FeeRateType.Main) {
      return this.toBaseDenominationNumber(feeRate)
    }
    return Number.parseFloat(feeRate)
  }

  _calculatTxFeeSatoshis(
    targetRate: FeeRate,
    inputCount: number,
    outputCount: number,
  ) {
    let feeSat = this._feeRateToSatoshis(targetRate, inputCount, outputCount)
    // Ensure calculated fee is above network minimum
    if (this.minTxFee) {
      const minTxFeeSat = this._feeRateToSatoshis(this.minTxFee, inputCount, outputCount)
      if (feeSat < minTxFeeSat) {
        feeSat = minTxFeeSat
      }
    }
    if (feeSat < this.networkMinRelayFee) {
      feeSat = this.networkMinRelayFee
    }
    return feeSat
  }

  async resolveFeeOption(
    feeOption: FeeOption,
  ): Promise<ResolvedFeeOption> {
    let targetLevel: FeeLevel
    let target: FeeRate
    let feeBase = ''
    let feeMain = ''
    if (isType(FeeOptionCustom, feeOption)) {
      targetLevel = FeeLevel.Custom
      target = feeOption
    } else {
      targetLevel = feeOption.feeLevel || DEFAULT_FEE_LEVEL
      target = await this.getFeeRateRecommendation(targetLevel)
    }
    if (target.feeRateType === FeeRateType.Base) {
      feeBase = target.feeRate
      feeMain = this.toMainDenominationString(feeBase)
    } else if (target.feeRateType === FeeRateType.Main) {
      feeMain = target.feeRate
      feeBase = this.toBaseDenominationString(feeMain)
    }
    // in base/weight case total fees depend on input/output count, so just leave them as empty strings
    return {
      targetFeeLevel: targetLevel,
      targetFeeRate: target.feeRate,
      targetFeeRateType: target.feeRateType,
      feeBase,
      feeMain,
    }
  }

  async getBalance(payport: ResolveablePayport): Promise<BalanceResult> {
    const { address } = await this.resolvePayport(payport)
    const result = await this._retryDced(() => this.getApi().getAddressDetails(address, { details: 'basic' }))
    const confirmedBalance = new BigNumber(result.balance)
    const unconfirmedBalance = new BigNumber(result.unconfirmedBalance)
    return {
      confirmedBalance: confirmedBalance.toString(),
      unconfirmedBalance: unconfirmedBalance.toString(),
      sweepable: this.isSweepableBalance(confirmedBalance)
    }
  }

  usesUtxos() {
    return true
  }

  async getAvailableUtxos(payport: ResolveablePayport): Promise<UtxoInfo[]> {
    const { address } = await this.resolvePayport(payport)
    let utxosRaw = await this.getApi().getUtxosForAddress(address)
    if (this.networkType === NetworkType.Testnet) {
      this.logger.log('TESTNET ENABLED: Clipping UTXO length to 2 for test purposes')
      utxosRaw = utxosRaw.slice(0, 2)
    }
    const utxos: UtxoInfo[] = utxosRaw.map((data) => {
      const { value, height, lockTime } = data
      return {
        ...data,
        satoshis: value,
        value: this.toMainDenominationString(value),
        height: isUndefined(height) ? undefined : String(height),
        lockTime: isUndefined(lockTime) ? undefined : String(lockTime),
      }
    })
    return utxos
  }

  /**
   * Sum the utxos values (main denomination)
   */
  _sumUtxoValue(utxos: UtxoInfo[]): BigNumber {
    return utxos.reduce((total, { value }) => toBigNumber(value).plus(total), new BigNumber(0))
  }

  usesSequenceNumber() {
    return false
  }

  async getNextSequenceNumber() {
    return null
  }

  async resolveFromTo(from: number, to: ResolveablePayport): Promise<FromTo> {
    const fromPayport = await this.getPayport(from)
    const toPayport = await this.resolvePayport(to)
    return {
      fromAddress: fromPayport.address,
      fromIndex: from,
      fromExtraId: fromPayport.extraId,
      fromPayport,
      toAddress: toPayport.address,
      toIndex: typeof to === 'number' ? to : null,
      toExtraId: toPayport.extraId,
      toPayport,
    }
  }

  /**
   * Build a simple payment transaction.
   * Note: fee will be subtracted from first output when attempting to send entire account balance
   */
  async buildPaymentTx(
    availableUtxos: UtxoInfo[],
    desiredOutputs: Array<{ address: string, amount: number }>,
    changeAddress: string,
    feeRate: FeeRate,
    useAllUtxos: boolean = false,
  ): Promise<BitcoinishPaymentTx> {
    let outputTotal = 0
    const outputs = desiredOutputs
    for (let i = 0; i < desiredOutputs.length; i++) {
      const { address, amount } = desiredOutputs[i]
      // validate
      if (!await this.isValidAddress(address)) {
        throw new Error(`Invalid ${this.coinSymbol} address ${address} provided for output ${i}`)
      }
      if (amount <= 0) {
        throw new Error(`Invalid ${this.coinSymbol} amount ${amount} provided for output ${i}`)
      }
      outputTotal += amount
    }
    const outputCount = outputs.length + 1 // Plus one for change output

    /* Select inputs and calculate appropriate fee */
    let inputUtxos = []
    let inputTotal = 0
    let feeSat = 0 // Total fee is recalculated when adding each input
    let amountWithFee = outputTotal + feeSat
    if (useAllUtxos) {
      inputUtxos = availableUtxos
      inputTotal = this.toBaseDenominationNumber(this._sumUtxoValue(availableUtxos))
      feeSat = this._calculatTxFeeSatoshis(feeRate, inputUtxos.length, outputCount)
      amountWithFee = outputTotal + feeSat
    } else {
      const sortedUtxos = sortUtxos(availableUtxos)
      for (const utxo of sortedUtxos) {
        inputUtxos.push(utxo)
        inputTotal = inputTotal + Number.parseFloat(utxo.value)
        feeSat = this._calculatTxFeeSatoshis(feeRate, inputUtxos.length, outputCount)
        amountWithFee = outputTotal + feeSat
        if (inputTotal >= amountWithFee) {
          break
        }
      }
    }
    if (amountWithFee > inputTotal) {
      const amountWithSymbol = `${this.toMainDenominationString(amountWithFee)} ${this.coinSymbol}`
      if (outputTotal === inputTotal) {
        this.logger.debug(`Attempting to send entire ${amountWithSymbol} balance. ` +
          `Subtracting fee of ${feeSat} sat from first output.`)
        amountWithFee = outputTotal
        outputs[0].amount -= feeSat
        outputTotal -= feeSat
        if (outputs[0].amount <= this.dustThreshold) {
          throw new Error(`First ${this.coinSymbol} output minus fee is below dust threshold`)
        }
      } else {
        throw new Error(`You do not have enough UTXOs to send ${amountWithSymbol} with ${feeRate} sat/byte fee`)
      }
    }

    let change = inputTotal - amountWithFee
    if (change > this.dustThreshold) { // Avoid creating dust outputs
      outputs.push({ address: changeAddress, amount: change })
    } else if (change > 0) {
      this.logger.log(`${this.coinSymbol} change of ${change} sat is below dustThreshold of ${this.dustThreshold}, adding to fee`)
      feeSat += change
      change = 0
    }
    return {
      inputs: inputUtxos,
      outputs,
      fee: feeSat,
      change,
      changeAddress,
    }
  }

  async createTransaction(
    from: number,
    to: ResolveablePayport,
    amountNumeric: Numeric,
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinishUnsignedTransaction> {
    const amount = toBigNumber(amountNumeric)
    if (amount.isNaN() || amount.lte(0)) {
      throw new Error(`Invalid ${this.coinSymbol} amount provided to createTransaction: ${amount}`)
    }
    const {
      fromIndex, fromAddress, fromExtraId, toIndex, toAddress, toExtraId,
    } = await this.resolveFromTo(from, to)

    const availableUtxos = isUndefined(options.availableUtxos)
      ? await this.getAvailableUtxos(from)
      : options.availableUtxos

    const { targetFeeLevel, targetFeeRate, targetFeeRateType } = await this.resolveFeeOption(options)

    const paymentTx = await this.buildPaymentTx(
      availableUtxos,
      [{ address: toAddress, amount: amount.toNumber() }],
      fromAddress,
      { feeRate: targetFeeRate, feeRateType: targetFeeRateType },
      options.useAllUtxos,
    )
    const feeMain = this.toMainDenominationString(paymentTx.fee)

    return {
      status: TransactionStatus.Unsigned,
      id: null,
      fromIndex,
      fromAddress,
      fromExtraId,
      toIndex,
      toAddress,
      toExtraId,
      amount: amount.toString(),
      targetFeeLevel,
      targetFeeRate,
      targetFeeRateType,
      fee: feeMain,
      sequenceNumber: null,
      data: paymentTx,
    }
  }

  async createSweepTransaction(
    from: number,
    to: ResolveablePayport,
    options: CreateTransactionOptions = {},
  ): Promise<BitcoinishUnsignedTransaction> {
    const availableUtxos = isUndefined(options.availableUtxos)
      ? await this.getAvailableUtxos(from)
      : options.availableUtxos
    const amount = this._sumUtxoValue(availableUtxos)
    return this.createTransaction(from, to, amount, {
      ...options,
      availableUtxos,
      useAllUtxos: true,
    })
  }

  async broadcastTransaction(tx: BitcoinishSignedTransaction): Promise<BitcoinishBroadcastResult> {
    const txId = await this._retryDced(() => this.getApi().sendTx(tx.data.hex))
    if (tx.id !== txId) {
      this.logger.warn(`Broadcasted ${this.coinSymbol} txid ${txId} doesn't match original txid ${tx.id}`)
    }
    return {
      id: txId,
    }
  }

  async getTransactionInfo(txId: string): Promise<BitcoinishTransactionInfo> {
    const tx = await this._retryDced(() => this.getApi().getTx(txId))
    const amount = this.toMainDenominationString(tx.value)
    const fee = this.toMainDenominationString(tx.fees)
    const confirmationId = tx.blockHash || null
    const confirmationNumber = tx.blockHeight ? String(tx.blockHeight) : undefined
    const confirmationTimestamp = tx.blockTime ? new Date(tx.blockTime) : null
    const isConfirmed = Boolean(confirmationNumber)
    const status = isConfirmed ? TransactionStatus.Confirmed : TransactionStatus.Pending
    const fromAddress = get(tx, 'vin.0.addresses.0')
    if (!fromAddress) {
      throw new Error(`Unable to determine fromAddress of ${this.coinSymbol} tx ${txId}`)
    }
    const toAddress = get(tx, 'vout.0.addresses.0')
    if (!toAddress) {
      throw new Error(`Unable to determine toAddress of ${this.coinSymbol} tx ${txId}`)
    }

    return {
      status,
      id: tx.txid,
      fromIndex: null,
      fromAddress,
      fromExtraId: null,
      toIndex: null,
      toAddress,
      toExtraId: null,
      amount,
      fee,
      sequenceNumber: null,
      confirmationId,
      confirmationNumber,
      confirmationTimestamp,
      isExecuted: isConfirmed,
      isConfirmed,
      confirmations: tx.confirmations,
      data: tx,
    }
  }
}
