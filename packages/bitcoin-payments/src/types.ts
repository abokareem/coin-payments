import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction,
  BaseTransactionInfo, BaseBroadcastResult,
} from '@faast/payments-common'
import { extendCodec, nullable } from '@faast/ts-common'
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib'

export { BitcoinjsNetwork }

export const BaseBitcoinPaymentsConfig = extendCodec(
  BaseConfig,
  {},
  {
    derivationPath: t.string,
    server: nullable(t.string),
  },
  'BaseBitcoinPaymentsConfig',
)
export type BaseBitcoinPaymentsConfig = t.TypeOf<typeof BaseBitcoinPaymentsConfig>

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
