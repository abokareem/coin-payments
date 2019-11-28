import { BaseBlockbook } from './Blockbook'
import {
  BlockbookConfig,
  NormalizedTxBitcoin,
  SpecificTxBitcoin,
  BlockInfoBitcoin,
  AddressDetailsBitcoinBasic,
  AddressDetailsBitcoinTokens,
  AddressDetailsBitcoinTokenBalances,
  AddressDetailsBitcoinTxids,
  AddressDetailsBitcoinTxs,
} from './types'

export class BlockbookBitcoin extends BaseBlockbook<
  NormalizedTxBitcoin,
  SpecificTxBitcoin,
  BlockInfoBitcoin,
  AddressDetailsBitcoinBasic,
  AddressDetailsBitcoinTokens,
  AddressDetailsBitcoinTokenBalances,
  AddressDetailsBitcoinTxids,
  AddressDetailsBitcoinTxs
> {
  constructor(config: BlockbookConfig) {
    super(
      config,
      NormalizedTxBitcoin,
      SpecificTxBitcoin,
      BlockInfoBitcoin,
      {
        basic: AddressDetailsBitcoinBasic,
        tokens: AddressDetailsBitcoinTokens,
        tokenBalances: AddressDetailsBitcoinTokenBalances,
        txids: AddressDetailsBitcoinTxids,
        txs: AddressDetailsBitcoinTxs,
      }
    )
  }
}
