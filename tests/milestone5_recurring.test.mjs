import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateNextRunDate,
  formatFrequencyThai,
  formatThaiDateShort,
  calculateMonthlyEquivalent,
  calculateMonthlyCommitment,
  validateRecurringInput,
  formatDateISO,
  parseLocalDate
} from '../src/utils/recurringHelper.ts'

describe('Milestone 5: Recurring Transactions - Date Math & Business Logic Verification', () => {

  describe('1. Daily Frequency Scheduling Logic', () => {
    test('advances by +1 day during mid-month', () => {
      const next = calculateNextRunDate('2026-09-17', 'daily')
      assert.equal(formatDateISO(next), '2026-09-18')
    })

    test('advances across 30-day month boundary (September -> October)', () => {
      const next = calculateNextRunDate('2026-09-30', 'daily')
      assert.equal(formatDateISO(next), '2026-10-01')
    })

    test('advances across 31-day month boundary (August -> September)', () => {
      const next = calculateNextRunDate('2026-08-31', 'daily')
      assert.equal(formatDateISO(next), '2026-09-01')
    })

    test('advances across leap year February (28 -> 29 -> 1 March in 2024)', () => {
      const leapDay = calculateNextRunDate('2024-02-28', 'daily')
      assert.equal(formatDateISO(leapDay), '2024-02-29')

      const marchFirst = calculateNextRunDate('2024-02-29', 'daily')
      assert.equal(formatDateISO(marchFirst), '2024-03-01')
    })

    test('advances across year boundary (31 Dec -> 1 Jan)', () => {
      const next = calculateNextRunDate('2026-12-31', 'daily')
      assert.equal(formatDateISO(next), '2027-01-01')
    })
  })

  describe('2. Weekly Frequency Scheduling Logic', () => {
    test('advances by +7 days when dayOfWeek is not specified', () => {
      const next = calculateNextRunDate('2026-09-17', 'weekly') // Thursday
      assert.equal(formatDateISO(next), '2026-09-24') // Next Thursday
    })

    test('advances to target dayOfWeek (Thursday 17 Sep -> Monday 21 Sep, dayOfWeek=1)', () => {
      const next = calculateNextRunDate('2026-09-17', 'weekly', null, 1)
      assert.equal(formatDateISO(next), '2026-09-21')
      assert.equal(next.getDay(), 1, 'Target day must be Monday')
    })

    test('advances to next week (+7 days) when currentDate is already on target dayOfWeek', () => {
      // 2026-09-21 is Monday (1)
      const next = calculateNextRunDate('2026-09-21', 'weekly', null, 1)
      assert.equal(formatDateISO(next), '2026-09-28')
      assert.equal(next.getDay(), 1)
    })

    test('advances across month boundary on weekly schedule', () => {
      // 2026-09-28 is Monday
      const next = calculateNextRunDate('2026-09-28', 'weekly', null, 1)
      assert.equal(formatDateISO(next), '2026-10-05')
      assert.equal(next.getDay(), 1)
    })
  })

  describe('3. Monthly Frequency & End-of-Month Clamping (Critical Financial Logic)', () => {
    test('advances regular mid-month schedule (15 Jan -> 15 Feb)', () => {
      const next = calculateNextRunDate('2026-01-15', 'monthly', 15)
      assert.equal(formatDateISO(next), '2026-02-15')
    })

    test('clamps 31st Jan to 28th Feb in non-leap year (2026)', () => {
      const next = calculateNextRunDate('2026-01-31', 'monthly', 31)
      assert.equal(formatDateISO(next), '2026-02-28', 'Must clamp to 28 Feb without spilling into March')
    })

    test('clamps 31st Jan to 29th Feb in leap year (2024)', () => {
      const next = calculateNextRunDate('2024-01-31', 'monthly', 31)
      assert.equal(formatDateISO(next), '2024-02-29', 'Must clamp to 29 Feb in leap year')
    })

    test('preserves anchor day 31 when advancing from 28 Feb to March', () => {
      // When current date is clamped (28 Feb) but schedule anchor day is 31
      const next = calculateNextRunDate('2026-02-28', 'monthly', 31)
      assert.equal(formatDateISO(next), '2026-03-31', 'Must restore 31 March anchor day!')
    })

    test('clamps 31st to 30th April (30-day month)', () => {
      const next = calculateNextRunDate('2026-03-31', 'monthly', 31)
      assert.equal(formatDateISO(next), '2026-04-30', 'Must clamp to 30 April')
    })

    test('preserves anchor day 31 when advancing from 30 April to May', () => {
      const next = calculateNextRunDate('2026-04-30', 'monthly', 31)
      assert.equal(formatDateISO(next), '2026-05-31', 'Must restore 31 May anchor day!')
    })

    test('advances across year-end boundary (31 Dec -> 31 Jan)', () => {
      const next = calculateNextRunDate('2026-12-31', 'monthly', 31)
      assert.equal(formatDateISO(next), '2027-01-31')
    })

    test('verifies full sequential 6-month cycle preserving 31st anchor', () => {
      let current = '2026-01-31'
      const expected = [
        '2026-02-28', // Clamped to 28
        '2026-03-31', // Restored to 31
        '2026-04-30', // Clamped to 30
        '2026-05-31', // Restored to 31
        '2026-06-30', // Clamped to 30
        '2026-07-31', // Restored to 31
      ]

      for (const expectedDate of expected) {
        const nextDate = calculateNextRunDate(current, 'monthly', 31)
        assert.equal(formatDateISO(nextDate), expectedDate)
        current = formatDateISO(nextDate)
      }
    })
  })

  describe('4. Yearly Frequency & Leap Year Transitions', () => {
    test('advances regular yearly schedule (+1 year)', () => {
      const next = calculateNextRunDate('2026-09-17', 'yearly')
      assert.equal(formatDateISO(next), '2027-09-17')
    })

    test('clamps leap day 29 Feb to 28 Feb in non-leap year (2028 -> 2029)', () => {
      const next = calculateNextRunDate('2028-02-29', 'yearly')
      assert.equal(formatDateISO(next), '2029-02-28', 'Must clamp 29 Feb to 28 Feb in non-leap year without rolling to 1 March')
    })

    test('advances yearly across year-end (31 Dec 2026 -> 31 Dec 2027)', () => {
      const next = calculateNextRunDate('2026-12-31', 'yearly')
      assert.equal(formatDateISO(next), '2027-12-31')
    })
  })

  describe('5. Thai Frequency & Date Formatting', () => {
    test('formats frequency into human-readable Thai strings', () => {
      assert.equal(formatFrequencyThai('daily'), 'ทุกวัน')
      assert.equal(formatFrequencyThai('weekly'), 'ทุกสัปดาห์')
      assert.equal(formatFrequencyThai('weekly', null, 1), 'ทุกสัปดาห์ (วันจันทร์)')
      assert.equal(formatFrequencyThai('weekly', null, 0), 'ทุกสัปดาห์ (วันอาทิตย์)')
      assert.equal(formatFrequencyThai('monthly', 25), 'ทุกเดือน (วันที่ 25)')
      assert.equal(formatFrequencyThai('monthly', null), 'ทุกเดือน (วันสิ้นเดือน)')
      assert.equal(formatFrequencyThai('yearly'), 'ทุกปี')
    })

    test('formats short Thai dates with Buddhist Era (+543)', () => {
      assert.equal(formatThaiDateShort('2026-09-17'), '17 ก.ย. 2569')
      assert.equal(formatThaiDateShort('2024-02-29'), '29 ก.พ. 2567')
      assert.equal(formatThaiDateShort('2026-12-31'), '31 ธ.ค. 2569')
    })
  })

  describe('6. Monthly Commitments Math (ภาระค่าใช้จ่าย/รายรับประจำรายเดือน)', () => {
    test('calculates accurate monthly equivalents for all frequencies', () => {
      assert.equal(calculateMonthlyEquivalent(100, 'daily'), 3000) // 100 * 30
      assert.equal(calculateMonthlyEquivalent(500, 'weekly'), 2167) // Math.round((500 * 52) / 12)
      assert.equal(calculateMonthlyEquivalent(15000, 'monthly'), 15000)
      assert.equal(calculateMonthlyEquivalent(12000, 'yearly'), 1000) // 12000 / 12
    })

    test('calculates total expense, income, and net commitment across schedules', () => {
      const schedules = [
        { type: 'expense', amount: 10000, frequency: 'monthly', is_active: true }, // 10,000
        { type: 'expense', amount: 500, frequency: 'weekly', is_active: true },    // 2,167
        { type: 'expense', amount: 1200, frequency: 'yearly', is_active: true },   // 100
        { type: 'income', amount: 45000, frequency: 'monthly', is_active: true },  // 45,000
        { type: 'expense', amount: 9999, frequency: 'monthly', is_active: false }, // Inactive should be skipped
      ]

      const res = calculateMonthlyCommitment(schedules)
      assert.equal(res.activeCount, 4)
      assert.equal(res.totalExpense, 12267) // 10000 + 2167 + 100
      assert.equal(res.totalIncome, 45000)
      assert.equal(res.netCommitment, 32733) // 45000 - 12267
    })
  })

  describe('7. Validation Rules for Recurring Schedules', () => {
    test('rejects zero or negative amount', () => {
      assert.equal(validateRecurringInput({ amount: 0, frequency: 'monthly' }).valid, false)
      assert.equal(validateRecurringInput({ amount: -500, frequency: 'monthly' }).valid, false)
      assert.equal(validateRecurringInput({ amount: 500, frequency: 'monthly' }).valid, true)
    })

    test('requires bucket_id for expense items', () => {
      assert.equal(validateRecurringInput({ type: 'expense', amount: 100, frequency: 'monthly', bucket_id: null }).valid, false)
      assert.equal(validateRecurringInput({ type: 'expense', amount: 100, frequency: 'monthly', bucket_id: 'bucket-1' }).valid, true)
      assert.equal(validateRecurringInput({ type: 'income', amount: 100, frequency: 'monthly', bucket_id: null }).valid, true)
    })

    test('validates day_of_month bounds (1 to 31)', () => {
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 0 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 32 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 31 }).valid, true)
    })

    test('validates day_of_week bounds (0 to 6)', () => {
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: -1 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: 7 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: 6 }).valid, true)
    })

    test('validates date range (end_date cannot precede start_date)', () => {
      assert.equal(validateRecurringInput({
        amount: 100,
        frequency: 'monthly',
        start_date: '2026-09-20',
        end_date: '2026-09-10'
      }).valid, false)

      assert.equal(validateRecurringInput({
        amount: 100,
        frequency: 'monthly',
        start_date: '2026-09-20',
        end_date: '2026-09-25'
      }).valid, true)
    })
  })
})
