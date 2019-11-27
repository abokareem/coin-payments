import { PaymentsUtils, NetworkType, Payport } from '@faast/payments-common'
import { networks, Network as BitcoinjsNetwork } from 'bitcoinjs-lib'
import {
  toMainDenominationString,
  toBaseDenominationString,
  isValidXprv,
  isValidXpub,
  isValidAddress,
  isValidExtraId,
  isValidPrivateKey,
  privateKeyToAddress,
} from './helpers'
import { Logger, DelegateLogger, isNil, assertType } from '@faast/ts-common'
import { PACKAGE_NAME } from './constants'
import { BaseBitcoinPaymentsConfig } from './types'

export class BitcoinPaymentsUtils implements PaymentsUtils {
  networkType: NetworkType
  bitcoinjsNetwork: BitcoinjsNetwork
  logger: Logger

  constructor(config: BaseBitcoinPaymentsConfig = {}) {
    assertType(BaseBitcoinPaymentsConfig, config)
    this.networkType = config.network || NetworkType.Mainnet
    this.logger = new DelegateLogger(config.logger, PACKAGE_NAME)
    this.bitcoinjsNetwork = this.networkType === NetworkType.Mainnet
      ? networks.bitcoin
      : networks.testnet
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

  toMainDenomination(amount: string | number): string {
    return toMainDenominationString(amount)
  }

  toBaseDenomination(amount: string | number): string {
    return toBaseDenominationString(amount)
  }

  isValidXprv = isValidXprv
  isValidXpub = isValidXpub

  isValidPrivateKey(privateKey: string) {
    return isValidPrivateKey(privateKey, this.bitcoinjsNetwork)
  }

  privateKeyToAddress(privateKey: string) {
    return privateKeyToAddress(privateKey, this.bitcoinjsNetwork)
  }
}
