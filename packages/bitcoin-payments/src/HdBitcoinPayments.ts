import { omit } from 'lodash'
import {
  assertType,
} from '@faast/ts-common'
import { xprvToXpub, deriveAddress, HDNode, deriveBaseHDNode, deriveKeyPair } from './bip44'
import {
  HdBitcoinPaymentsConfig, HdBitcoinishPaymentsConfig,
} from './types'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { DEFAULT_DERIVATION_PATHS } from './constants'

export class HdBitcoinPayments extends BaseBitcoinPayments<HdBitcoinishPaymentsConfig> {
  readonly derivationPath: string
  readonly xpub: string
  readonly xprv: string | null
  readonly baseHDNode: HDNode

  constructor(public config: HdBitcoinishPaymentsConfig) {
    super(config)
    assertType(HdBitcoinPaymentsConfig, config)
    this.derivationPath = config.derivationPath || DEFAULT_DERIVATION_PATHS[this.addressType]

    if (this.isValidXpub(config.hdKey)) {
      this.xpub = config.hdKey
      this.xprv = null
    } else if (this.isValidXprv(config.hdKey)) {
      this.xpub = xprvToXpub(config.hdKey, this.derivationPath, this.bitcoinjsNetwork)
      this.xprv = config.hdKey
    } else {
      throw new Error('Invalid xprv/xpub provided to bitcoin payments config hdKey')
    }
    this.baseHDNode = deriveBaseHDNode(config.hdKey, this.derivationPath, this.bitcoinjsNetwork)
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

  getAddress(index: number): string {
    return deriveAddress(this.baseHDNode, index, this.bitcoinjsNetwork, this.addressType)
  }

  getKeyPair(index: number) {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - HdBitcoinPayments was created with an xpub`)
    }
    return deriveKeyPair(this.baseHDNode, index, this.bitcoinjsNetwork)
  }
}
