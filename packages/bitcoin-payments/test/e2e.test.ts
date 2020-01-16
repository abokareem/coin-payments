import fs from 'fs'
import path from 'path'
import { omit } from 'lodash'
import { FeeRateType, BalanceResult, TransactionStatus, NetworkType } from '@faast/payments-common'

import {
  HdBitcoinPayments, BitcoinTransactionInfo, HdBitcoinPaymentsConfig,
  BitcoinSignedTransaction, BitcoinUnsignedTransaction, AddressType,
} from '../src'

import { txInfo_209F8, signedTx_valid, txInfo_a0787, signedTx_invalid } from './fixtures/transactions'
import { accountsByAddressType, AccountFixture } from './fixtures/accounts'
import { END_TRANSACTION_STATES, delay, expectEqualWhenTruthy, logger, expectEqualOmit } from './utils'

const EXTERNAL_ADDRESS = '14Z2k3tU19TSzBfT8s4QFAcYsbECUJnxiK'

const SECRET_XPRV_FILE = 'test/keys/mainnet.key'

const rootDir = path.resolve(__dirname, '..')
const secretXprvFilePath = path.resolve(rootDir, SECRET_XPRV_FILE)
let secretXprv = ''
if (fs.existsSync(secretXprvFilePath)) {
  secretXprv = fs
    .readFileSync(secretXprvFilePath)
    .toString('utf8')
    .trim()
  logger.log(`Loaded ${SECRET_XPRV_FILE}. Send and sweep tests enabled.`)
} else {
  logger.log(
    `File ${SECRET_XPRV_FILE} missing. Send and sweep tests will be skipped. To enable all tests ask Dylan to share the file with you on Lastpass.`,
  )
}

function assertTxInfo(actual: BitcoinTransactionInfo, expected: BitcoinTransactionInfo): void {
  expectEqualOmit(actual, expected, ['data.currentBlock', 'confirmations'])
}

function runHardcodedPublicKeyTests(
  payments: HdBitcoinPayments,
  config: HdBitcoinPaymentsConfig,
  accountFixture: AccountFixture,
) {
  const { xpub, xprv, addresses, derivationPath } = accountFixture
  it('getFullConfig', () => {
    expect(payments.getFullConfig()).toEqual({
      hdKey: config.hdKey,
      network: config.network,
      derivationPath,
      addressType: config.addressType,
      logger,
    })
  })
  it('getPublicConfig', () => {
    expect(payments.getPublicConfig()).toEqual({
      hdKey: xpub,
      network: config.network,
      derivationPath,
      addressType: config.addressType,
    })
  })
  it('getAccountIds', () => {
    expect(payments.getAccountIds()).toEqual([xpub])
  })
  it('getAccountId for index 0', () => {
    expect(payments.getAccountId(0)).toEqual(xpub)
  })
  it('getAccountId for index 10', () => {
    expect(payments.getAccountId(10)).toEqual(xpub)
  })
  it('getXpub', async () => {
    expect(payments.xpub).toEqual(xpub)
  })
  for (let iString of Object.keys(accountFixture.addresses)) {
    const i = Number.parseInt(iString)
    it(`getPayport for index ${i}`, async () => {
      const actual = await payments.getPayport(i)
      expect(actual).toEqual({ address: addresses[i] })
    })
  }
  it('resolvePayport resolves for index 1', async () => {
    expect(await payments.resolvePayport(1)).toEqual({ address: addresses[1] })
  })
  it('resolvePayport resolves for address', async () => {
    expect(await payments.resolvePayport(addresses[1])).toEqual({ address: addresses[1] })
  })
  it('resolvePayport resolves for external address', async () => {
    expect(await payments.resolvePayport(EXTERNAL_ADDRESS)).toEqual({ address: EXTERNAL_ADDRESS })
  })
  it('resolvePayport resolves for payport', async () => {
    const payport = { address: addresses[1] }
    expect(await payments.resolvePayport(payport)).toEqual(payport)
  })
  it('resolvePayport throws for invalid address', async () => {
    await expect(payments.resolvePayport('invalid')).rejects.toThrow()
  })
  it('resolveFromTo is correct for (index, index)', async () => {
    expect(await payments.resolveFromTo(0, 2)).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: addresses[2],
      toIndex: 2,
      toExtraId: undefined,
      toPayport: { address: addresses[2] },
    })
  })
  it('resolveFromTo is correct for external address', async () => {
    expect(await payments.resolveFromTo(0, EXTERNAL_ADDRESS)).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: EXTERNAL_ADDRESS,
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: EXTERNAL_ADDRESS },
    })
  })
  it('resolveFromTo is correct for internal address', async () => {
    expect(await payments.resolveFromTo(0, addresses[2])).toEqual({
      fromAddress: addresses[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: addresses[0] },
      toAddress: addresses[2],
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: addresses[2] },
    })
  })
  it('resolveFromTo throws for address as from', async () => {
    await expect(payments.resolveFromTo(EXTERNAL_ADDRESS as any, 0)).rejects.toThrow()
  })

  it('get transaction by hash', async () => {
    const tx = await payments.getTransactionInfo('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c')
    assertTxInfo(tx, txInfo_209F8)
  })
  it('fail to get an invalid transaction hash', async () => {
    await expect(payments.getTransactionInfo('123456abcdef')).rejects.toThrow('Transaction not found')
  })

  it('get a balance using xpub and index', async () => {
    expect(await payments.getBalance(1)).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      sweepable: false,
    })
  })
  it('get a balance using an address', async () => {
    expect(await payments.getBalance({ address: addresses[0] })).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      sweepable: false,
    })
  })
  it('broadcast an existing sweep transaction', async () => {
    const result = await payments.broadcastTransaction(signedTx_valid)
    expect(result).toEqual({
      id: signedTx_valid.id,
      rebroadcast: true,
    })
  })
  it('broadcast should fail on invalid tx', async () => {
    await expect(payments.broadcastTransaction(signedTx_invalid)).rejects.toThrow('Transaction has expired')
  })
}

describe('HdBitcoinPayments', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  describe('static', () => {
    it('should throw on invalid hdKey', () => {
      expect(() => new HdBitcoinPayments({ hdKey: 'invalid' })).toThrow()
    })
  })

  for (let k in accountsByAddressType) {
    const addressType = k as AddressType
    const accountFixture = accountsByAddressType[addressType]

    describe(addressType, () => {

      describe('hardcoded xpub', () => {
        const config = {
          hdKey: accountFixture.xpub,
          network: NetworkType.Mainnet,
          addressType,
          logger,
        }
        const payments = new HdBitcoinPayments(config)

        runHardcodedPublicKeyTests(payments, config, accountFixture)
      })

      describe('hardcoded xprv', () => {
        const config = {
          hdKey: accountFixture.xprv,
          addressType,
          network: NetworkType.Mainnet,
          logger,
        }
        const payments = new HdBitcoinPayments(config)

        runHardcodedPublicKeyTests(payments, config, accountFixture)
      })
    })
  }

  if (secretXprv) {
    describe('secret xprv', () => {
      const tp = new HdBitcoinPayments({
        hdKey: secretXprv,
        network: NetworkType.Mainnet,
        addressType: AddressType.SegwitNative,
        logger,
      })
      const address0 = 'bc1qz7v8smdfrgzqvjre3lrcxl4ul9x806e7umgf27'
      const address0balance = '0.00011'
      const address3 = 'bc1q2qsxsvwx2tmrfqqg8f58qgu9swn3zau809tzty'
      const xpub =
        'xpub6CMNrExwWj5nM3zYW8fXmZ1LrhrAuggZQAnBeWKiMQdK9tBWd1Ed6f2g94uJ4VwmX74uT6wzmFKqSvCGb3aoX33NQnoGPf7Bk8Yg9LM6VVH'

      it('get correct xpub', async () => {
        expect(tp.xpub).toEqual(xpub)
      })
      it('get correct address for index 0', async () => {
        expect(await tp.getPayport(0)).toEqual({ address: address0 })
      })
      it('get correct address for index 3', async () => {
        expect(await tp.getPayport(3)).toEqual({ address: address3 })
      })
      it('get correct balance for index 0', async () => {
        expect(await tp.getBalance(0)).toEqual({
          confirmedBalance: address0balance,
          unconfirmedBalance: '0',
          sweepable: true,
        })
      })
      it('get correct balance for address 0', async () => {
        expect(await tp.getBalance({ address: address0 })).toEqual({
          confirmedBalance: address0balance,
          unconfirmedBalance: '0',
          sweepable: true,
        })
      })

      it('creates transaction with custom fee', async () => {
        const tx = await tp.createSweepTransaction(0, 3, { feeRate: '0.00001', feeRateType: FeeRateType.Main })
        expect(tx.fee).toBe('0.0001')
      })
      it('create sweep transaction to an index', async () => {
        const tx = await tp.createSweepTransaction(0, 3)
        expect(tx).toBeDefined()
        expect(tx.amount + tx.fee).toEqual(address0balance)
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(3)
      })
      it('create sweep transaction to an internal address', async () => {
        const tx = await tp.createSweepTransaction(0, { address: address3 })
        expect(tx).toBeDefined()
        expect(tx.amount + tx.fee).toEqual(address0balance)
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(null)
      })
      it('create sweep transaction to an external address', async () => {
        const tx = await tp.createSweepTransaction(0, { address: EXTERNAL_ADDRESS })
        expect(tx).toBeDefined()
        expect(tx.amount + tx.fee).toEqual(address0balance)
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(EXTERNAL_ADDRESS)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(null)
      })

      it('create send transaction to an index', async () => {
        const amount = '0.00005'
        const tx = await tp.createTransaction(0, 3, amount)
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual(amount)
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(3)
      })
      it('create send transaction to an internal address', async () => {
        const amount = '0.00005'
        const tx = await tp.createTransaction(0, { address: address3 }, amount)
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual(amount)
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(null)
      })

      async function pollUntilEnded(signedTx: BitcoinSignedTransaction) {
        const txId = signedTx.id
        logger.log('polling until ended', txId)
        let tx: BitcoinTransactionInfo | undefined
        while (!testsComplete && (!tx || !END_TRANSACTION_STATES.includes(tx.status) || tx.confirmations === 0)) {
          try {
            tx = await tp.getTransactionInfo(txId)
          } catch (e) {
            if (e.message.includes('Transaction not found')) {
              logger.log('tx not found yet', txId, e.message)
            } else {
              throw e
            }
          }
          await delay(5000)
        }
        if (!tx) {
          throw new Error(`failed to poll until ended ${txId}`)
        }
        logger.log(tx.status, tx)
        expect(tx.id).toBe(signedTx.id)
        expect(tx.fromAddress).toBe(signedTx.fromAddress)
        expectEqualWhenTruthy(tx.fromExtraId, signedTx.fromExtraId)
        expect(tx.toAddress).toBe(signedTx.toAddress)
        expectEqualWhenTruthy(tx.toExtraId, signedTx.toExtraId)
        expect(tx.data).toBeDefined()
        expect(tx.status).toBe(TransactionStatus.Confirmed)
        expect(tx.isConfirmed).toBe(true)
        expect(tx.isExecuted).toBe(true)
        expect(tx.confirmationId).toMatch(/^\w+$/)
        expect(tx.confirmationTimestamp).toBeDefined()
        expect(tx.confirmations).toBeGreaterThan(0)
        return tx
      }

      jest.setTimeout(300 * 1000)

      it.skip('end to end sweep', async () => {
        const indicesToTry = [5, 6]
        const balances: { [i: number]: BalanceResult } = {}
        let indexToSweep: number = -1
        for (const index of indicesToTry) {
          const balanceResult = await tp.getBalance(index)
          balances[index] = balanceResult
          if (balanceResult.sweepable) {
            indexToSweep = index
            break
          }
        }
        if (indexToSweep < 0) {
          const allAddresses = await Promise.all(indicesToTry.map(i => tp.getPayport(i)))
          logger.log(
            'Cannot end to end test sweeping due to lack of funds. Send TRX to any of the following addresses and try again.',
            allAddresses,
          )
          return
        }
        const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        try {
          const unsignedTx = await tp.createSweepTransaction(indexToSweep, recipientIndex)
          const signedTx = await tp.signTransaction(unsignedTx)
          logger.log(`Sweeping ${signedTx.amount} from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
          expect(await tp.broadcastTransaction(signedTx)).toEqual({
            id: signedTx.id,
            rebroadcast: false,
          })
          const tx = await pollUntilEnded(signedTx)
          expect(tx.amount).toEqual(signedTx.amount)
          expect(tx.fee).toEqual(signedTx.fee)
        } catch (e) {
          if ((e.message || (e as string)).includes('Validate TransferContract error, balance is not sufficient')) {
            logger.log('Ran consecutive tests too soon, previous sweep not complete. Wait a minute and retry')
          }
          throw e
        }
      })
    })
  }
})
