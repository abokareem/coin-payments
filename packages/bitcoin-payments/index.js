
const bitcoin = require('bitcoinjs-lib')
function SegwitDepositUtils (options) {
  if (!(this instanceof SegwitDepositUtils)) return new SegwitDepositUtils(options)
  let self = this
  self.options = Object.assign({}, options || {})
  // if (!self.options.password) throw new Error('SegwitDepositUtils: password required')
  return self
}

SegwitDepositUtils.prototype.bip44 = function (xpub, path, derviation) {
  if (!derviation) {
    derviation = 0
  }
  let node = bitcoin.HDNode.fromBase58(xpub)
  let nodeDerivation = node.derive(derviation).derive(path)
  let redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(nodeDerivation.getPublicKeyBuffer()))
  let scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
  return bitcoin.address.fromOutputScript(scriptPubKey)
}

SegwitDepositUtils.prototype.getPrivateKey = function (xprv, path, derviation) {
  if (!derviation) {
    derviation = 0
  }
  if (!xprv) throw new Error('Xprv is null. Bad things will happen to you.')
  // create the hd wallet
  const node = bitcoin.HDNode.fromBase58(xprv)
  let child = node.derivePath("m/44'/0'/0'/0")
  let nodeDerivation = child.derive(derviation).derive(path)
  return nodeDerivation.keyPair.toWIF()
}

SegwitDepositUtils.prototype.privateToPublic = function (privateKey) {
  var keyPair = bitcoin.ECPair.fromWIF(privateKey)
  let redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
  let scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
  return bitcoin.address.fromOutputScript(scriptPubKey)
}

SegwitDepositUtils.prototype.generateNewKeys = function (entropy) {
  let self = this
  var root = bitcoin.HDNode.fromSeedHex(entropy)
  return {
    xprv: root.toBase58(),
    xpub: self.getXpubFromXprv(root.toBase58())
  }
}

SegwitDepositUtils.prototype.getXpubFromXprv = function (xprv) {
  let node = bitcoin.HDNode.fromBase58(xprv)
  let child = node.derivePath("m/44'/0'/0'/0")
  // let derivedPubKey = key.derive("m/44'/60'/0'/0").hdPublicKey
  return child.neutered().toBase58()
}

module.exports = SegwitDepositUtils
