import { FeeLevel, NetworkType, FeeRateType } from '@faast/payments-common'
import { networks } from 'bitcoinjs-lib'
import { PaymentType } from './types'

export const PACKAGE_NAME = 'bitcoin-payments'
export const DECIMAL_PLACES = 8
export const COIN_SYMBOL = 'BTC'
export const COIN_NAME = 'Bitcoin'

/**
 * The minimum value a transaction output must be in order to not get rejected by the network.
 *
 * Unit: `satoshis`
 */
export const DEFAULT_DUST_THRESHOLD = 546

/**
 * The minimum fee required by *most* nodes to relay a transaction.
 *
 * Unit: `satoshis`
 */
export const DEFAULT_NETWORK_MIN_RELAY_FEE = 1000

/**
 * The minimum fee this library should ever use for a transaction (overrides recommended levels).
 *
 * Unit: `sat/byte`
 */
export const DEFAULT_MIN_TX_FEE = 5

export const BITCOIN_PAYMENT_TYPES: PaymentType[] = [
  {
    addressEncoding: 'P2PKH',
    bip44Path: "m/44'/0'",
    bip32: {
      public: 0x0488b21e,
      publicPrefix: 'xpub',
      private: 0x0488ade4,
      privatePrefix: 'xprv',
    },
  },
  {
    addressEncoding: 'P2SH-P2WPKH',
    bip44Path: "m/49'/0'",
    bip32: {
      public: 0x049d7cb2,
      publicPrefix: 'ypub',
      private: 0x049d7878,
      privatePrefix: 'yprv',
    },
  },
  {
    addressEncoding: 'P2WPKH',
    bip44Path: "m/84'/0'",
    bip32: {
      public: 0x04b24746,
      publicPrefix: 'zpub',
      private: 0x04b2430c,
      privatePrefix: 'zprv',
    },
  },
  {
    addressEncoding: 'P2SH-P2WSH',
    bip44Path: null,
    bip32: {
      public: 0x0295b43f,
      publicPrefix: 'Ypub',
      private: 0x0295b005,
      privatePrefix: 'Yprv',
    },
  },
  {
    addressEncoding: 'P2WSH',
    bip44Path: null,
    bip32: {
      public: 0x02aa7ed3,
      publicPrefix: 'Zpub',
      private: 0x02aa7a99,
      privatePrefix: 'Zprv',
    },
  },
]

export const BITCOIN_CONFIG = {
  coinSymbol: COIN_SYMBOL,
  coinName: COIN_NAME,
  decimals: DECIMAL_PLACES,
  dustThreshold: DEFAULT_DUST_THRESHOLD,
  networkMinRelayFee: DEFAULT_NETWORK_MIN_RELAY_FEE,
  minTxFee: {
    feeRate: DEFAULT_MIN_TX_FEE.toString(),
    feeRateType: FeeRateType.BasePerWeight,
  },
  segwit: true,
  paymentTypes: BITCOIN_PAYMENT_TYPES,
}

export const DEFAULT_NETWORK = NetworkType.Mainnet
export const DEFAULT_MAINNET_SERVER = process.env.BITCOIN_SERVER_URL || 'https://btc1.trezor.io'
export const DEFAULT_TESTNET_SERVER = process.env.BITCOIN_TESTNET_SERVER_URL || 'https://tbtc1.trezor.io'
export const DEFAULT_DERIVATION_PATH = "m/49'/0'/0'"

export const DEFAULT_FEE_LEVEL = FeeLevel.Medium
export const DEFAULT_SAT_PER_BYTE_LEVELS = {
  [FeeLevel.High]: 50,
  [FeeLevel.Medium]: 25,
  [FeeLevel.Low]: 10,
}

export const NETWORK_MAINNET = networks.bitcoin
export const NETWORK_TESTNET = networks.testnet

export const MIN_RELAY_FEE = 1000
