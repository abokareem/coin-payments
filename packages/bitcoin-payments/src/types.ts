import * as t from 'io-ts'
import {
  BaseConfig, BaseUnsignedTransaction, BaseSignedTransaction,
  BaseTransactionInfo, BaseBroadcastResult, BaseUtxo,
} from '@faast/payments-common'
import { extendCodec, nullable, instanceofCodec } from '@faast/ts-common';
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib'
import { BlockbookBitcoin, BlockInfoBitcoin, UtxoDetails } from 'blockbook-client'

export { BitcoinjsNetwork }

export const BlockbookConnectedConfig = extendCodec(
  BaseConfig,
  {},
  {
    server: t.union([t.string, instanceofCodec(BlockbookBitcoin), t.null]),
  },
  'BlockbookConnectedConfig',
)
export type BlockbookConnectedConfig = t.TypeOf<typeof BlockbookConnectedConfig>

export const BaseBitcoinPaymentsConfig = extendCodec(
  BlockbookConnectedConfig,
  {},
  {},
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
  BaseUtxo,
  {},
  'BitcoinUtxo',
)
export type BitcoinUtxo = t.TypeOf<typeof BitcoinUtxo>

export const BitcoinBlock = BlockInfoBitcoin
export type BitcoinBlock = BlockInfoBitcoin
