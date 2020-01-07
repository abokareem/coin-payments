import {
  deriveAddress,
  derivePrivateKey,
  splitDerivationPath,
  deriveHDNode,
  deriveKeyPair,
  xprvToXpub,
} from '../src/bip44'
import { NETWORK_MAINNET, AddressType } from '../src'
import { fromBase58 } from 'bip32'

const NETWORK = NETWORK_MAINNET
const DERIVATION_PATH = "m/44'/0'/0'"
const ROOT_XPRV = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'

/** ROOT_XPRV derived to m/44' */
const PARTIALLY_DERIVED_XPRV = 'xprv9txb3M6QPHVuD3ntLYvHdGbtBreGU93oQN2oHW2cBh2HUhUxm9HtDznowwgiZwKu7cXDwmrXSiRv593emimLhNUe43o7yCzN5euT92cfDpk'

/** ROOT_XPRV derived to DERIVATION_PATH */
const DERIVED_XPRV = 'xprv9yhZbBnMpH6yYJYEgifXpDwmJoyEbNSDjQKagEdnWtptM3yX2eNebybYgzGDxkcJHuLKhJeiicnvkPALkXifBqCA2Se9y48hNGgPM7RSxqW'

/** XPUB of DERIVED_XPRV */
const DERIVED_XPUB = 'xpub6CguzhKFeefGknchnkCYBMtVrqoizqA56dFBUd3Q5EMsDrJfaBgu9mv2YJTd3BANQhrcqmMKKPtYBETWF6SYD9G1Jubjze6VkZsX7DchtAi'

const BASE_NODE = fromBase58(DERIVED_XPRV)

const ADDRESS_LEGACY = '1J6t2jXst1Li2W9haExrThEBJeJaKpDCqY'
const ADDRESS_SEGWIT_P2SH = '3ENA2DiDQLxuTLmsaaD4sSNyCFgRfB8Ck1'
const ADDRESS_SEGWIT_NATIVE = 'bc1qhwtdp4q08553qkmlher7qe98n68mzn6tvxarz7'
const PRIVATE_KEY = 'L1yJZhQJ3RNW1hTD53NeovU8Wj4iFnT6v47ZXPrsCY8ikvqH4xzg'

describe('bip44', () => {
  describe('splitDerivationPath', () => {
    it('returns correct value', () => {
      expect(splitDerivationPath(DERIVATION_PATH)).toEqual(["44'", "0'", "0'"])
    })
  })
  describe('deriveHDNode', () => {
    it('derives root xprv correctly', () => {
      expect(deriveHDNode(ROOT_XPRV, DERIVATION_PATH, NETWORK).toBase58()).toEqual(DERIVED_XPRV)
    })
    it('derives partially derived xprv correctly', () => {
      expect(deriveHDNode(PARTIALLY_DERIVED_XPRV, DERIVATION_PATH, NETWORK).toBase58()).toEqual(DERIVED_XPRV)
    })
    it('derives fully derived xprv correctly', () => {
      expect(deriveHDNode(DERIVED_XPRV, DERIVATION_PATH, NETWORK).toBase58()).toEqual(DERIVED_XPRV)
    })
  })
  describe('deriveKeyPair', () => {
    it('derives index correctly', () => {
      expect(deriveKeyPair(BASE_NODE, 3, NETWORK)).toEqual(BASE_NODE.derive(0).derive(3))
    })
  })
  describe('deriveAddress', () => {
    it('derives legacy address', () => {
      expect(deriveAddress(BASE_NODE, 3, NETWORK, AddressType.Legacy)).toBe(ADDRESS_LEGACY)
    })
    it('derives p2sh segwit address', () => {
      expect(deriveAddress(BASE_NODE, 3, NETWORK, AddressType.SegwitP2SH)).toBe(ADDRESS_SEGWIT_P2SH)
    })
    it('derives native segwit address', () => {
      expect(deriveAddress(BASE_NODE, 3, NETWORK, AddressType.SegwitNative)).toBe(ADDRESS_SEGWIT_NATIVE)
    })
  })
  describe('derivePrivateKey', () => {
    it('derives private key', () => {
      expect(derivePrivateKey(BASE_NODE, 3, NETWORK)).toBe(PRIVATE_KEY)
    })
  })
  describe('xprvToXpub', () => {
    it('returns correct xpub for root xprv', () => {
      expect(xprvToXpub(ROOT_XPRV, DERIVATION_PATH, NETWORK)).toEqual(DERIVED_XPUB)
    })
    it('returns correct xpub for partially derived xprv', () => {
      expect(xprvToXpub(PARTIALLY_DERIVED_XPRV, DERIVATION_PATH, NETWORK)).toEqual(DERIVED_XPUB)
    })
    it('returns correct xpub for fully derived xprv', () => {
      expect(xprvToXpub(DERIVED_XPRV, DERIVATION_PATH, NETWORK)).toEqual(DERIVED_XPUB)
    })
  })
})
