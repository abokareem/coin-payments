import { FeeLevel } from '@faast/payments-common'
import { networks } from 'bitcoinjs-lib'

export const PACKAGE_NAME = 'bitcoin-payments'
export const DECIMAL_PLACES = 8

export const DEFAULT_SERVER = process.env.BITCOIN_SERVER_URL || 'https://btc1.trezor.io'
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
