import bitcoin from 'bitcoinjs-lib'
import request from 'request-promise-native'
import BigNumber from 'bignumber.js'
import { omit } from 'lodash'
import {
  Payport,
} from '@faast/payments-common'
import {
  assertType,
} from '@faast/ts-common'
import { xprvToXpub, deriveAddress, deriveHdNode, derivePrivateKey } from './bip44'
import {
  HdBitcoinPaymentsConfig,
} from './types'
import {
  DEFAULT_DERIVATION_PATH,
  DEFAULT_SAT_PER_BYTE_LEVELS,
  MIN_RELAY_FEE,
  DEFAULT_FEE_LEVEL,
} from './constants'
import { BaseBitcoinPayments } from './BaseBitcoinPayments'

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

  async getPrivateKey(index: number): Promise<string> {
    if (!this.xprv) {
      throw new Error(`Cannot get private key ${index} - HdBitcoinPayments was created with an xpub`)
    }
    return derivePrivateKey(this.xprv, index, this.bitcoinjsNetwork)
  }
}
