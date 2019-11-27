import { createUnitConverters } from '@faast/payments-common'
import bitcoin from 'bitcoinjs-lib'
import { BitcoinjsNetwork } from './types'
import { DECIMAL_PLACES } from './constants'

const {
  toMainDenominationBigNumber,
  toMainDenominationString,
  toMainDenominationNumber,
  toBaseDenominationBigNumber,
  toBaseDenominationString,
  toBaseDenominationNumber,
} = createUnitConverters(DECIMAL_PLACES)

export {
  toMainDenominationBigNumber,
  toMainDenominationString,
  toMainDenominationNumber,
  toBaseDenominationBigNumber,
  toBaseDenominationString,
  toBaseDenominationNumber,
}

export function isValidXprv(xprv: string): boolean {
  return xprv.startsWith('xprv')
}

export function isValidXpub(xpub: string): boolean {
  return xpub.startsWith('xpub')
}

export function isValidAddress(address: string, network: BitcoinjsNetwork): boolean {
  throw new Error('not implemented')
}

export function isValidExtraId(extraId: string): boolean {
  return false
}

export function privateKeyToAddress(privateKey: string, network: BitcoinjsNetwork) {
  const keyPair = bitcoin.ECPair.fromWIF(privateKey, network)
  const redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(
    bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
  const scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
  return bitcoin.address.fromOutputScript(scriptPubKey, network)
}

export function isValidPrivateKey(privateKey: string, network: BitcoinjsNetwork): boolean {
  try {
    privateKeyToAddress(privateKey, network)
    return true
  } catch (e) {
    return false
  }
}
