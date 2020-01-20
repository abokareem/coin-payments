import { omit } from 'lodash'
import {
  assertType,
} from '@faast/ts-common'
import { xprvToXpub, deriveAddress, HDNode, deriveHDNode, deriveKeyPair } from './bip44'
import {
  HdBitcoinPaymentsConfig,
} from './types'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'
import { DEFAULT_DERIVATION_PATHS } from './constants'

export class HdBitcoinPayments extends BaseBitcoinPayments<HdBitcoinPaymentsConfig> {
  readonly derivationPath: string
  readonly xpub: string
  readonly xprv: string | null
  readonly hdNode: HDNode

  constructor(public config: HdBitcoinPaymentsConfig) {
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
    this.hdNode = deriveHDNode(config.hdKey, this.derivationPath, this.bitcoinjsNetwork)
  }

  getFullConfig() {
    return {
      ...this.config,
      derivationPath: this.derivationPath,
      addressType: this.addressType,
    }
  }

  getPublicConfig() {
    return {
      ...omit(this.getFullConfig(), ['logger', 'server', 'hdKey']),
      hdKey: this.xpub,
    }
  }
  getAccountId(index: number): string {
    return this.xpub
  }
  getAccountIds(): string[] {
    return [this.xpub]
  }

  getAddress(index: number): string {
    return deriveAddress(this.hdNode, index, this.bitcoinjsNetwork, this.addressType)
  }

  getKeyPair(index: number) {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - HdBitcoinPayments was created with an xpub`)
    }
    return deriveKeyPair(this.hdNode, index, this.bitcoinjsNetwork)
  }
}
