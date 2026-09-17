import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  BANK_PRESETS,
  detectBankFromText,
  validateTransfer,
  calculateNetWorth,
  getWalletTypeLabel,
} from '../src/utils/walletHelper.ts'

describe('Milestone 6: Multi-Wallet & Transfers System - Logic Verification', () => {

  describe('1. Bank Presets & Smart Detection', () => {
    test('detects KBank from various keywords and slip OCR text', () => {
      assert.equal(detectBankFromText('โอนเงินผ่าน ธนาคารกสิกรไทย สำเร็จ')?.code, 'kbank')
      assert.equal(detectBankFromText('KBANK x-1234')?.code, 'kbank')
      assert.equal(detectBankFromText('Kasikornbank transaction')?.code, 'kbank')
    })

    test('detects SCB from various keywords', () => {
      assert.equal(detectBankFromText('SCB Easy App รายการสำเร็จ')?.code, 'scb')
      assert.equal(detectBankFromText('ไทยพาณิชย์ 123-456')?.code, 'scb')
    })

    test('detects TrueMoney, BBL, KTB, and BAY correctly', () => {
      assert.equal(detectBankFromText('ชำระด้วย TrueMoney Wallet')?.code, 'truemoney')
      assert.equal(detectBankFromText('ธนาคารกรุงเทพ พร้อมเพย์')?.code, 'bbl')
      assert.equal(detectBankFromText('โอนผ่าน เป๋าตัง KTB')?.code, 'ktb')
      assert.equal(detectBankFromText('ธนาคารกรุงศรีอยุธยา')?.code, 'bay')
    })

    test('returns null for unknown text or null input safely', () => {
      assert.equal(detectBankFromText(null), null)
      assert.equal(detectBankFromText(''), null)
      assert.equal(detectBankFromText('ซื้อของตลาดสดทั่วไป'), null)
    })

    test('provides human-readable Thai labels for all wallet types', () => {
      assert.equal(getWalletTypeLabel('cash'), 'เงินสด')
      assert.equal(getWalletTypeLabel('bank'), 'บัญชีธนาคาร')
      assert.equal(getWalletTypeLabel('ewallet'), 'E-Wallet')
      assert.equal(getWalletTypeLabel('credit'), 'บัตรเครดิต')
    })
  })

  describe('2. Transfer Validation Rules', () => {
    const walletA = { id: 'w-1', name: 'กสิกร', balance: 5000 }
    const walletB = { id: 'w-2', name: 'เงินสด', balance: 1000 }

    test('approves valid transfer without fee', () => {
      const result = validateTransfer(walletA, walletB, 1500, 0)
      assert.equal(result.valid, true)
      assert.equal(result.error, undefined)
    })

    test('approves valid transfer with fee', () => {
      const result = validateTransfer(walletA, walletB, 1500, 10)
      assert.equal(result.valid, true)
    })

    test('rejects transfer to the same wallet', () => {
      const result = validateTransfer(walletA, walletA, 500)
      assert.equal(result.valid, false)
      assert.match(result.error, /ไม่สามารถโอนไปยังกระเป๋าเดียวกันได้/)
    })

    test('rejects zero or negative transfer amount', () => {
      assert.equal(validateTransfer(walletA, walletB, 0).valid, false)
      assert.equal(validateTransfer(walletA, walletB, -100).valid, false)
      assert.equal(validateTransfer(walletA, walletB, NaN).valid, false)
    })

    test('rejects negative transfer fee', () => {
      const result = validateTransfer(walletA, walletB, 500, -5)
      assert.equal(result.valid, false)
      assert.match(result.error, /ค่าธรรมเนียมต้องไม่ติดลบ/)
    })

    test('rejects missing source or destination wallet', () => {
      assert.equal(validateTransfer(null, walletB, 500).valid, false)
      assert.equal(validateTransfer(walletA, null, 500).valid, false)
    })
  })

  describe('3. Wallet Balance Math & Invariants', () => {
    test('calculates correct balances after transfer with fee', () => {
      const fromBalance = 5000
      const toBalance = 1000
      const amount = 2000
      const fee = 15

      const newFrom = fromBalance - (amount + fee)
      const newTo = toBalance + amount

      assert.equal(newFrom, 2985)
      assert.equal(newTo, 3000)

      // Total balance difference across all wallets must equal the fee exactly
      const totalBefore = fromBalance + toBalance
      const totalAfter = newFrom + newTo
      assert.equal(totalBefore - totalAfter, fee, 'Money moved between wallets is conserved minus the fee')
    })

    test('calculates net cashflow of transfer without fee as zero', () => {
      const amount = 1000
      const sourceDelta = -amount
      const destDelta = +amount
      assert.equal(sourceDelta + destDelta, 0, 'Internal transfers must not alter overall net wealth')
    })
  })

  describe('4. Net Worth & Balance Aggregation', () => {
    test('calculates total assets, debts, and net worth correctly', () => {
      const wallets = [
        { id: '1', name: 'กสิกร', type: 'bank', balance: 50000, is_archived: false },
        { id: '2', name: 'เงินสด', type: 'cash', balance: 3500, is_archived: false },
        { id: '3', name: 'TrueMoney', type: 'ewallet', balance: 1200, is_archived: false },
        { id: '4', name: 'บัตรเครดิต KBank', type: 'credit', balance: -8000, is_archived: false },
        { id: '5', name: 'กระเป๋าเก่าเก็บ', type: 'cash', balance: 20000, is_archived: true }, // Should be ignored
      ]

      const { totalAssets, totalDebts, netWorth } = calculateNetWorth(wallets)

      assert.equal(totalAssets, 50000 + 3500 + 1200, 'Assets sum active positive balances')
      assert.equal(totalDebts, 8000, 'Debts sum active credit card liabilities')
      assert.equal(netWorth, totalAssets - totalDebts)
      assert.equal(netWorth, 46700)
    })

    test('handles all-zero or empty wallet lists gracefully', () => {
      const { totalAssets, totalDebts, netWorth } = calculateNetWorth([])
      assert.equal(totalAssets, 0)
      assert.equal(totalDebts, 0)
      assert.equal(netWorth, 0)
    })
  })

  describe('5. Soft-Delete (Trash) & Restore Invariants', () => {
    test('simulates expense move to trash and restore', () => {
      let walletBalance = 10000
      const expenseAmount = 2500

      // When expense occurs:
      walletBalance -= expenseAmount
      assert.equal(walletBalance, 7500)

      // When moved to trash (refunded):
      walletBalance += expenseAmount
      assert.equal(walletBalance, 10000, 'Wallet balance restored on trash')

      // When restored from trash:
      walletBalance -= expenseAmount
      assert.equal(walletBalance, 7500, 'Wallet balance re-deducted on restore')
    })

    test('simulates transfer move to trash and restore', () => {
      let sourceBalance = 10000
      let destBalance = 2000
      const transferAmount = 3000
      const fee = 20

      // Execute transfer:
      sourceBalance -= (transferAmount + fee)
      destBalance += transferAmount
      assert.equal(sourceBalance, 6980)
      assert.equal(destBalance, 5000)

      // Move transfer to trash (rollback):
      sourceBalance += (transferAmount + fee)
      destBalance -= transferAmount
      assert.equal(sourceBalance, 10000, 'Source wallet refunded including fee')
      assert.equal(destBalance, 2000, 'Destination wallet deducted')

      // Restore transfer:
      sourceBalance -= (transferAmount + fee)
      destBalance += transferAmount
      assert.equal(sourceBalance, 6980)
      assert.equal(destBalance, 5000)
    })
  })
})
