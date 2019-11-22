import bitcoin, { networks } from 'bitcoinjs-lib'
import { BitcoinjsNetwork } from './types'
import { NETWORK_MAINNET, DEFAULT_DERIVATION_PATH } from './constants';

export function deriveAddress(xpub: string, index: number, network: BitcoinjsNetwork) {
  const node = bitcoin.HDNode.fromBase58(xpub, network)
  const nodeDerivation = node.derive(0).derive(index)
  const redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(
    bitcoin.crypto.hash160(nodeDerivation.getPublicKeyBuffer()))
  const scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
  return bitcoin.address.fromOutputScript(scriptPubKey, network)
}

export function derivePrivateKey(xprv: string, index: number, network: BitcoinjsNetwork) {
  const node = bitcoin.HDNode.fromBase58(xprv, network)
  const nodeDerivation = node.derive(0).derive(index)
  return nodeDerivation.keyPair.toWIF()
}

export function privateKeyToAddress(privateKey: string, network: BitcoinjsNetwork) {
  const keyPair = bitcoin.ECPair.fromWIF(privateKey, network)
  const redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(
    bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
  const scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
  return bitcoin.address.fromOutputScript(scriptPubKey, network)
}

export function xprvToXpub(xprv: string, network: BitcoinjsNetwork) {
  const node = bitcoin.HDNode.fromBase58(xprv, network)
  return node.neutered().toBase58()
}

export function generateNewKeys(entropy: string, derivationPath?: string, network?: BitcoinjsNetwork) {
  network = network || NETWORK_MAINNET
  derivationPath = derivationPath || DEFAULT_DERIVATION_PATH
  let root = bitcoin.HDNode.fromSeedHex(entropy, network)
  let local = root.derivePath(derivationPath)
  return {
    xprv: local.toBase58(),
    xpub: local.neutered().toBase58()
  }
}
