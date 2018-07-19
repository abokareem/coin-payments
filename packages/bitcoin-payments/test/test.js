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

let SegwitDepositUtils = require('../index')()
describe('SegwitDepositUtils', function () {
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
  if (false) {
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
})
