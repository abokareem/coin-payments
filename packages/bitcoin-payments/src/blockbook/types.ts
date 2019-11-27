import * as t from 'io-ts'
import { requiredOptionalCodec, extendCodec } from '@faast/ts-common';

/*
 * Status page
 */

export const ApiStatusBlockbook = t.type({
  coin: t.string, // 'Bitcoin',
  host: t.string, // 'blockbook',
  version: t.string, // '0.3.1',
  gitCommit: t.string, // '3d9ad91',
  buildTime: t.string, // '2019-05-17T14:34:00+00:00',
  syncMode: t.boolean, // true,
  initialSync: t.boolean, // false,
  inSync: t.boolean, // true,
  bestHeight: t.number, // 577261,
  lastBlockTime: t.string, // '2019-05-22T18:03:33.547762973+02:00',
  inSyncMempool: t.boolean, // true,
  lastMempoolTime: t.string, // '2019-05-22T18:10:10.27929383+02:00',
  mempoolSize: t.number, // 17348,
  decimals: t.number, // 8,
  dbSize: t.number, // 191887866502,
  about: t.string, // 'Blockbook - blockchain indexer for ...'
}, 'ApiStatusBlockbook')
export type ApiStatusBlockbook = t.TypeOf<typeof ApiStatusBlockbook>

export const ApiStatusBackend = t.type({
  chain: t.string, // 'main',
  blocks: t.number, // 577261,
  headers: t.number, // 577261,
  bestBlockHash: t.string, // '0000000000000000000ca8c902aa58b3118a7f35d093e25a07f17bcacd91cabf',
  difficulty: t.string, // '6704632680587.417',
  sizeOnDisk: t.number, // 250504188580,
  version: t.string, // '180000',
  subversion: t.string, // '/Satoshi:0.18.0/',
  protocolVersion: t.string, // '70015',
  timeOffset: t.number, // 0,
  warnings: t.string, // ''
}, 'ApiStatusBackend')
export type ApiStatusBackend = t.TypeOf<typeof ApiStatusBackend>

export const ApiStatus = t.type({
  blockbook: ApiStatusBlockbook,
  backend: ApiStatusBackend,
}, 'ApiStatus')
export type ApiStatus = t.TypeOf<typeof ApiStatus>

/*
 * Get block hash
 */

 export const BlockHashResponse = t.type({
  blockHash: t.string, // 'ed8f3af8c10ca70a136901c6dd3adf037f0aea8a93fbe9e80939214034300f1e'
}, 'BlockHashResponse')
export type BlockHashResponse = t.TypeOf<typeof BlockHashResponse>

/*
 * Get transaction
 */

const NormalizedTxCommonVin = requiredOptionalCodec(
  {
    n: t.number, // 0
    addresses: t.array(t.string), // ['1DjPjQq4WZwjRvCy6LwdenCu6ynS2m3ob1']
  },
  {
    isAddress: t.boolean, // true
  },
  'NormalizedTxCommonVin'
)

const NormalizedTxCommonVout = requiredOptionalCodec(
  {
    value: t.string, // '1351072'
    n: t.number, // 0
    addresses: t.array(t.string), // ['362wgRYYj8ybZwuQzxE2PNykjJAwStKARz']
  },
  {
    isAddress: t.boolean, // true
  },
  'NormalizedTxCommonVout'
)

const NormalizedTxCommon = requiredOptionalCodec(
  {
    txid: t.string, // '2266ea441e3fbd144e33dc6c62c0d354d59dc267b48efe9a98a6e2fe6584cbd1'
    blockHash: t.string, // '0000000000000000000aac117ba0c0910956020b30e847154311d7d01d50476f'
    blockHeight: t.number, // 605482
    confirmations: t.number, // 1
    blockTime: t.number, // 1574787637
    value: t.string, // '2592355'
    fees: t.string, // '302808'
  },
  {
    version: t.number, // 2
  },
  'NormalizedTxCommon',
)

export const NormalizedTxBitcoinVin = extendCodec(
  NormalizedTxCommonVin,
  {
    txid: t.string, // 'fa0b399f8eb9813f4549fc1066a134f93d1b4c7c6563d12629227ef3faf231b6'
    vout: t.number, // 4
    sequence: t.number, // 4294967295
    value: t.string, // '2895163'
    hex: t.string, // '473044022013a...f2636f'
  },
  'NormalizedTxBitcoinVin',
)
export type NormalizedTxBitcoinVin = t.TypeOf<typeof NormalizedTxBitcoinVin>

export const NormalizedTxBitcoinVout = extendCodec(
  NormalizedTxCommonVout,
  {
    hex: t.string, // 'a9142fa547b613bf425f0308933bbaac5c67899c745d87'
  },
  'NormalizedTxBitcoinVout',
)
export type NormalizedTxBitcoinVout = t.TypeOf<typeof NormalizedTxBitcoinVout>

export const NormalizedTxBitcoin = extendCodec(
  NormalizedTxCommon,
  {
    vin: t.array(NormalizedTxBitcoinVin),
    vout: t.array(NormalizedTxBitcoinVout),
    valueIn: t.string, // '2895163'
    hex: t.string, // 0200000001b631f...ac00000000'
  },
  'NormalizedTxBitcoin'
)
export type NormalizedTxBitcoin = t.TypeOf<typeof NormalizedTxBitcoin>

export const NormalizedTxEthereumVin = NormalizedTxCommonVin
export type NormalizedTxEthereumVin = t.TypeOf<typeof NormalizedTxEthereumVin>

export const NormalizedTxEthereumVout = NormalizedTxCommonVout
export type NormalizedTxEthereumVout = t.TypeOf<typeof NormalizedTxEthereumVout>

export const EthereumSpecific = t.type({
  status: t.number, // 1,
  nonce: t.number, // 2830,
  gasLimit: t.number, // 36591,
  gasUsed: t.number, // 36591,
  gasPrice: t.number, // '11000000000'
}, 'EthereumSpecific')
export type EthereumSpecific = t.TypeOf<typeof EthereumSpecific>

export const TokenTransfer = t.type({
  type: t.string, // 'ERC20',
  from: t.string, // '0x9c2e011c0ce0d75c2b62b9c5a0ba0a7456593803',
  to: t.string, // '0x583cbbb8a8443b38abcc0c956bece47340ea1367',
  token: t.string, // '0xc32ae45504ee9482db99cfa21066a59e877bc0e6',
  name: t.string, // 'Tangany Test Token',
  symbol: t.string, // 'TATETO',
  decimals: t.number, // 18,
  value: t.string, // '133800000'
}, 'TokenTransfer')
export type TokenTransfer = t.TypeOf<typeof TokenTransfer>

export const NormalizedTxEthereum = extendCodec(
  NormalizedTxCommon,
  {
    vin: t.array(NormalizedTxEthereumVin),
    vout: t.array(NormalizedTxEthereumVout),
    ethereumSpecific: EthereumSpecific
  },
  {
    tokenTransfers: t.array(TokenTransfer),
  },
  'NormalizedTxEthereum',
)
export type NormalizedTxEthereum = t.TypeOf<typeof NormalizedTxEthereum>

/*
 * Get transaction specific
 */

export const SpecificTxBitcoinVinScriptSig = t.type({
  asm: t.string, // '30440220...049936719f[ALL] 03231bb7d...2636f'
  hex: t.string, // '47304402...1f2636f'
}, 'SpecificTxBitcoinVinScriptSig')
export type SpecificTxBitcoinVinScriptSig = t.TypeOf<typeof SpecificTxBitcoinVinScriptSig>

export const SpecificTxBitcoinVin = t.type({
  txid: t.string, // 'fa0b399f8eb9813f4549fc1066a134f93d1b4c7c6563d12629227ef3faf231b6'
  vout: t.number, // 4
  scriptSig: SpecificTxBitcoinVinScriptSig,
  sequence: t.number // 4294967295
}, 'SpecificTxBitcoinVin')
export type SpecificTxBitcoinVin = t.TypeOf<typeof SpecificTxBitcoinVin>

export const SpecificTxBitcoinVoutScriptPubKey = t.type({
  asm: t.string, // 'OP_HASH160 2fa547b613bf425f0308933bbaac5c67899c745d OP_EQUAL'
  hex: t.string, // 'a9142fa547b613bf425f0308933bbaac5c67899c745d87'
  reqSigs: t.number, // 1
  type: t.string, // 'scripthash'
  addresses: t.array(t.string), // ['362wgRYYj8ybZwuQzxE2PNykjJAwStKARz']
}, 'SpecificTxBitcoinVoutScriptPubKey')
export type SpecificTxBitcoinVoutScriptPubKey = t.TypeOf<typeof SpecificTxBitcoinVoutScriptPubKey>

export const SpecificTxBitcoinVout = t.type({
  value: t.number, // 0.01351072
  n: t.number, // 0
  scriptPubKey: SpecificTxBitcoinVoutScriptPubKey,
}, 'SpecificTxBitcoinVout')
export type SpecificTxBitcoinVout = t.TypeOf<typeof SpecificTxBitcoinVout>

export const SpecificTxBitcoin = t.type({
  txid: t.string, // '2266ea441e3fbd144e33dc6c62c0d354d59dc267b48efe9a98a6e2fe6584cbd1'
  hash: t.string, // '2266ea441e3fbd144e33dc6c62c0d354d59dc267b48efe9a98a6e2fe6584cbd1'
  version: t.number, // 2
  size: t.number, // 223
  vsize: t.number, // 223
  weight: t.number, // 892
  locktime: t.number, // 0
  vin: t.array(SpecificTxBitcoinVin),
  vout: t.array(SpecificTxBitcoinVout),
  hex: t.string, // '0200000001b63...88ac00000000'
  blockhash: t.string, // '0000000000000000000aac117ba0c0910956020b30e847154311d7d01d50476f'
  confirmations: t.number, // 2
  time: t.number, // 1574787637
  blocktime: t.number, // 1574787637
}, 'SpecificTxBitcoin')
export type SpecificTxBitcoin = t.TypeOf<typeof SpecificTxBitcoin>

/**
 * Get address
 */

const PaginationFields = {
  page: t.number, // 1,
  totalPages: t.number, // 30,
  itemsOnPage: t.number, // 1000,
}

export const GetAddressDetailLevels = t.union([
  t.literal('basic'),
  t.literal('tokens'),
  t.literal('tokenBalances'),
  t.literal('txids'),
  t.literal('txs'),
])
export type GetAddressDetailLevels = t.TypeOf<typeof GetAddressDetailLevels>

export const GetAddressOptions = t.partial({
  page: t.number,
  pageSize: t.number,
  from: t.number,
  to: t.number,
})
export type GetAddressOptions = t.TypeOf<typeof GetAddressOptions>

export const AddressDetailsCommon = t.type({
  address: t.string, // '1DjPjQq4WZwjRvCy6LwdenCu6ynS2m3ob1',
  balance: t.string, // '1436057',
  unconfirmedBalance: t.string, // '0',
  unconfirmedTxs: t.number, // 0,
  txs: t.number, // 3,
}, 'AddressDetailsBasic')
export type AddressDetailsCommon = t.TypeOf<typeof AddressDetailsCommon>

export const AddressDetailsBitcoinBasic = extendCodec(
  AddressDetailsCommon,
  {
    totalReceived: t.string, // '4331220',
    totalSent: t.string, // '2895163',
  },
  'AddressDetailsBitcoinBasic'
)
export type AddressDetailsBitcoinBasic = t.TypeOf<typeof AddressDetailsBitcoinBasic>

export const AddressDetailsBitcoinTokens = AddressDetailsBitcoinBasic
export type AddressDetailsBitcoinTokens = t.TypeOf<typeof AddressDetailsBitcoinTokens>

export const AddressDetailsBitcoinTokenBalances = AddressDetailsBitcoinBasic
export type AddressDetailsBitcoinTokenBalances = t.TypeOf<typeof AddressDetailsBitcoinTokenBalances>

export const AddressDetailsBitcoinTxids = extendCodec(
  AddressDetailsBitcoinTokenBalances,
  PaginationFields,
  {
    txids: t.array(t.string),
  },
  'AddressDetailsBitcoinTxids',
)
export type AddressDetailsBitcoinTxids = t.TypeOf<typeof AddressDetailsBitcoinTxids>

export const AddressDetailsBitcoinTxs = extendCodec(
  AddressDetailsBitcoinTokenBalances,
  PaginationFields,
  {
    transactions: t.array(NormalizedTxBitcoin),
  },
  'AddressDetailsBitcoinTxs',
)
export type AddressDetailsBitcoinTxs = t.TypeOf<typeof AddressDetailsBitcoinTxs>

export const AddressDetailsEthereumBasic = extendCodec(
  AddressDetailsCommon,
  {
    nonTokenTxs: t.number, // 29483,
    nonce: t.string, // '1',
  },
  'AddressDetailsEthereumBasic'
)
export type AddressDetailsEthereumBasic = t.TypeOf<typeof AddressDetailsEthereumBasic>

export const TokenDetailsTypeERC20 = t.literal('ERC20')
export type TokenDetailsTypeERC20 = t.TypeOf<typeof TokenDetailsTypeERC20>

export const TokenDetailsTypeXPUBAddress = t.literal('XPUBAddress')
export type TokenDetailsTypeXPUBAddress = t.TypeOf<typeof TokenDetailsTypeXPUBAddress>

export const TokenDetailsType = t.union(
  [
    TokenDetailsTypeERC20,
    TokenDetailsTypeXPUBAddress,
  ],
  'TokenDetailsType',
)
export type TokenDetailsType = t.TypeOf<typeof TokenDetailsType>

export const TokenDetailsERC20 = t.type({
  type: TokenDetailsTypeERC20, // 'ERC20',
  name: t.string, // 'Carrots',
  contract: t.string, // '0x6e0646b014d99d79f4e875b6723fa8e46becbd15',
  transfers: t.number, // 1,
  symbol: t.string, // 'CEN',
}, 'TokenDetailsERC20')
export type TokenDetailsERC20 = t.TypeOf<typeof TokenDetailsERC20>

export const TokenDetailsXPUBAddress = t.type({
  type: TokenDetailsTypeXPUBAddress,
  name: t.string, // 'DUCd1B3YBiXL5By15yXgSLZtEkvwsgEdqS',
  path: t.string, // 'm/44'/3'/0'/0/0',
  transfers: t.number, // 3,
  decimals: t.number, // 8,
  balance: t.string, // '0',
  totalReceived: t.string, // '2803986975',
  totalSent: t.string, // '2803986975'
}, 'TokenDetailsXPUBAddress')
export type TokenDetailsXPUBAddress = t.TypeOf<typeof TokenDetailsXPUBAddress>

export const TokenDetails = t.union([TokenDetailsERC20, TokenDetailsXPUBAddress])
export type TokenDetails = t.TypeOf<typeof TokenDetails>

export const TokenDetailsERC20Balance = extendCodec(
  TokenDetailsERC20,
  {
    balance: t.string, // '8503600000000000000'
  },
  'TokenDetailsERC20Balance',
)
export type TokenDetailsERC20Balance = t.TypeOf<typeof TokenDetailsERC20Balance>

export const AddressDetailsEthereumTokens = extendCodec(
  AddressDetailsEthereumBasic,
  {},
  {
    tokens: TokenDetailsERC20,
  },
  'AddressDetailsEthereumTokens'
)
export type AddressDetailsEthereumTokens = t.TypeOf<typeof AddressDetailsEthereumTokens>

export const AddressDetailsEthereumTokenBalances = extendCodec(
  AddressDetailsEthereumBasic,
  {},
  {
    tokens: TokenDetailsERC20Balance,
  },
  'AddressDetailsEthereumTokenBalances'
)
export type AddressDetailsEthereumTokenBalances = t.TypeOf<typeof AddressDetailsEthereumTokenBalances>

export const AddressDetailsEthereumTxids = extendCodec(
  AddressDetailsEthereumTokenBalances,
  PaginationFields,
  {
    txids: t.array(t.string),
  },
  'AddressDetailsEthereumTxids',
)
export type AddressDetailsEthereumTxids = t.TypeOf<typeof AddressDetailsEthereumTxids>

export const AddressDetailsEthereumTxs = extendCodec(
  AddressDetailsEthereumTokenBalances,
  PaginationFields,
  {
    transactions: t.array(NormalizedTxEthereum),
  },
  'AddressDetailsEthereumTxs',
)
export type AddressDetailsEthereumTxs = t.TypeOf<typeof AddressDetailsEthereumTxs>

/**
 * Get utxos
 */
