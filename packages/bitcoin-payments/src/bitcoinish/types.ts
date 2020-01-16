import * as t from 'io-ts'
import {
  BaseUnsignedTransaction, BaseSignedTransaction, FeeRate, AutoFeeLevels,
  BaseTransactionInfo, BaseBroadcastResult, UtxoInfo, NetworkTypeT,
} from '@faast/payments-common'
import { extendCodec, nullable, instanceofCodec, requiredOptionalCodec, Logger } from '@faast/ts-common'
import { Network as BitcoinjsNetwork } from 'bitcoinjs-lib'
import { BlockbookBitcoin, BlockInfoBitcoin } from 'blockbook-client'

export { BitcoinjsNetwork, UtxoInfo }

export const BlockbookConfigServer = t.union([t.string, instanceofCodec(BlockbookBitcoin), t.null], 'BlockbookConfigServer')
export type BlockbookConfigServer = t.TypeOf<typeof BlockbookConfigServer>

export const BlockbookConnectedConfig = requiredOptionalCodec(
  {
    network: NetworkTypeT,
    server: BlockbookConfigServer,
  },
  {
    logger: nullable(Logger),
  },
  'BlockbookConnectedConfig',
)
export type BlockbookConnectedConfig = t.TypeOf<typeof BlockbookConnectedConfig>

export type BitcoinishPaymentsUtilsConfig = BlockbookConnectedConfig & {
  coinSymbol: string,
  coinName: string,
  bitcoinjsNetwork: BitcoinjsNetwork,
  decimals: number,
}

export type BitcoinishPaymentsConfig = BitcoinishPaymentsUtilsConfig & {
  minTxFee: FeeRate,
  dustThreshold: number,
  networkMinRelayFee: number,
  isSegwit: boolean,
  defaultFeeLevel: AutoFeeLevels,
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
