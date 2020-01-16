import { createUnitConverters } from '@faast/payments-common'
import * as bitcoin from 'bitcoinjs-lib'
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

export { isValidXprv, isValidXpub } from './bitcoinish'

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

export function publicKeyToAddress(publicKey: Buffer, network: BitcoinjsNetwork, addressType: AddressType): string {
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

export function privateKeyToAddress(privateKey: string, network: BitcoinjsNetwork, addressType: AddressType) {
  const keyPair = privateKeyToKeyPair(privateKey, network)
  return publicKeyToAddress(keyPair.publicKey, network, addressType)
}

export function isValidPrivateKey(privateKey: string, network: BitcoinjsNetwork): boolean {
  try {
    privateKeyToKeyPair(privateKey, network)
    return true
  } catch (e) {
    return false
  }
}
