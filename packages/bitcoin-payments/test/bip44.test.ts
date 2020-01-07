import { deriveAddress, derivePrivateKey, splitDerivationPath, deriveBaseHDNode } from '../src/bip44'
import { networks } from 'bitcoinjs-lib';

const DERIVATION_PATH = "m/44'/0'/0'"
const ROOT_XPRV = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'

/** ROOT_XPRV derived to m/44' */
const PARTIALLY_DERIVED_XPRV = ''

/** ROOT_XPRV derived to DERIVATION_PATH */
const DERIVED_XPRV = ''

describe('bip44', () => {

  describe('splitDerivationPath', () => {
    it('returns correct value', () => {
      expect(splitDerivationPath(DERIVATION_PATH)).toEqual(["44'", "0'", "0'"])
    })
  })
  describe('deriveBaseHDNode', () => {
    it('derives root xprv correctly', () => {
      expect(deriveBaseHDNode(ROOT_XPRV, DERIVATION_PATH, networks.bitcoin).toBase58()).toEqual(DERIVED_XPRV)
    })
    it('derives partially derived xprv correctly', () => {
      expect(deriveBaseHDNode(PARTIALLY_DERIVED_XPRV, DERIVATION_PATH, networks.bitcoin).toBase58()).toEqual(DERIVED_XPRV)
    })
  })
})
