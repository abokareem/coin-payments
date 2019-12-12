import { FeeLevel, NetworkType, FeeRateType } from '@faast/payments-common'
import { networks } from 'bitcoinjs-lib'
import { AddressType } from './types'

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

export const DEFAULT_ADDRESS_TYPE: AddressType = AddressType.SegwitP2SH

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
  addressType: DEFAULT_ADDRESS_TYPE,
}

export const DEFAULT_NETWORK = NetworkType.Mainnet
export const DEFAULT_MAINNET_SERVER = process.env.BITCOIN_SERVER_URL || 'https://btc1.trezor.io'
export const DEFAULT_TESTNET_SERVER = process.env.BITCOIN_TESTNET_SERVER_URL || 'https://tbtc1.trezor.io'
export const DEFAULT_DERIVATION_PATHS = {
  'legacy': "m/44'/0'/0'",
  'segwit-p2sh': "m/49'/0'/0'",
  'segwit-native': "m/84'/0'/0'",
}

export const DEFAULT_FEE_LEVEL = FeeLevel.Medium
export const DEFAULT_SAT_PER_BYTE_LEVELS = {
  [FeeLevel.High]: 50,
  [FeeLevel.Medium]: 25,
  [FeeLevel.Low]: 10,
}

export const NETWORK_MAINNET = networks.bitcoin
export const NETWORK_TESTNET = networks.testnet

export const MIN_RELAY_FEE = 1000
