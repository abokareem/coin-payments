import { NetworkType, FeeLevel, UtxoInfo } from '@faast/payments-common'
import request from 'request-promise-native'
import { BlockbookConnectedConfig } from './types'
import { BlockbookBitcoin, Blockbook } from 'blockbook-client'
import { isString, Logger, isMatchingError, toBigNumber } from '@faast/ts-common'
import { DEFAULT_MAINNET_SERVER, DEFAULT_TESTNET_SERVER, NETWORK_TESTNET, NETWORK_MAINNET, BITCOIN_CONFIG } from './constants';
import promiseRetry from 'promise-retry'

export function toBitcoinishConfig<T extends BlockbookConnectedConfig>(config: T) {
  return {
    ...BITCOIN_CONFIG,
    bitcoinjsNetwork: config.network === NetworkType.Testnet ? NETWORK_TESTNET : NETWORK_MAINNET,
    ...config,
  }
}

export function resolveServer(server: BlockbookConnectedConfig['server'], network: NetworkType): {
  api: BlockbookBitcoin
  server: string | null
} {
  if (typeof server === 'undefined' || server === null) {
    server = network === NetworkType.Testnet ? DEFAULT_TESTNET_SERVER : DEFAULT_MAINNET_SERVER
  }
  if (isString(server)) {
    return {
      api: new BlockbookBitcoin({
        nodes: [server],
      }),
      server,
    }
  } else if (server instanceof BlockbookBitcoin) {
    return {
      api: server,
      server: server.nodes[0] || '',
    }
  } else {
    // null server arg -> offline mode
    return {
      api: new BlockbookBitcoin({
        nodes: [''],
      }),
      server: null,
    }
  }
}

const RETRYABLE_ERRORS = ['timeout', 'disconnected']
const MAX_RETRIES = 3

export function retryIfDisconnected<T>(fn: () => Promise<T>, api: BlockbookBitcoin, logger: Logger): Promise<T> {
  return promiseRetry(
    (retry, attempt) => {
      return fn().catch(async e => {
        if (isMatchingError(e, RETRYABLE_ERRORS)) {
          logger.log(
            `Retryable error during blockbook server call, retrying ${MAX_RETRIES - attempt} more times`,
            e.toString(),
          )
          retry(e)
        }
        throw e
      })
    },
    {
      retries: MAX_RETRIES,
    },
  )
}

/**
 * Estimate size of transaction a certain number of inputs and outputs.
 * This function is based off of ledger-wallet-webtool/src/TransactionUtils.js#estimateTransactionSize
 */
export function estimateTxSize (inputsCount: number, outputsCount: number, handleSegwit: boolean) {
  let maxNoWitness
  let maxSize
  let maxWitness
  let minNoWitness
  let minSize
  let minWitness
  let varintLength

  if (inputsCount < 0xfd) {
    varintLength = 1
  } else if (inputsCount < 0xffff) {
    varintLength = 3
  } else {
    varintLength = 5
  }
  if (handleSegwit) {
    minNoWitness =
      varintLength + 4 + 2 + 59 * inputsCount + 1 + 31 * outputsCount + 4
    maxNoWitness =
      varintLength + 4 + 2 + 59 * inputsCount + 1 + 33 * outputsCount + 4
    minWitness =
      varintLength +
      4 +
      2 +
      59 * inputsCount +
      1 +
      31 * outputsCount +
      4 +
      106 * inputsCount
    maxWitness =
      varintLength +
      4 +
      2 +
      59 * inputsCount +
      1 +
      33 * outputsCount +
      4 +
      108 * inputsCount
    minSize = (minNoWitness * 3 + minWitness) / 4
    maxSize = (maxNoWitness * 3 + maxWitness) / 4
  } else {
    minSize = varintLength + 4 + 146 * inputsCount + 1 + 31 * outputsCount + 4
    maxSize = varintLength + 4 + 148 * inputsCount + 1 + 33 * outputsCount + 4
  }
  return {
    min: minSize,
    max: maxSize
  }
}

export function estimateTxFee (satPerByte: number, inputsCount: number, outputsCount: number, handleSegwit: boolean) {
  const { min, max } = estimateTxSize(inputsCount, outputsCount, handleSegwit)
  const mean = Math.ceil((min + max) / 2)
  return mean * satPerByte
}

/** Get sat/byte fee estimate from blockcypher */
export async function getBlockcypherFeeEstimate(feeLevel: FeeLevel, networkType: NetworkType): Promise<number> {
  const body = await request.get(
    `https://api.blockcypher.com/v1/btc/${networkType === NetworkType.Mainnet ? 'main' : 'test3'}`,
    { json: true },
  )
  const feePerKbField = `${feeLevel}_fee_per_kb`
  const feePerKb = body[feePerKbField]
  if (!feePerKb) {
    throw new Error(`Blockcypher response is missing expected field ${feePerKbField}`)
  }
  return feePerKb / 1000
}

/**
 * Sort the utxos for input selection
 */
export function sortUtxos(utxoList: UtxoInfo[]): UtxoInfo[] {
  const matureList: UtxoInfo[] = []
  const immatureList: UtxoInfo[] = []
  utxoList.forEach((utxo) => {
    if (utxo.confirmations && utxo.confirmations >= 6) {
      matureList.push(utxo)
    } else {
      immatureList.push(utxo)
    }
  })
  matureList.sort((a, b) => toBigNumber(a.value).minus(b.value).toNumber()) // Ascending order by value
  immatureList.sort((a, b) => (b.confirmations || 0) - (a.confirmations || 0)) // Descending order by confirmations
  return matureList.concat(immatureList)
}
