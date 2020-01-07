import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction, FeeRate,
  BaseTransactionInfo, BaseBroadcastResult, UtxoInfo,
} from '@faast/payments-common'
import { extendCodec, nullable, instanceofCodec, enumCodec } from '@faast/ts-common'
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib'
import { BlockbookBitcoin, BlockInfoBitcoin } from 'blockbook-client'

export { BitcoinjsNetwork, UtxoInfo }

export const BlockbookConnectedConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: t.union([t.string, instanceofCodec(BlockbookBitcoin), t.null]),
  },
  'BlockbookConnectedConfig',
)
export type BlockbookConnectedConfig = t.TypeOf<typeof BlockbookConnectedConfig>

export enum AddressType {
  Legacy = 'p2pkh',
  SegwitP2SH = 'p2sh-p2pkh',
  SegwitNative = 'p2wpkh',
}
export const AddressTypeT = enumCodec<AddressType>(AddressType, 'AddressType')

export type BitcoinishPaymentsUtilsConfig = BlockbookConnectedConfig & {
  coinSymbol: string,
  coinName: string,
  bitcoinjsNetwork: BitcoinjsNetwork,
  decimals: number,
}

export type BitcoinishPaymentsConfig = BitcoinishPaymentsUtilsConfig & {
  addressType: AddressType,
  minTxFee: FeeRate,
  dustThreshold: number,
  networkMinRelayFee: number,
}

export const BitcoinishTxOutput = t.type({
  address: t.string,
  amount: t.number,
}, 'BitcoinishTxOutput')
export type BitcoinishTxOutput = t.TypeOf<typeof BitcoinishTxOutput>

export const BitcoinishPaymentTx = t.type({
  inputs: t.array(UtxoInfo),
  outputs: t.array(BitcoinishTxOutput),
  fee: t.number,
  change: t.number,
  changeAddress: nullable(t.string),
}, 'BitcoinishPaymentTx')
export type BitcoinishPaymentTx = t.TypeOf<typeof BitcoinishPaymentTx>

export const BaseBitcoinPaymentsConfig = extendCodec(
  BlockbookConnectedConfig,
  {},
  {
    addressType: AddressTypeT,
    minTxFee: FeeRate,
    dustThreshold: t.number,
    networkMinRelayFee: t.number,
  },
  'BaseBitcoinPaymentsConfig',
)
export type BaseBitcoinPaymentsConfig = t.TypeOf<typeof BaseBitcoinPaymentsConfig>

export const HdBitcoinPaymentsConfig = extendCodec(
  BaseBitcoinPaymentsConfig,
  {
    hdKey: t.string,
  },
  {
    derivationPath: t.string,
  },
  'HdBitcoinishPaymentsConfig',
)
export type HdBitcoinishPaymentsConfig = t.TypeOf<typeof HdBitcoinPaymentsConfig>

export const BitcoinishUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
  },
  'BitcoinishUnsignedTransaction',
)
export type BitcoinishUnsignedTransaction = t.TypeOf<typeof BitcoinishUnsignedTransaction>

export const BitcoinishSignedTransaction = extendCodec(BaseSignedTransaction, {
  data: t.type({
    hex: t.string,
  }),
}, {}, 'BitcoinishSignedTransaction')
export type BitcoinishSignedTransaction = t.TypeOf<typeof BitcoinishSignedTransaction>

export const BitcoinishTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinishTransactionInfo')
export type BitcoinishTransactionInfo = t.TypeOf<typeof BitcoinishTransactionInfo>

export const BitcoinishBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinishBroadcastResult')
export type BitcoinishBroadcastResult = t.TypeOf<typeof BitcoinishBroadcastResult>

export const BitcoinishBlock = BlockInfoBitcoin
export type BitcoinishBlock = BlockInfoBitcoin
