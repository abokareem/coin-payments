import { NetworkType, FeeLevel } from '@faast/payments-common'
import request from 'request-promise-native'

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
