'use strict'

/* eslint-disable no-console, no-process-env */
/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const expect = chai.expect

chai.config.includeStack = true

let xprv = 'tprv8ZgxMBicQKsPeFchGhbBqdsRNjg8q5DFYX8hmhTH5A1P3dEx1KG7geU91RDPszy5HptNSjc8cSpFReXVPvkUVw9gGPRKfykLzMCfAcSbVMq'
let xpub44Btc = 'tpubDFKhoYdCibRjyJ6fF3FmaAGkN796scoruFrdNuw6PCnGHtAQsyvbv25stz7BXCKyUsQABvF5dCUSTc7T8oh7KW6giG9E7m3y5Rt3hfFcWfP'
let privateKey = ''
let pubAddress = ''

// If you do this for real, you deserve what is coming to you.
let entropy = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'

let SegwitDepositUtils = require('../index')({
  insightUrl: 'https://testnet.bitaccess.ca/insight-api/',
  network: 'testnet'
})
describe('Testnet SegwitDepositUtils', function () {
  it('generate a new set of pub and priv keys', function (done) {
    let keys = SegwitDepositUtils.generateNewKeys(entropy)
    expect(keys.xprv).to.equal('tprv8ZgxMBicQKsPeFchGhbBqdsRNjg8q5DFYX8hmhTH5A1P3dEx1KG7geU91RDPszy5HptNSjc8cSpFReXVPvkUVw9gGPRKfykLzMCfAcSbVMq')
    expect(keys.xpub).to.equal('tpubDFKhoYdCibRjyJ6fF3FmaAGkN796scoruFrdNuw6PCnGHtAQsyvbv25stz7BXCKyUsQABvF5dCUSTc7T8oh7KW6giG9E7m3y5Rt3hfFcWfP')
    let generatedPubAddress = SegwitDepositUtils.bip44(keys.xpub, 66)
    let generatedWIF = SegwitDepositUtils.getPrivateKey(keys.xprv, 66)
    expect(SegwitDepositUtils.privateToPublic(generatedWIF)).to.equal(generatedPubAddress)
    done()
  })
  it('get an xpub from an xprv', function (done) {
    let generateXpub = SegwitDepositUtils.getXpubFromXprv(xprv)
    expect(generateXpub).to.deep.equal(xpub44Btc)
    done()
  })
  it('getDepositAddress for 0/1', function (done) {
    pubAddress = SegwitDepositUtils.bip44(xpub44Btc, 1)
    // console.log(pubAddress)
    expect(pubAddress).to.equal('2MyN5TvnmiVmfBVE6HRGrWzsTa7fugMZasB')
    done()
  })
  it('getPrivateKey for 0/1', function (done) {
    privateKey = SegwitDepositUtils.getPrivateKey(xprv, 1)
    expect(privateKey).to.equal('cRjP8AeHnUkfRqwPSahorcnTiLiyzwtWzwNHnUNdCe3Y9W9nBNwa')
    done()
  })
  it('privateToPublic for 0/1', function (done) {
    let pubKey = SegwitDepositUtils.privateToPublic(privateKey)
    expect(pubKey).to.equal(pubAddress)
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
  let getUTXOs = true
  if (getUTXOs) {
    it('Get UTXOs for a single address', function (done) {
      SegwitDepositUtils.getUTXOs(xpub44Btc, 1, function (err, utxos) {
        if (err) console.log(err)
        expect(utxos.length).to.not.equal(0)
        expect(utxos.length).to.be.at.most(2)
        utxosExpected = utxos
        done(err)
      })
    })
  }

  it('Generate a sweep transaction for a single address', function (done) {
    let to = SegwitDepositUtils.bip44(xpub44Btc, 2)
    let signedtx = SegwitDepositUtils.getSweepTransaction(xprv, 1, to, utxosExpected)
    expect(signedtx.txid).to.not.equal(undefined)
    expect(signedtx.signedTx).to.not.equal(undefined)
    signedTxExpected = signedtx
    done()
  })
  let broadcast = true
  if (broadcast) {
    it('Broadcast a sweep transaction for a single address', function (done) {
      SegwitDepositUtils.broadcastTransaction(signedTxExpected, function (err, txHash) {
        if (err) {
          console.log('utxosExpected', utxosExpected)
          console.log('utxosExpsignedTxExpectedected', signedTxExpected)
          console.log(err)
        }
        expect(txHash.broadcasted).to.equal(true)
        done(err)
      })
    })
  }
  it('Sweep transaction for a single address', function (done) {
    let to = SegwitDepositUtils.bip44(xpub44Btc, 2)
    SegwitDepositUtils.sweepTransaction(xpub44Btc, xprv, 1, to, 30, function (err, sweptTransaction) {
      if (err) console.log(err)
      expect(sweptTransaction.broadcasted).to.equal(true)
      done(err)
    })
  })
})

let utxosExpected = []

let signedTxExpected = {}
