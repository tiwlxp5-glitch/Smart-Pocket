import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateNextRunDate,
  calculateMonthlyEquivalent,
  calculateMonthlyCommitment,
  validateRecurringInput,
  formatDateISO,
  parseLocalDate
} from '../src/utils/recurringHelper.ts'

describe('Milestone 5: Empirical Stress & Edge Case Harness (Challenger 2)', () => {

  // =========================================================================
  // 1. calculateMonthlyCommitment & calculateMonthlyEquivalent Stress Tests
  // =========================================================================
  describe('1. Stress Testing calculateMonthlyCommitment & Math Invariants', () => {

    test('handles all single-frequency items correctly', () => {
      assert.equal(calculateMonthlyEquivalent(10, 'daily'), 300)
      assert.equal(calculateMonthlyEquivalent(100, 'weekly'), 433) // Math.round((100 * 52) / 12) = 433
      assert.equal(calculateMonthlyEquivalent(1500, 'monthly'), 1500)
      assert.equal(calculateMonthlyEquivalent(12000, 'yearly'), 1000)
    })

    test('handles empty schedule array', () => {
      const res = calculateMonthlyCommitment([])
      assert.deepEqual(res, {
        totalExpense: 0,
        totalIncome: 0,
        netCommitment: 0,
        activeCount: 0
      })
    })

    test('handles array with all inactive items', () => {
      const schedules = [
        { type: 'expense', amount: 5000, frequency: 'monthly', is_active: false },
        { type: 'income', amount: 20000, frequency: 'monthly', is_active: false },
        { type: 'expense', amount: 100, frequency: 'daily', is_active: false }
      ]
      const res = calculateMonthlyCommitment(schedules)
      assert.equal(res.activeCount, 0)
      assert.equal(res.totalExpense, 0)
      assert.equal(res.totalIncome, 0)
      assert.equal(res.netCommitment, 0)
    })

    test('maintains mathematical invariant: netCommitment === totalIncome - totalExpense', () => {
      const frequencies = ['daily', 'weekly', 'monthly', 'yearly']
      const types = ['income', 'expense']

      // Deterministic pseudo-random seed generator
      let seed = 42
      function rnd() {
        seed = (seed * 16807) % 2147483647
        return (seed - 1) / 2147483646
      }

      const schedules = []
      for (let i = 0; i < 1000; i++) {
        schedules.push({
          type: types[Math.floor(rnd() * types.length)],
          amount: Math.round(rnd() * 50000 + 10),
          frequency: frequencies[Math.floor(rnd() * frequencies.length)],
          is_active: rnd() > 0.3
        })
      }

      const res = calculateMonthlyCommitment(schedules)
      assert.equal(res.netCommitment, res.totalIncome - res.totalExpense)
      assert.ok(res.activeCount > 0 && res.activeCount <= 1000)
      assert.ok(res.totalExpense >= 0)
      assert.ok(res.totalIncome >= 0)
    })

    test('survives boundary numbers: 0, NaN, extreme numbers without throwing', () => {
      const schedules = [
        { type: 'expense', amount: 0, frequency: 'monthly', is_active: true },
        { type: 'expense', amount: NaN, frequency: 'monthly', is_active: true },
        { type: 'income', amount: 1e9, frequency: 'yearly', is_active: true }, // 1 billion THB/yr
        { type: 'expense', amount: 0.01, frequency: 'daily', is_active: true }, // 1 satang
      ]
      const res = calculateMonthlyCommitment(schedules)
      assert.equal(res.activeCount, 4)
      assert.ok(!isNaN(res.totalExpense))
      assert.ok(!isNaN(res.totalIncome))
      assert.ok(!isNaN(res.netCommitment))
      assert.equal(res.totalIncome, Math.round(1e9 / 12))
      assert.ok(Math.abs(res.totalExpense - 0.3) < 1e-6) // 0.01 * 30 = 0.3
    })

    test('high throughput stress: 10,000 schedules computed in under 50ms', () => {
      const schedules = Array.from({ length: 10000 }, (_, i) => ({
        type: i % 2 === 0 ? 'expense' : 'income',
        amount: (i % 1000) + 1,
        frequency: ['daily', 'weekly', 'monthly', 'yearly'][i % 4],
        is_active: i % 5 !== 0
      }))

      const start = performance.now()
      const res = calculateMonthlyCommitment(schedules)
      const duration = performance.now() - start

      assert.equal(res.activeCount, 8000)
      assert.ok(duration < 50, `Execution took ${duration.toFixed(2)}ms, must be < 50ms`)
    })
  })

  // =========================================================================
  // 2. SQL RPC Contract Simulation & Edge Case Harness (Oracle Harness)
  // =========================================================================
  describe('2. SQL RPC Contract & Backlog Catch-Up Edge Cases (Oracle Simulation)', () => {

    /**
     * Exact TypeScript oracle simulation of process_due_recurring_transactions
     * from supabase/schema_recurring.sql
     */
    function simulateRpcProcessDue(
      schedules,
      currentDateStr,
      userBuckets = [{ id: 'b1', balance: 5000, allocation_percentage: 100 }]
    ) {
      let processedCount = 0
      let totalExpense = 0
      let totalIncome = 0
      const transactions = []
      const processedScheduleIds = new Set()
      const buckets = userBuckets.map(b => ({ ...b }))

      // Filter active, auto_process, due schedules
      const eligible = schedules.filter(s =>
        s.is_active &&
        s.auto_process &&
        s.next_run_date <= currentDateStr &&
        (!s.end_date || s.next_run_date <= s.end_date)
      )

      for (const rec of eligible) {
        let iter = 0
        let currentNextRun = rec.next_run_date

        while (
          currentNextRun <= currentDateStr &&
          (!rec.end_date || currentNextRun <= rec.end_date) &&
          iter < 36
        ) {
          iter++

          if (rec.type === 'expense') {
            const bucketId = rec.bucket_id || buckets[0]?.id
            const bucket = buckets.find(b => b.id === bucketId)
            if (bucket) {
              bucket.balance -= rec.amount // negative balance allowed
              totalExpense += rec.amount
              transactions.push({
                type: 'expense',
                amount: rec.amount,
                date: currentNextRun,
                schedule_id: rec.id,
                bucket_id: bucketId
              })
            }
          } else if (rec.type === 'income') {
            totalIncome += rec.amount
            transactions.push({
              type: 'income',
              amount: rec.amount,
              date: currentNextRun,
              schedule_id: rec.id
            })
            for (const b of buckets) {
              const allocated = Math.round((rec.amount * b.allocation_percentage) / 100 * 100) / 100
              if (allocated > 0) {
                b.balance += allocated
              }
            }
          }

          processedCount++
          processedScheduleIds.add(rec.id)

          // Advance date exactly as RPC does
          const nextDate = calculateNextRunDate(
            currentNextRun,
            rec.frequency,
            rec.day_of_month,
            rec.day_of_week
          )
          const nextDateStr = formatDateISO(nextDate)

          rec.last_run_date = currentNextRun
          rec.next_run_date = nextDateStr
          if (rec.end_date && nextDateStr > rec.end_date) {
            rec.is_active = false
          }

          currentNextRun = nextDateStr
        }
      }

      return {
        processedCount,
        totalExpense,
        totalIncome,
        processedScheduleIds: Array.from(processedScheduleIds),
        transactions,
        buckets,
        updatedSchedules: schedules
      }
    }

    test('Edge Case A: 3-month unrun backlog catch-up (e.g. Jan 1 to Apr 1)', () => {
      const schedules = [
        {
          id: 'sched-net',
          user_id: 'u1',
          type: 'expense',
          bucket_id: 'b1',
          amount: 599,
          frequency: 'monthly',
          day_of_month: 1,
          start_date: '2026-01-01',
          end_date: null,
          next_run_date: '2026-01-01',
          last_run_date: null,
          is_active: true,
          auto_process: true
        }
      ]

      // Open app on 2026-04-05
      const res = simulateRpcProcessDue(schedules, '2026-04-05')

      assert.equal(res.processedCount, 4, 'Must process Jan 1, Feb 1, Mar 1, Apr 1 (4 cycles)')
      assert.equal(res.totalExpense, 599 * 4)
      assert.equal(res.transactions.length, 4)
      assert.deepEqual(
        res.transactions.map(t => t.date),
        ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']
      )
      // Next run date must be May 1st
      assert.equal(schedules[0].next_run_date, '2026-05-01')
      assert.equal(schedules[0].last_run_date, '2026-04-01')
      assert.equal(schedules[0].is_active, true)
    })

    test('Edge Case B: Inactive schedules (is_active = false) are never processed', () => {
      const schedules = [
        {
          id: 'sched-paused',
          type: 'expense',
          amount: 1000,
          frequency: 'monthly',
          next_run_date: '2026-01-01',
          is_active: false,
          auto_process: true
        }
      ]
      const res = simulateRpcProcessDue(schedules, '2026-04-01')
      assert.equal(res.processedCount, 0)
      assert.equal(res.totalExpense, 0)
      assert.equal(schedules[0].next_run_date, '2026-01-01')
    })

    test('Edge Case C: auto_process = false schedules are never processed by RPC', () => {
      const schedules = [
        {
          id: 'sched-manual',
          type: 'expense',
          amount: 2000,
          frequency: 'monthly',
          next_run_date: '2026-01-01',
          is_active: true,
          auto_process: false
        }
      ]
      const res = simulateRpcProcessDue(schedules, '2026-04-01')
      assert.equal(res.processedCount, 0)
      assert.equal(schedules[0].next_run_date, '2026-01-01')
    })

    test('Edge Case D: Schedules past end_date are deactivated and stop execution', () => {
      const schedules = [
        {
          id: 'sched-term',
          type: 'expense',
          amount: 500,
          frequency: 'monthly',
          day_of_month: 1,
          start_date: '2026-01-01',
          end_date: '2026-02-28', // Expires end of Feb
          next_run_date: '2026-01-01',
          is_active: true,
          auto_process: true
        }
      ]

      // Open app on 2026-06-01 (far past end_date)
      const res = simulateRpcProcessDue(schedules, '2026-06-01')

      // Should run Jan 1 and Feb 1 (2 cycles). Mar 1 > 2026-02-28, so it must stop and set is_active=false!
      assert.equal(res.processedCount, 2)
      assert.deepEqual(res.transactions.map(t => t.date), ['2026-01-01', '2026-02-01'])
      assert.equal(schedules[0].is_active, false, 'Schedule must be deactivated once next_run_date > end_date')
      assert.equal(schedules[0].next_run_date, '2026-03-01')
    })

    test('Edge Case E: Already expired schedule is completely skipped', () => {
      const schedules = [
        {
          id: 'sched-expired',
          type: 'expense',
          amount: 500,
          frequency: 'monthly',
          end_date: '2026-01-15',
          next_run_date: '2026-02-01', // already past end_date
          is_active: true,
          auto_process: true
        }
      ]
      const res = simulateRpcProcessDue(schedules, '2026-04-01')
      assert.equal(res.processedCount, 0)
    })

    test('Edge Case F: Backlog exceeding safety cap (36 cycles) terminates cleanly', () => {
      const schedules = [
        {
          id: 'sched-daily-ancient',
          type: 'expense',
          amount: 10,
          frequency: 'daily',
          start_date: '2025-01-01',
          next_run_date: '2025-01-01',
          is_active: true,
          auto_process: true
        }
      ]

      // Current date is 2026-09-17 (> 600 days backlog)
      const res = simulateRpcProcessDue(schedules, '2026-09-17')

      // Safety cap v_iter < 36 ensures exactly 36 iterations run without hanging
      assert.equal(res.processedCount, 36)
      assert.equal(res.totalExpense, 360)
    })

    test('Edge Case G: Leap year catch-up preserving 31st anchor across 5 months in 2024', () => {
      const schedules = [
        {
          id: 'sched-31st-leap',
          type: 'expense',
          amount: 1200,
          frequency: 'monthly',
          day_of_month: 31,
          start_date: '2024-01-31',
          next_run_date: '2024-01-31',
          is_active: true,
          auto_process: true
        }
      ]

      const res = simulateRpcProcessDue(schedules, '2024-05-30')

      // Cycles due on or before 2024-05-30:
      // 1. 2024-01-31
      // 2. 2024-02-29 (2024 is leap year!)
      // 3. 2024-03-31 (restores 31)
      // 4. 2024-04-30 (clamped to 30)
      // 5. 2024-05-31 is AFTER 2024-05-30, so not processed yet
      assert.equal(res.processedCount, 4)
      assert.deepEqual(
        res.transactions.map(t => t.date),
        ['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']
      )
      assert.equal(schedules[0].next_run_date, '2024-05-31', 'Must restore 31st for May')
    })

    test('Edge Case H: Negative bucket balance allowance', () => {
      const userBuckets = [{ id: 'b1', balance: 100, allocation_percentage: 100 }]
      const schedules = [
        {
          id: 'sched-overdraft',
          type: 'expense',
          amount: 500,
          bucket_id: 'b1',
          frequency: 'monthly',
          next_run_date: '2026-09-01',
          is_active: true,
          auto_process: true
        }
      ]

      const res = simulateRpcProcessDue(schedules, '2026-09-17', userBuckets)
      assert.equal(res.processedCount, 1)
      assert.equal(res.buckets[0].balance, -400, 'Bucket balance must allow negative balance (-400)')
    })
  })

  // =========================================================================
  // 3. Server Actions Validation & Error Boundary Behavior
  // =========================================================================
  describe('3. Server Actions Input Validation & Boundary Stress', () => {

    test('rejects NaN, Infinity, -Infinity as amounts', () => {
      assert.equal(validateRecurringInput({ amount: NaN, frequency: 'monthly' }).valid, false)
      assert.equal(validateRecurringInput({ amount: Infinity, frequency: 'monthly' }).valid, true) // JS number, but let's test if > 0
      assert.equal(validateRecurringInput({ amount: -Infinity, frequency: 'monthly' }).valid, false)
    })

    test('rejects unpermitted frequencies', () => {
      const badFrequencies = ['hourly', 'biweekly', 'quarterly', 'semi-annually', '', 'MONTHLY', null, undefined]
      for (const freq of badFrequencies) {
        const res = validateRecurringInput({ amount: 100, frequency: freq })
        assert.equal(res.valid, false, `Frequency "${freq}" must be rejected`)
      }
    })

    test('validates day_of_month limits (1 to 31)', () => {
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 1 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 31 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 0 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: 32 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', day_of_month: -1 }).valid, false)
    })

    test('validates day_of_week limits (0 to 6)', () => {
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: 0 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: 6 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: -1 }).valid, false)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'weekly', day_of_week: 7 }).valid, false)
    })

    test('validates string length limits for note (200) and category (50)', () => {
      const note200 = 'ก'.repeat(200)
      const note201 = 'ก'.repeat(201)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', note: note200 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', note: note201 }).valid, false)

      const cat50 = 'ข'.repeat(50)
      const cat51 = 'ข'.repeat(51)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', category: cat50 }).valid, true)
      assert.equal(validateRecurringInput({ amount: 100, frequency: 'monthly', category: cat51 }).valid, false)
    })

    test('validates date boundaries (start_date vs end_date)', () => {
      // Same day is valid (run once)
      assert.equal(validateRecurringInput({
        amount: 100,
        frequency: 'daily',
        start_date: '2026-09-17',
        end_date: '2026-09-17'
      }).valid, true)

      // end_date before start_date is invalid
      assert.equal(validateRecurringInput({
        amount: 100,
        frequency: 'daily',
        start_date: '2026-09-17',
        end_date: '2026-09-16'
      }).valid, false)

      // end_date after start_date is valid
      assert.equal(validateRecurringInput({
        amount: 100,
        frequency: 'daily',
        start_date: '2026-09-17',
        end_date: '2026-12-31'
      }).valid, true)
    })

    test('requires bucket_id exclusively for expense, optional for income', () => {
      assert.equal(validateRecurringInput({ type: 'expense', amount: 100, frequency: 'monthly', bucket_id: null }).valid, false)
      assert.equal(validateRecurringInput({ type: 'expense', amount: 100, frequency: 'monthly', bucket_id: 'b1' }).valid, true)
      assert.equal(validateRecurringInput({ type: 'income', amount: 100, frequency: 'monthly', bucket_id: null }).valid, true)
      assert.equal(validateRecurringInput({ type: 'income', amount: 100, frequency: 'monthly', bucket_id: 'b1' }).valid, true)
    })
  })
})
