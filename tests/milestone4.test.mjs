import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

describe('Milestone 4: Critical Business Logic & Math Verification', () => {

  describe('1. CSV Generation & RFC 4180 Escaping with UTF-8 BOM', () => {
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    test('escapes strings containing quotes and commas correctly', () => {
      assert.equal(escapeCSV('กาแฟ "ลาเต้", หวานน้อย'), '"กาแฟ ""ลาเต้"", หวานน้อย"')
      assert.equal(escapeCSV(null), '""')
      assert.equal(escapeCSV(150.5), '"150.5"')
    })

    test('prepends UTF-8 BOM character \\uFEFF for MS Excel compatibility', () => {
      const csvData = 'วันที่,ประเภท,จำนวนเงิน\n"2026-09-17","รายจ่าย","150.00"'
      const filePayload = '\uFEFF' + csvData
      assert.equal(filePayload.charCodeAt(0), 0xFEFF, 'First character must be UTF-8 BOM')
      assert.ok(filePayload.includes('รายจ่าย'))
    })

    test('filters transactions by timeframe correctly', () => {
      const txs = [
        { id: '1', transaction_date: '2026-09-15T10:00:00Z', amount: 100 }, // Current month (Sep 2026)
        { id: '2', transaction_date: '2026-08-10T10:00:00Z', amount: 200 }, // Past month (Aug 2026)
        { id: '3', transaction_date: '2025-12-01T10:00:00Z', amount: 500 }, // Past year (2025)
      ]

      const refDate = new Date('2026-09-17T12:00:00Z')
      const curYear = refDate.getFullYear()
      const curMonth = refDate.getMonth()

      // This Month
      const thisMonthTxs = txs.filter(t => {
        const d = new Date(t.transaction_date)
        return d.getFullYear() === curYear && d.getMonth() === curMonth
      })
      assert.equal(thisMonthTxs.length, 1)
      assert.equal(thisMonthTxs[0].id, '1')

      // This Year
      const thisYearTxs = txs.filter(t => {
        const d = new Date(t.transaction_date)
        return d.getFullYear() === curYear
      })
      assert.equal(thisYearTxs.length, 2)

      // All Time
      assert.equal(txs.length, 3)
    })
  })

  describe('2. Budget Limit Math & Alert Status Thresholds', () => {
    const evaluateBudgetStatus = (currentSpent, newAmount, limit) => {
      if (!limit || limit <= 0) return { alert: null, ratio: 0 }
      const total = currentSpent + newAmount
      const ratio = Math.round((total / limit) * 100)
      if (ratio >= 100) return { alert: 'over_budget', ratio, isOver: true }
      if (ratio >= 80) return { alert: 'near_budget', ratio, isOver: false }
      return { alert: 'safe', ratio, isOver: false }
    }

    test('returns safe when spending is below 80%', () => {
      const result = evaluateBudgetStatus(5000, 2000, 10000) // 70%
      assert.equal(result.alert, 'safe')
      assert.equal(result.ratio, 70)
      assert.equal(result.isOver, false)
    })

    test('triggers amber warning at 80% boundary', () => {
      const result = evaluateBudgetStatus(7000, 1000, 10000) // 80%
      assert.equal(result.alert, 'near_budget')
      assert.equal(result.ratio, 80)
      assert.equal(result.isOver, false)
    })

    test('triggers red alert at 100% and above', () => {
      const at100 = evaluateBudgetStatus(9500, 500, 10000) // 100%
      assert.equal(at100.alert, 'over_budget')
      assert.equal(at100.ratio, 100)
      assert.equal(at100.isOver, true)

      const at120 = evaluateBudgetStatus(10000, 2000, 10000) // 120%
      assert.equal(at120.alert, 'over_budget')
      assert.equal(at120.ratio, 120)
      assert.equal(at120.isOver, true)
    })

    test('handles null or 0 monthly budget gracefully without alert', () => {
      const noBudget = evaluateBudgetStatus(50000, 5000, null)
      assert.equal(noBudget.alert, null)
      assert.equal(noBudget.ratio, 0)
    })
  })

  describe('3. Validation Rules for User Profile & Security', () => {
    const validateProfile = (fullName) => {
      const trimmed = fullName?.trim()
      if (!trimmed || trimmed.length > 100) return false
      return true
    }

    const validatePassword = (pass, confirm) => {
      if (!pass || pass.length < 6) return false
      if (pass !== confirm) return false
      return true
    }

    test('validates display name bounds', () => {
      assert.equal(validateProfile('สมชาย ใจดี'), true)
      assert.equal(validateProfile(''), false)
      assert.equal(validateProfile('   '), false)
      assert.equal(validateProfile('a'.repeat(101)), false)
      assert.equal(validateProfile('a'.repeat(100)), true)
    })

    test('validates password minimum length and confirmation match', () => {
      assert.equal(validatePassword('123456', '123456'), true)
      assert.equal(validatePassword('12345', '12345'), false, 'Too short')
      assert.equal(validatePassword('123456', 'abcdef'), false, 'Mismatch')
    })
  })

  describe('4. Professional Excel (.xlsx) Structure & Validation', () => {
    test('verifies that Excel workbook generates valid ZIP archive format for .xlsx', async () => {
      // Excel files are ZIP archives starting with magic byte sequence: 0x50, 0x4B, 0x03, 0x04 ('PK\x03\x04')
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('รายงานบันทึกการเงิน')
      ws.columns = [
        { key: 'no', width: 8 },
        { key: 'date', width: 16 },
        { key: 'type', width: 14 },
        { key: 'amount', width: 20 },
      ]
      ws.addRow([1, '2026-09-17', 'รายรับ', 1153.00])
      const buffer = await wb.xlsx.writeBuffer()

      assert.ok(buffer.byteLength > 1000, 'Excel file must have substantial binary content')
      const uint8 = new Uint8Array(buffer)
      assert.equal(uint8[0], 0x50, 'Magic byte 1 must be P')
      assert.equal(uint8[1], 0x4B, 'Magic byte 2 must be K')
      assert.equal(uint8[2], 0x03, 'Magic byte 3 must be 0x03')
      assert.equal(uint8[3], 0x04, 'Magic byte 4 must be 0x04')
    })
  })
})

