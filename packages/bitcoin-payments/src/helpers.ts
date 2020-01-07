import { createUnitConverters } from '@faast/payments-common'
import bitcoin from 'bitcoinjs-lib'
import { BitcoinjsNetwork, AddressType } from './types'
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
  try {
    bitcoin.address.toOutputScript(address, network)
    return true
  } catch (e) {
    return false
  }
}

export function isValidExtraId(extraId: string): boolean {
  return false
}

export function publicKeyToAddress(publicKey: Buffer, addressType: AddressType, network: BitcoinjsNetwork): string {
  let script: bitcoin.payments.Payment
  if (addressType === AddressType.Legacy) {
    script = bitcoin.payments.p2pkh({ network, pubkey: publicKey })
  } else { // type is segwit
    script = bitcoin.payments.p2wpkh({ network, pubkey: publicKey })

    if (addressType === AddressType.SegwitP2SH) {
      script = bitcoin.payments.p2sh({
        network,
        redeem: script
      })
    }
  }
  const { address } = script
  if (!address) {
    throw new Error('bitcoinjs-lib address derivation returned falsy value')
  }
  return address
}

function privateKeyToKeyPair(privateKey: string, network: BitcoinjsNetwork) {
  return bitcoin.ECPair.fromWIF(privateKey, network)
}

export function privateKeyToAddress(privateKey: string, addressType: AddressType, network: BitcoinjsNetwork) {
  const keyPair = privateKeyToKeyPair(privateKey, network)
  return publicKeyToAddress(keyPair.publicKey, addressType, network)
}

export function isValidPrivateKey(privateKey: string, network: BitcoinjsNetwork): boolean {
  try {
    privateKeyToKeyPair(privateKey, network)
    return true
  } catch (e) {
    return false
  }
}
