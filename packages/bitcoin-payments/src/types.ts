import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction,
  BaseTransactionInfo, BaseBroadcastResult, Utxo,
} from '@faast/payments-common'
import { extendCodec, nullable } from '@faast/ts-common'
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib'

export { BitcoinjsNetwork }

export const BaseBitcoinPaymentsConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: nullable(t.string),
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
  'HdBitcoinPaymentsConfig',
)
export type HdBitcoinPaymentsConfig = t.TypeOf<typeof HdBitcoinPaymentsConfig>

export const BitcoinUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
  },
  'BitcoinUnsignedTransaction',
)
export type BitcoinUnsignedTransaction = t.TypeOf<typeof BitcoinUnsignedTransaction>

export const BitcoinSignedTransaction = extendCodec(BaseSignedTransaction, {}, {}, 'BitcoinSignedTransaction')
export type BitcoinSignedTransaction = t.TypeOf<typeof BitcoinSignedTransaction>

export const BitcoinTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'BitcoinTransactionInfo')
export type BitcoinTransactionInfo = t.TypeOf<typeof BitcoinTransactionInfo>

export const BitcoinBroadcastResult = extendCodec(BaseBroadcastResult, {}, {}, 'BitcoinBroadcastResult')
export type BitcoinBroadcastResult = t.TypeOf<typeof BitcoinBroadcastResult>

export const BitcoinUtxo = extendCodec(
  Utxo,
  {
    satoshis: t.number,
    blockNumber: nullable(t.number),
    confirmations: t.number,
    txid: t.string,
    vout: t.number,
  },
  'BitcoinUtxo',
)
export type BitcoinUtxo = t.TypeOf<typeof BitcoinUtxo>
