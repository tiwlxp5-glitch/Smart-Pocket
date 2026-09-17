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

describe('Adversarial Empirical Stress Harness - Milestone 5: Recurring Transactions', () => {

  // =========================================================================
  // 1. Jan 31 -> Feb 28/29 -> Mar 31 Multi-Year Anchor Preservation Stress Test
  // =========================================================================
  describe('1. Multi-Year Anchor Preservation Across Variable Month Lengths', () => {
    test('preserves anchor day 31 across 48 consecutive months (2024 leap to 2027 non-leap)', () => {
      // 4-year cycle starting Jan 31, 2024
      let current = '2024-01-31'
      const anchorDay = 31

      // Month lengths for 2024 (leap), 2025, 2026, 2027
      const expectedDaysByYear = {
        2024: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        2025: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        2026: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        2027: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
      }

      for (let year = 2024; year <= 2027; year++) {
        const months = expectedDaysByYear[year]
        for (let m = 0; m < 12; m++) {
          // If at start, current is 2024-01-31, skip initial advancement check
          if (year === 2024 && m === 0) continue

          const next = calculateNextRunDate(current, 'monthly', anchorDay)
          const expectedMonth = String(m + 1).padStart(2, '0')
          const maxDays = months[m]
          const expectedClampedDay = Math.min(anchorDay, maxDays)
          const expectedDateStr = `${year}-${expectedMonth}-${String(expectedClampedDay).padStart(2, '0')}`

          assert.equal(
            formatDateISO(next),
            expectedDateStr,
            `Failed at year ${year} month ${m + 1}: expected ${expectedDateStr}, got ${formatDateISO(next)}`
          )

          current = formatDateISO(next)
        }
      }
    })

    test('preserves anchor day 30 across 24 consecutive months (restoring after February)', () => {
      let current = '2024-01-30'
      const anchorDay = 30

      for (let i = 0; i < 24; i++) {
        const next = calculateNextRunDate(current, 'monthly', anchorDay)
        const d = parseLocalDate(next)
        const month = d.getMonth() + 1
        const year = d.getFullYear()
        const date = d.getDate()

        if (month === 2) {
          // February clamping
          const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
          assert.equal(date, isLeap ? 29 : 28, `Feb in year ${year} should clamp to ${isLeap ? 29 : 28}`)
        } else {
          // All other months have at least 30 days, must restore to exactly 30
          assert.equal(date, 30, `Month ${month} in year ${year} must restore to anchor day 30`)
        }

        current = formatDateISO(next)
      }
    })

    test('preserves anchor day 29 across non-leap February (2025-01-29 -> 2025-02-28 -> 2025-03-29)', () => {
      const step1 = calculateNextRunDate('2025-01-29', 'monthly', 29)
      assert.equal(formatDateISO(step1), '2025-02-28', 'Must clamp to 28 Feb in non-leap year')

      const step2 = calculateNextRunDate('2025-02-28', 'monthly', 29)
      assert.equal(formatDateISO(step2), '2025-03-29', 'Must restore to 29 March from 28 Feb')
    })
  })

  // =========================================================================
  // 2. Leap Year Transitions (2024, 2028, 2000, 2100 Century Non-Leap)
  // =========================================================================
  describe('2. Leap Year Transitions & Century Gregorian Rules', () => {
    test('Year 2000 Century Leap Year (divisible by 400): Feb 29 exists', () => {
      // Daily advancing across Feb 28 -> 29 -> Mar 1 in year 2000
      const feb29 = calculateNextRunDate('2000-02-28', 'daily')
      assert.equal(formatDateISO(feb29), '2000-02-29', 'Year 2000 is a leap year; 28 Feb + 1 day must be 29 Feb')

      const mar01 = calculateNextRunDate('2000-02-29', 'daily')
      assert.equal(formatDateISO(mar01), '2000-03-01', '29 Feb 2000 + 1 day must be 1 March')

      // Monthly clamping in 2000
      const monthlyNext = calculateNextRunDate('2000-01-31', 'monthly', 31)
      assert.equal(formatDateISO(monthlyNext), '2000-02-29', '31 Jan 2000 must clamp to 29 Feb')
    })

    test('Year 2100 Century Non-Leap Year (divisible by 100, not 400): Feb 29 DOES NOT exist', () => {
      // Daily advancing in 2100: Feb 28 must advance directly to March 1
      const mar01 = calculateNextRunDate('2100-02-28', 'daily')
      assert.equal(formatDateISO(mar01), '2100-03-01', 'Year 2100 is NOT a leap year; 28 Feb + 1 day must jump to 01 March')

      // Monthly clamping in 2100: Jan 31 must clamp to Feb 28, NOT 29
      const monthlyNext = calculateNextRunDate('2100-01-31', 'monthly', 31)
      assert.equal(formatDateISO(monthlyNext), '2100-02-28', '31 Jan 2100 must clamp to 28 Feb in century non-leap year')

      // Restores to 31 March
      const marNext = calculateNextRunDate('2100-02-28', 'monthly', 31)
      assert.equal(formatDateISO(marNext), '2100-03-31', 'Must restore to 31 March 2100')
    })

    test('Yearly recurrence started on leap day (2024-02-29) through 2028 leap restoration', () => {
      // 2024-02-29 -> 2025-02-28 -> 2026-02-28 -> 2027-02-28 -> 2028-02-29
      const y1 = calculateNextRunDate('2024-02-29', 'yearly', 29)
      assert.equal(formatDateISO(y1), '2025-02-28', 'Clamps to Feb 28 in 2025')

      const y2 = calculateNextRunDate('2025-02-28', 'yearly', 29)
      assert.equal(formatDateISO(y2), '2026-02-28', 'Stays Feb 28 in 2026')

      const y3 = calculateNextRunDate('2026-02-28', 'yearly', 29)
      assert.equal(formatDateISO(y3), '2027-02-28', 'Stays Feb 28 in 2027')

      const y4 = calculateNextRunDate('2027-02-28', 'yearly', 29)
      assert.equal(formatDateISO(y4), '2028-02-29', 'Restores to Feb 29 in leap year 2028!')
    })

    test('Yearly recurrence crossing century non-leap year 2100 from 2099', () => {
      const y2100 = calculateNextRunDate('2099-02-28', 'yearly', 29)
      assert.equal(formatDateISO(y2100), '2100-02-28', 'Must clamp to Feb 28 in 2100')

      // And continues to 2101
      const y2101 = calculateNextRunDate('2100-02-28', 'yearly', 29)
      assert.equal(formatDateISO(y2101), '2101-02-28')

      // And restores in 2104 (leap year)
      const y2104 = calculateNextRunDate('2103-02-28', 'yearly', 29)
      assert.equal(formatDateISO(y2104), '2104-02-29', 'Restores Feb 29 in 2104')
    })
  })

  // =========================================================================
  // 3. Day of Month Boundaries (1, 28, 29, 30, 31)
  // =========================================================================
  describe('3. Day of Month Boundaries (1, 28, 29, 30, 31)', () => {
    test('Boundary 1: 1st of every month advances strictly to 1st of next month', () => {
      let current = '2026-01-01'
      for (let m = 2; m <= 12; m++) {
        const next = calculateNextRunDate(current, 'monthly', 1)
        const expectedMonth = String(m).padStart(2, '0')
        assert.equal(formatDateISO(next), `2026-${expectedMonth}-01`)
        current = formatDateISO(next)
      }
      const nextYearJan = calculateNextRunDate(current, 'monthly', 1)
      assert.equal(formatDateISO(nextYearJan), '2027-01-01')
    })

    test('Boundary 28: 28th of every month never needs clamping in any month', () => {
      let current = '2026-01-28'
      for (let m = 2; m <= 12; m++) {
        const next = calculateNextRunDate(current, 'monthly', 28)
        const expectedMonth = String(m).padStart(2, '0')
        assert.equal(formatDateISO(next), `2026-${expectedMonth}-28`)
        current = formatDateISO(next)
      }
    })

    test('Boundary 29: Clamps in February non-leap, preserves 29 in all other 11 months', () => {
      let current = '2026-01-29'
      const monthsExpected = [
        '2026-02-28', // clamped
        '2026-03-29', // restored
        '2026-04-29',
        '2026-05-29',
        '2026-06-29',
        '2026-07-29',
        '2026-08-29',
        '2026-09-29',
        '2026-10-29',
        '2026-11-29',
        '2026-12-29',
        '2027-01-29',
      ]
      for (const expected of monthsExpected) {
        const next = calculateNextRunDate(current, 'monthly', 29)
        assert.equal(formatDateISO(next), expected)
        current = formatDateISO(next)
      }
    })

    test('Boundary 30: Clamps only in February, preserves 30 in all other 11 months', () => {
      let current = '2026-01-30'
      const monthsExpected = [
        '2026-02-28', // clamped
        '2026-03-30', // restored
        '2026-04-30',
        '2026-05-30',
        '2026-06-30',
        '2026-07-30',
        '2026-08-30',
        '2026-09-30',
        '2026-10-30',
        '2026-11-30',
        '2026-12-30',
        '2027-01-30',
      ]
      for (const expected of monthsExpected) {
        const next = calculateNextRunDate(current, 'monthly', 30)
        assert.equal(formatDateISO(next), expected)
        current = formatDateISO(next)
      }
    })

    test('Boundary 31: Clamps in 30-day months and Feb, preserves 31 in 31-day months', () => {
      let current = '2026-01-31'
      const monthsExpected = [
        '2026-02-28', // clamped
        '2026-03-31', // restored
        '2026-04-30', // clamped to 30
        '2026-05-31', // restored
        '2026-06-30', // clamped to 30
        '2026-07-31', // restored
        '2026-08-31', // restored
        '2026-09-30', // clamped to 30
        '2026-10-31', // restored
        '2026-11-30', // clamped to 30
        '2026-12-31', // restored
        '2027-01-31', // restored
      ]
      for (const expected of monthsExpected) {
        const next = calculateNextRunDate(current, 'monthly', 31)
        assert.equal(formatDateISO(next), expected)
        current = formatDateISO(next)
      }
    })
  })

  // =========================================================================
  // 4. Day of Week Jumps (Full 7x7 Transition Matrix)
  // =========================================================================
  describe('4. Day of Week Matrix & Sunday Edge Cases', () => {
    test('exhaustively tests 7x7 currentDay vs targetDay combinations', () => {
      // 2026-09-20 is Sunday (0)
      // 2026-09-21 is Monday (1)
      // 2026-09-22 is Tuesday (2)
      // 2026-09-23 is Wednesday (3)
      // 2026-09-24 is Thursday (4)
      // 2026-09-25 is Friday (5)
      // 2026-09-26 is Saturday (6)
      const baseDates = [
        '2026-09-20', // Sunday (0)
        '2026-09-21', // Monday (1)
        '2026-09-22', // Tuesday (2)
        '2026-09-23', // Wednesday (3)
        '2026-09-24', // Thursday (4)
        '2026-09-25', // Friday (5)
        '2026-09-26', // Saturday (6)
      ]

      for (let curDay = 0; curDay < 7; curDay++) {
        const startDateStr = baseDates[curDay]
        const startDate = parseLocalDate(startDateStr)
        assert.equal(startDate.getDay(), curDay, `Base date ${startDateStr} must have day ${curDay}`)

        for (let targetDay = 0; targetDay < 7; targetDay++) {
          const next = calculateNextRunDate(startDateStr, 'weekly', null, targetDay)
          assert.equal(next.getDay(), targetDay, `Result day must match targetDay ${targetDay}`)

          const diffDays = Math.round((next.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

          if (curDay === targetDay) {
            // Must advance strictly +7 days into next week, never 0
            assert.equal(diffDays, 7, `Same day jump (${curDay} -> ${targetDay}) must advance by exactly 7 days`)
          } else {
            const expectedDiff = (targetDay - curDay + 7) % 7
            assert.equal(diffDays, expectedDiff, `Jump from day ${curDay} to ${targetDay} must be ${expectedDiff} days`)
            assert.ok(diffDays >= 1 && diffDays <= 6, `Difference must be between 1 and 6 days`)
          }
        }
      }
    })

    test('Sunday to next Sunday specifically advances by 7 days', () => {
      const sunday = '2026-09-20'
      const nextSunday = calculateNextRunDate(sunday, 'weekly', null, 0)
      assert.equal(formatDateISO(nextSunday), '2026-09-27')
      assert.equal(nextSunday.getDay(), 0)
    })

    test('Saturday to Sunday advances by 1 day', () => {
      const saturday = '2026-09-19'
      const nextSunday = calculateNextRunDate(saturday, 'weekly', null, 0)
      assert.equal(formatDateISO(nextSunday), '2026-09-20')
      assert.equal(nextSunday.getDay(), 0)
    })

    test('Monday to Sunday advances by 6 days', () => {
      const monday = '2026-09-21'
      const nextSunday = calculateNextRunDate(monday, 'weekly', null, 0)
      assert.equal(formatDateISO(nextSunday), '2026-09-27')
      assert.equal(nextSunday.getDay(), 0)
    })
  })

  // =========================================================================
  // 5. Invalid Frequency, Negative Amounts, Out-of-Range Dates & Input Validation
  // =========================================================================
  describe('5. Error Paths, Invalid Inputs & Defensive Guardrails', () => {
    test('throws explicit error on unsupported frequencies in calculateNextRunDate', () => {
      assert.throws(() => {
        calculateNextRunDate('2026-09-17', 'hourly')
      }, /Unsupported frequency: hourly/)

      assert.throws(() => {
        calculateNextRunDate('2026-09-17', 'biweekly')
      }, /Unsupported frequency: biweekly/)

      assert.throws(() => {
        calculateNextRunDate('2026-09-17', '')
      }, /Unsupported frequency:/)
    })

    test('validateRecurringInput rejects negative amounts and NaN', () => {
      assert.equal(validateRecurringInput({ amount: -1, frequency: 'monthly' }).valid, false)
      assert.equal(validateRecurringInput({ amount: -0.01, frequency: 'monthly' }).valid, false)
      assert.equal(validateRecurringInput({ amount: 0, frequency: 'monthly' }).valid, false)
      assert.equal(validateRecurringInput({ amount: NaN, frequency: 'monthly' }).valid, false)
      assert.equal(validateRecurringInput({ amount: Infinity, frequency: 'monthly' }).valid, true) // Infinity > 0 but usually DB restricts NUMERIC
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly' }).valid, true)
    })

    test('validateRecurringInput rejects invalid frequency strings', () => {
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'quarterly' }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: '' }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: undefined }).valid, false)
    })

    test('validateRecurringInput strictly checks day_of_month bounds [1..31]', () => {
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 0 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: -5 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 32 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 100 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 1 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 31 }).valid, true)
    })

    test('validateRecurringInput strictly checks day_of_week bounds [0..6]', () => {
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: -1 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: 7 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: 0 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: 6 }).valid, true)
    })

    test('validateRecurringInput rejects inverted date ranges (end_date < start_date)', () => {
      assert.equal(validateRecurringInput({
        amount: 100,
        frequency: 'monthly',
        start_date: '2026-10-01',
        end_date: '2026-09-30'
      }).valid, false)

      // Same day is valid
      assert.equal(validateRecurringInput({
        amount: 100,
        frequency: 'monthly',
        start_date: '2026-10-01',
        end_date: '2026-10-01'
      }).valid, true)
    })

    test('validateRecurringInput enforces string length caps on note (200) and category (50)', () => {
      const note200 = 'a'.repeat(200)
      const note201 = 'a'.repeat(201)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', note: note200 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', note: note201 }).valid, false)

      const cat50 = 'c'.repeat(50)
      const cat51 = 'c'.repeat(51)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', category: cat50 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', category: cat51 }).valid, false)
    })
  })

  // =========================================================================
  // 6. Commitment Normalization Math & Stress Harness
  // =========================================================================
  describe('6. High-Volume Commitment Calculation Stress Harness', () => {
    test('handles 10,000 schedule records accurately without precision drift or lag', () => {
      const frequencies = ['daily', 'weekly', 'monthly', 'yearly']
      const types = ['income', 'expense']
      const schedules = []

      let manualExpectedExpense = 0
      let manualExpectedIncome = 0
      let manualActiveCount = 0

      for (let i = 0; i < 10000; i++) {
        const freq = frequencies[i % frequencies.length]
        const type = types[i % types.length]
        const isActive = i % 5 !== 0 // 20% inactive
        const baseAmount = (i % 100) + 10 // 10 to 109

        schedules.push({
          type,
          amount: baseAmount,
          frequency: freq,
          is_active: isActive
        })

        if (isActive) {
          manualActiveCount++
          const eq = calculateMonthlyEquivalent(baseAmount, freq)
          if (type === 'expense') {
            manualExpectedExpense += eq
          } else {
            manualExpectedIncome += eq
          }
        }
      }

      const t0 = performance.now()
      const result = calculateMonthlyCommitment(schedules)
      const elapsedMs = performance.now() - t0

      assert.equal(result.activeCount, manualActiveCount)
      assert.equal(result.totalExpense, manualExpectedExpense)
      assert.equal(result.totalIncome, manualExpectedIncome)
      assert.equal(result.netCommitment, manualExpectedIncome - manualExpectedExpense)
      assert.ok(elapsedMs < 100, `Commitment calculation took ${elapsedMs.toFixed(2)}ms (must be < 100ms)`)
    })

    test('handles empty schedule array gracefully', () => {
      const result = calculateMonthlyCommitment([])
      assert.deepEqual(result, {
        totalExpense: 0,
        totalIncome: 0,
        netCommitment: 0,
        activeCount: 0
      })
    })
  })

  // =========================================================================
  // 7. Timezone Safety & Date Parsing Resilience
  // =========================================================================
  describe('7. Timezone Safety & ISO Parsing', () => {
    test('parseLocalDate parses YYYY-MM-DD string without UTC offset timezone shift', () => {
      const d = parseLocalDate('2026-09-17')
      assert.equal(d.getFullYear(), 2026)
      assert.equal(d.getMonth(), 8) // 0-indexed Sept
      assert.equal(d.getDate(), 17)
      assert.equal(formatDateISO(d), '2026-09-17')
    })

    test('parseLocalDate safely extracts date from ISO 8601 timestamps with T time', () => {
      const d1 = parseLocalDate('2026-09-17T00:00:00.000Z')
      assert.equal(d1.getFullYear(), 2026)
      assert.equal(d1.getMonth(), 8)
      assert.equal(d1.getDate(), 17)

      const d2 = parseLocalDate('2026-09-17T23:59:59.999Z')
      assert.equal(d2.getFullYear(), 2026)
      assert.equal(d2.getMonth(), 8)
      assert.equal(d2.getDate(), 17)
    })
  })
})
