'use strict'

/* eslint-disable no-console, no-process-env */
/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const expect = chai.expect
chai.config.includeStack = true

let xprv = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'
let xpub44Btc = 'xpub6Ek9ca8j7sm5bqAiMsdqz1HWjdWXx47WRwXHWXLjGGnhfXtSoTZo54eaRvfvhsiR5LGSK7nPreGv9aeo4bjosqTsrBV4uUgfxLQ9Ydw4vkH'
let privateKey = ''
let pubAddress = ''

// If you do this for real, you deserve what is coming to you.
let entropy = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'

let SegwitDepositUtils = require('../index')({
  insightUrl: 'https://node.bacloud.ninja/insight-api/',
  network: 'mainnet'
})
describe('Mainnet SegwitDepositUtils', function () {
  it('get an xpub from an xprv', function (done) {
    let generateXpub = SegwitDepositUtils.getXpubFromXprv(xprv)
    expect(generateXpub).to.deep.equal(xpub44Btc)
    done()
  })
  it('getDepositAddress for 0/1', function (done) {
    pubAddress = SegwitDepositUtils.bip44(xpub44Btc, 1)
    // console.log(pubAddress)
    expect(pubAddress).to.equal('3P7ENQbgWDRSSQYRwRuA1ypJNJ9zc5yRj5')
    done()
  })
  it('getPrivateKey for 0/1', function (done) {
    privateKey = SegwitDepositUtils.getPrivateKey(xprv, 1)
    expect(privateKey).to.equal('KyCfEPdXwqAFvA3QZGfxEZs5jBH3CGTD5Eet9aQxCBBoCwPXDDSr')
    done()
  })
  it('privateToPublic for 0/1', function (done) {
    let pubKey = SegwitDepositUtils.privateToPublic(privateKey)
    expect(pubKey).to.equal(pubAddress)
    done()
  })
  it('generate a new set of pub and priv keys', function (done) {
    let keys = SegwitDepositUtils.generateNewKeys(entropy)
    expect(keys.xprv).to.equal('xprv9s21ZrQH143K3SPAc8jgfzFS4cFvbZBFCyDauH2pbBWuG2Vs1wvNAu6h6F3jsdakvPMbSdzNT6ESxnykGiQXgst5jkD21d2J5FTEiuLrxzn')
    expect(keys.xpub).to.equal('xpub6Ex5HJoX1KUHhVuonrGgNEwP2z3StEJoMdGL2Msx3J2NYbVhom5WmaR3ex2PzhNjgxsFaLjD66ePmRcqjwqsS4ePefPvSEPjVUHdwg8MY7y')
    let generatedPubAddress = SegwitDepositUtils.bip44(keys.xpub, 66)
    let generatedWIF = SegwitDepositUtils.getPrivateKey(keys.xprv, 66)
    expect(SegwitDepositUtils.privateToPublic(generatedWIF)).to.equal(generatedPubAddress)
    done()
  })

  // This test takes a long time. It really just makes sure we don't have padding
  // issues in a brute force way.
  let regress = false
  if (regress) {
    it('generate 1000 addresses and private keys, make sure they match', function (done) {
      let keys = SegwitDepositUtils.generateNewKeys(entropy)
      let paths = []
      for (let i = 4000; i < 5000; i++) {
        paths.push(i)
      }
      let tasks = []
      paths.forEach(function (path) {
        tasks.push(function (cb) {
          let pub = SegwitDepositUtils.bip44(keys.xpub, path)
          let prv = SegwitDepositUtils.getPrivateKey(keys.xprv, path)
          let pubFromPrv = SegwitDepositUtils.privateToPublic(prv)
          if (pub === pubFromPrv) {
            cb(null, {pub: pub, prv: prv})
          } else {
            cb(new Error('key mismatch', pub, prv, pubFromPrv))
          }
        })
      })
      let async = require('async')
      async.parallel(tasks, function (err, res) {
        expect(err).to.not.exist
        // console.log(res)
        done(err)
      })
    })
  }
  let getUTXOs = false
  if (getUTXOs) {
    it('Get UTXOs for a single address', function (done) {
      SegwitDepositUtils.getUTXOs(xpub44Btc, 1, function (err, utxos) {
        if (err) console.log(err)
        expect(utxos).to.deep.equal(utxosExpected)
        done()
      })
    })
  }

  it('Generate a sweep transaction for a single address', function (done) {
    let to = '1LHTwHUbAxoKcqpSu3xoFDTso1sDFSio8L'
    let signedtx = SegwitDepositUtils.getSweepTransaction(xprv, 1, to, utxosExpected)
    expect(signedtx).to.deep.equal(signedTxExpected)
    done()
  })
  let broadcast = false
  if (broadcast) {
    it('Broadcast a sweep transaction for a single address', function (done) {
      SegwitDepositUtils.broadcastTransaction(signedTxExpected, function (err, txHash) {
        if (err) console.log(err)
        expect(txHash).to.deep.equal(txHashExpected)
        done()
      })
    })
  }
  it('Sweep transaction for a single address', function (done) {
    // SegwitDepositUtils.sweepTransaction(xprv, 2, to, function (err, sweptTransaction) {
    //
    // })
    done()
  })
})

const utxosExpected = [
  {
    'address': '3P7ENQbgWDRSSQYRwRuA1ypJNJ9zc5yRj5',
    'txid': '4c066ed57895274b92cea0da27929a7191f78c945384521eeced2b1d92990566',
    'vout': 0,
    'scriptPubKey': 'a914eaef038db7f441aff99a28ef7e9859f83d15a59887',
    'amount': 0.0001,
    'satoshis': 10000
  },
  {
    'address': '3P7ENQbgWDRSSQYRwRuA1ypJNJ9zc5yRj5',
    'txid': 'f56017b93d715d3eceb2629ed5160bdaee1977b24ec859c65225efbc58dedec3',
    'vout': 1,
    'scriptPubKey': 'a914eaef038db7f441aff99a28ef7e9859f83d15a59887',
    'amount': 0.001,
    'satoshis': 100000
  }
]

const signedTxExpected = { txid: '6335bc9a77c00d9d0d039a5d9f6ea8735bdb5b8d2a200551384acbc7f46aae46',
  signedTx: '01000000000102660599921d2bedec1e528453948cf791719a9227daa0ce924b279578d56e064c0000000017160014476df58e9a982353abe9d7ff3fdec3f44c3eeae0ffffffffc3dede58bcef2552c659c84eb27719eeda0b16d59e62b2ce3e5d713db91760f50100000017160014476df58e9a982353abe9d7ff3fdec3f44c3eeae0ffffffff0140a50100000000001976a914d38787bf6522bdfad3578cc6ab7af3fa00f57f8088ac02483045022100a4e85569953142bcebee7f933397c356c39d317b05745f99552f41ea0f341cdf0220624adc9abe8231209220a1fb808c3ff6459038aebdeba307b4fe13d3bb7d41f90121039f4a1f1ebc069e7ead5cba7d7a73ed1d7bf0a289e392c4c0ab9e3621da31be8802483045022100a12ce813fecc2470454ab6c6f2fb9875f123df42a141726321188ac6386209e502200c29a2841576dd02571cfc9f5bef9adb8011310cca3248efaba7acc1aa6c766b0121039f4a1f1ebc069e7ead5cba7d7a73ed1d7bf0a289e392c4c0ab9e3621da31be8800000000'}
const txHashExpected = {
  broadcasted: true,
  txid: '6335bc9a77c00d9d0d039a5d9f6ea8735bdb5b8d2a200551384acbc7f46aae46',
  signedTx: '01000000000102660599921d2bedec1e528453948cf791719a9227daa0ce924b279578d56e064c0000000017160014476df58e9a982353abe9d7ff3fdec3f44c3eeae0ffffffffc3dede58bcef2552c659c84eb27719eeda0b16d59e62b2ce3e5d713db91760f50100000017160014476df58e9a982353abe9d7ff3fdec3f44c3eeae0ffffffff0140a50100000000001976a914d38787bf6522bdfad3578cc6ab7af3fa00f57f8088ac02483045022100a4e85569953142bcebee7f933397c356c39d317b05745f99552f41ea0f341cdf0220624adc9abe8231209220a1fb808c3ff6459038aebdeba307b4fe13d3bb7d41f90121039f4a1f1ebc069e7ead5cba7d7a73ed1d7bf0a289e392c4c0ab9e3621da31be8802483045022100a12ce813fecc2470454ab6c6f2fb9875f123df42a141726321188ac6386209e502200c29a2841576dd02571cfc9f5bef9adb8011310cca3248efaba7acc1aa6c766b0121039f4a1f1ebc069e7ead5cba7d7a73ed1d7bf0a289e392c4c0ab9e3621da31be8800000000'}
