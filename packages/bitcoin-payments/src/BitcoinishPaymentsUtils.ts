import { PaymentsUtils, Payport, createUnitConverters } from '@faast/payments-common'
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib'
import {
  isValidXprv,
  isValidXpub,
  isValidAddress,
  isValidExtraId,
  isValidPrivateKey,
  privateKeyToAddress,
} from './helpers'
import { isNil, assertType, Numeric, isUndefined } from '@faast/ts-common'
import { BlockbookConnected } from './BlockbookConnected'
import { BitcoinishBlock, BitcoinishPaymentsUtilsConfig } from './types'

export class BitcoinishPaymentsUtils extends BlockbookConnected implements PaymentsUtils {

  decimals: number
  bitcoinjsNetwork: BitcoinjsNetwork
  unitConverters: ReturnType<typeof createUnitConverters>

  constructor(config: BitcoinishPaymentsUtilsConfig) {
    super(config)
    this.decimals = config.decimals
    this.bitcoinjsNetwork = config.bitcoinjsNetwork
    this.unitConverters = createUnitConverters(this.decimals)
  }

  async isValidExtraId(extraId: string): Promise<boolean> {
    return isValidExtraId(extraId)
  }

  async isValidAddress(address: string): Promise<boolean> {
    return isValidAddress(address, this.bitcoinjsNetwork)
  }

  private async _getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    const { address, extraId } = payport
    if (!isValidAddress(address, this.bitcoinjsNetwork)) {
      return 'Invalid payport address'
    }
    if (!isNil(extraId) && !isValidExtraId(extraId)) {
      return 'Invalid payport extraId'
    }
  }

  async getPayportValidationMessage(payport: Payport): Promise<string | undefined> {
    try {
      payport = assertType(Payport, payport, 'payport')
    } catch (e) {
      return e.message
    }
    return this._getPayportValidationMessage(payport)
  }

  async validatePayport(payport: Payport): Promise<void> {
    payport = assertType(Payport, payport, 'payport')
    const message = await this._getPayportValidationMessage(payport)
    if (message) {
      throw new Error(message)
    }
  }

  async isValidPayport(payport: Payport): Promise<boolean> {
    return Payport.is(payport) && !(await this._getPayportValidationMessage(payport))
  }

  toMainDenomination(amount: Numeric): string {
    return this.toMainDenominationString(amount)
  }

  toBaseDenomination(amount: Numeric): string {
    return this.toBaseDenominationString(amount)
  }

  toMainDenominationString = this.unitConverters.toMainDenominationString
  toMainDenominationNumber = this.unitConverters.toMainDenominationNumber
  toMainDenominationBigNumber = this.unitConverters.toMainDenominationBigNumber

  toBaseDenominationString = this.unitConverters.toMainDenominationString
  toBaseDenominationNumber = this.unitConverters.toMainDenominationNumber
  toBaseDenominationBigNumber = this.unitConverters.toMainDenominationBigNumber

  isValidXprv = isValidXprv
  isValidXpub = isValidXpub

  isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

  privateKeyToAddress(privateKey: string) {
    return privateKeyToAddress(privateKey, this.bitcoinjsNetwork)
  }

  async getBlock(id?: string | number): Promise<BitcoinishBlock> {
    if (isUndefined(id)) {
      id = (await this.getApi().getStatus()).backend.bestBlockHash
    }
    return this.getApi().getBlock(id)
  }
}
