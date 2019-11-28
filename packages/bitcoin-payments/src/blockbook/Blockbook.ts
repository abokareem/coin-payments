import request from 'request-promise-native'
import { assertType } from '@faast/ts-common'
import * as t from 'io-ts'
import qs from 'qs'

import { BlockbookConfig, SystemInfo, BlockHashResponse, GetAddressOptions } from './types'

export abstract class BaseBlockbook<
  NormalizedTx,
  SpecificTx,
  BlockInfo,
  AddressDetailsBasic,
  AddressDetailsTokens,
  AddressDetailsTokenBalances,
  AddressDetailsTxids,
  AddressDetailsTxs,
> {
  nodes: string[]

  constructor(
    config: BlockbookConfig,
    private normalizedTxCodec: t.Type<NormalizedTx>,
    private specificTxCodec: t.Type<SpecificTx>,
    private blockInfoCodec: t.Type<BlockInfo>,
    private addressDetailsCodecs: {
      basic: t.Type<AddressDetailsBasic>,
      tokens: t.Type<AddressDetailsTokens>,
      tokenBalances: t.Type<AddressDetailsTokenBalances>,
      txids: t.Type<AddressDetailsTxids>,
      txs: t.Type<AddressDetailsTxs>,
    }
  ) {
    config = assertType(BlockbookConfig, config)
    this.nodes = config.nodes
    if (this.nodes.length === 0) {
      throw new Error('Blockbook node list must not be empty')
    }
  }

  async doRequest(method: 'GET' | 'POST', url: string, params?: object, body?: object, options?: request.Options) {
    const node = this.nodes[0] // TODO: fallback to other nodes
    return request(`${node}${url}${params ? qs.stringify(params) : ''}`, {
      method,
      body,
      json: true,
      ...options,
    })
  }

  async getStatus(): Promise<SystemInfo> {
    const response = await this.doRequest('GET', '/api/v2')
    return assertType(SystemInfo, response)
  }

  async getBlockHash(blockNumber: number): Promise<string> {
    const response = await this.doRequest('GET', `/api/v2/block-index/${blockNumber}`)
    const { blockHash } = assertType(BlockHashResponse, response)
    return blockHash
  }

  async getTx(txid: string): Promise<NormalizedTx> {
    const response = await this.doRequest('GET', `/api/v2/tx/${txid}`)
    return assertType(this.normalizedTxCodec, response)
  }

  async getTxSpecific(txid: string): Promise<SpecificTx> {
    const response = await this.doRequest('GET', `/api/v2/tx-specific/${txid}`)
    return assertType(this.specificTxCodec, response)
  }

  async getAddress(address: string, options: GetAddressOptions & { details: 'basic' }): Promise<AddressDetailsBasic>
  async getAddress(address: string, options: GetAddressOptions & { details: 'tokens' }): Promise<AddressDetailsTokens>
  async getAddress(
    address: string,
    options: GetAddressOptions & { details: 'tokenBalances' }
  ): Promise<AddressDetailsTokenBalances>
  async getAddress(
    address: string,
    options: GetAddressOptions & { details: 'txids' | undefined } | Omit<GetAddressOptions, 'details'>
  ): Promise<AddressDetailsTxids>
  async getAddress(address: string, options: GetAddressOptions & { details: 'txs' }): Promise<AddressDetailsTxs>
  async getAddress(address: string, options: GetAddressOptions = {}) {
    const response = await this.doRequest('GET', `/api/v2/address/${address}`, options)
    const detailsLevel = options.details || 'txids'
    const codec: t.Mixed = this.addressDetailsCodecs[detailsLevel]
    return assertType(codec, response)
  }

  async getUtxos

  async getBlock(block: string | number): Promise<BlockInfo> {
    const response = await this.doRequest('GET', `/api/v2/block/${block}`)
    return assertType(this.blockInfoCodec, response)
  }
}
