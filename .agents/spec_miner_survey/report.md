# Milestone 5: Recurring Transactions — Technical Specification Report

**Date**: 2026-09-17  
**Author**: `spec_miner_survey`  
**Status**: Specification Complete  
**Project**: Smart Pocket (แอพรายรับรายจ่าย)

---

## 1. Executive Summary

Milestone 5 introduces **Recurring Transactions (ระบบรายการประจำอัตโนมัติ)** for Smart Pocket. This feature empowers users to track and automate fixed recurring expenses and income (e.g., apartment rent, internet bills, Netflix subscriptions, monthly salary) across 4 frequencies: **Daily, Weekly, Monthly, Yearly**.

The system utilizes a **Lazy Evaluation Runner Pattern** when users open their dashboard, eliminating the need for paid external cron jobs while ensuring that account balances, allocations, and transaction histories remain accurate and atomic via PostgreSQL Row Level Security (RLS) and stored procedures (RPC).

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Database | `recurring_schedules` Table | Stores recurring schedule rules and lifecycle metadata | Table columns (UUID, type, bucket_id, amount, frequency, day_of_month, day_of_week, start_date, end_date, next_run_date, last_run_date, is_active, auto_process) | Table schema with constraints | Foreign key errors if invalid bucket/user; Check constraints for amount > 0 and frequency | ORIGINAL_REQUEST.md § R1, supabase/schema.sql |
| 2 | Database | RLS Security Policies | Enforces tenant data isolation for recurring schedules | auth.uid() | Allowed / Denied row access | 403 / 401 unauthorized or empty rows | ORIGINAL_REQUEST.md § R1, Production Baseline Rule 2 & 6 |
| 3 | Database | `process_due_recurring_transactions` RPC | Atomic stored procedure to execute overdue schedules | `p_user_id UUID` | `JSONB` `{ processed_count: number, total_expense: number, total_income: number, processed_ids: string[] }` | Throws error if unauthorized caller (`auth.uid() <> p_user_id`); rolls back whole transaction on failure | ORIGINAL_REQUEST.md § R1, supabase/schema.sql |
| 4 | Database | Negative Bucket Balance Allowance | Recurring expense transactions can push bucket balance negative to preserve accounting history | Schedule amount, Bucket ID | Updated balance (can be < 0) | Returns transaction ID; does not abort on zero/negative balance | ORIGINAL_REQUEST.md § R1 |
| 5 | Database | Automatic Income Distribution | Recurring income automatically splits across all user buckets based on `allocation_percentage` | Schedule amount, User ID | Rows in `transactions` + `allocations`, updated bucket balances | If no buckets, keeps transaction unallocated | ORIGINAL_REQUEST.md § R1, src/app/dashboard/actions.ts |
| 6 | Utility | `calculateNextRunDate` | Calculates next billing date for Daily, Weekly, Monthly, Yearly | `currentDate: Date`, `frequency: string`, `dayOfMonth?: number`, `dayOfWeek?: number` | `Date` (next run date) | Throws on invalid frequency or out-of-range day numbers | ORIGINAL_REQUEST.md § R2 |
| 7 | Utility | Short Month & Leap Year Day Clamping | Clamps target billing day (e.g. 31st) to max days in target month (e.g. Feb 28/29, Apr 30) while preserving original target day | Target day 31, date in Feb | Feb 28 (or Feb 29 in leap year) | Clamped to last valid calendar day without skipping month | ORIGINAL_REQUEST.md § R2 |
| 8 | Utility | Yearly Leap Year Clamping | Clamps Feb 29 to Feb 28 in non-leap subsequent years | 2028-02-29, +1 year | 2029-02-28 | Prevents JS rollover to March 1 | Codebase probe (JS Date behavior) |
| 9 | Utility | `formatFrequencyThai` | Generates human-friendly Thai description of recurring schedule | `frequency`, `dayOfMonth`, `dayOfWeek` | Thai text (e.g. "ทุกเดือน (วันที่ 25)", "ทุกสัปดาห์ (วันจันทร์)") | Returns fallback string if invalid input | ORIGINAL_REQUEST.md § R2 |
| 10 | Utility | `calculateMonthlyCommitment` | Normalizes any frequency to estimated monthly equivalent amount for budget planning | Schedules array | `{ totalExpense: number, totalIncome: number, netCommitment: number }` | Treats inactive or invalid as 0 | ORIGINAL_REQUEST.md § R4 |
| 11 | Actions | `createRecurringSchedule` | Server Action to validate and persist new schedule | `FormData` | `{ success: boolean, data?: RecurringSchedule, message?: string }` | Returns error message on invalid input (amount <= 0, missing bucket for expense) | ORIGINAL_REQUEST.md § R3 |
| 12 | Actions | `updateRecurringSchedule` | Server Action to update existing recurring schedule | `id: string`, `FormData` | `{ success: boolean, message?: string }` | Returns error if record not found or unauthorized | ORIGINAL_REQUEST.md § R3 |
| 13 | Actions | `deleteRecurringSchedule` | Server Action to remove schedule | `id: string` | `{ success: boolean, message?: string }` | Returns error if unauthorized | ORIGINAL_REQUEST.md § R3 |
| 14 | Actions | `toggleRecurringActive` | Server Action to pause/resume recurring schedule | `id: string`, `isActive: boolean` | `{ success: boolean, message?: string }` | Recalculates next_run_date if reactivating past schedule | ORIGINAL_REQUEST.md § R3 |
| 15 | Actions | `checkAndProcessRecurringAction` | Server Action runner for Lazy Evaluation | None (reads auth session) | `{ processedCount: number, items: Array }` | Gracefully catches and logs errors, returns 0 processed | ORIGINAL_REQUEST.md § R3 |
| 16 | UI | `/dashboard/recurring` Page | Main management view for all recurring bills and income | None | Rendered page with summary card, tabs, schedule list | Redirects to login if unauthenticated | ORIGINAL_REQUEST.md § R4 |
| 17 | UI | Monthly Commitment Summary Card | Displays total monthly fixed commitments and active bill count | Active schedules | Visual card with income/expense/net totals | Shows ฿0 if no schedules | ORIGINAL_REQUEST.md § R4 |
| 18 | UI | Create/Edit Schedule Modal/Drawer | Form modal with dynamic fields based on frequency | Modal open state, optional editing schedule | Interactive form | Inline field validation errors | ORIGINAL_REQUEST.md § R4 |
| 19 | UI | Dashboard Shortcut & Banner | Shortcut widget on Dashboard + Alert banner when bills are auto-processed | Dashboard state | Shortcut card + Notification alert | Hidden if 0 processed | ORIGINAL_REQUEST.md § R4 |
| 20 | UI | Settings Navigation Menu Item | Link in `/dashboard/settings` to `/dashboard/recurring` | User interaction | Navigates to `/dashboard/recurring` | N/A | ORIGINAL_REQUEST.md § R4 |

---

## 3. Edge Cases Discovered & Evaluated

| # | Feature | Input / Scenario | Observed / Expected Behavior | Resolution / Spec Guardrail |
|---|---------|------------------|------------------------------|-----------------------------|
| 1 | Monthly Clamping | Schedule set on 31st; current date is 2026-01-31 | Naive `date + 1 month` can produce inconsistent dates or skip to March. Target month (Feb 2026) has 28 days. | Result MUST be `2026-02-28`. Original `day_of_month: 31` must remain stored in DB so the subsequent month (March) runs on `2026-03-31`. |
| 2 | Monthly Leap Year | Schedule set on 31st; current date is 2028-01-31 (leap year) | February 2028 has 29 days. | Result MUST clamp to `2028-02-29`. Next month (March) must run on `2028-03-31`. |
| 3 | Monthly 30-Day Month | Schedule set on 31st; current date is 2026-03-31 | April has 30 days. | Result MUST clamp to `2026-04-30`. Next month (May) must run on `2026-05-31`. |
| 4 | Yearly Leap Year | Schedule created on 2028-02-29 (leap day) | In JavaScript: `date.setFullYear(2029)` on Feb 29 rolls over to `2029-03-01` because 2029 is not a leap year! | Must explicitly clamp: `Math.min(29, daysInMonth(2029, 1))` yielding `2029-02-28`. |
| 5 | Overdue Backlog (Multi-cycle catch-up) | User hasn't opened app for 3 months; monthly schedule was due on 1st of each month | Lazy evaluation runs when user opens app today. If single-step, 2 months of transactions would be lost. | `process_due_recurring_transactions` must process due cycles iteratively up to CURRENT_DATE (capped with safety limit e.g. 36 iterations) or advance sequentially. |
| 6 | Negative Bucket Balance | Scheduled expense of ฿15,000, but assigned bucket balance is only ฿4,000 | Strict check would fail the transaction and miss the bill record. | Specification R1 explicitly states: "ยอมให้ยอดติดลบได้เพื่อความสมบูรณ์ของประวัติบัญชี". Balance updates to -฿11,000. |
| 7 | Deleted / Null Bucket | An expense schedule was linked to a bucket that was subsequently deleted | Expense deduction cannot find target bucket. | RLS & Schema: Foreign key `bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL`. If `bucket_id` is null on expense, fallback to default bucket or log error and skip. |
| 8 | Zero or Negative Amount | User submits `amount = 0` or `amount = -500` | Database check constraint `CHECK (amount > 0)` and server action validation reject invalid amounts with Thai error message. | Handled at validation and DB constraint level. |
| 9 | Expired Schedule (`end_date`) | Schedule has `end_date = 2026-09-01`; today is 2026-09-17 | Next run date exceeds `end_date`. | The RPC or Server Action automatically marks `is_active = false` so no further executions occur. |
| 10 | Concurrency / Double Processing | User opens Dashboard in two browser tabs simultaneously | Both tabs fire `checkAndProcessRecurringAction()` at the exact same millisecond. | PostgreSQL RPC uses `FOR UPDATE` row-level locks on `recurring_schedules`. First transaction advances `next_run_date`; second query sees `next_run_date > CURRENT_DATE` and processes 0 rows. |
| 11 | IDOR Vulnerability | Malicious user calls `process_due_recurring_transactions` with another user's UUID | Insecure Direct Object Reference (IDOR). | Inside RPC: `IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Permission denied'; END IF;` |

---

## 4. Technical Architecture & Requirements Specification

### R1. Database Schema & Supabase RPC (`supabase/schema_recurring.sql`)

#### 4.1 Table Definition: `recurring_schedules`

```sql
-- ==========================================
-- 🔄 Smart Pocket - Recurring Transactions Schema
-- File: supabase/schema_recurring.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL, -- 'income' or 'expense'
  bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL, -- Required for expense, null for income
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'ทั่วไป',
  note TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE CHECK (end_date IS NULL OR end_date >= start_date),
  next_run_date DATE NOT NULL,
  last_run_date DATE DEFAULT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  auto_process BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_recurring_schedules_updated_at 
  BEFORE UPDATE ON recurring_schedules 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes for high performance querying during lazy evaluation
CREATE INDEX IF NOT EXISTS idx_recurring_due 
  ON recurring_schedules (user_id, next_run_date) 
  WHERE is_active = true AND auto_process = true;
```

#### 4.2 Row Level Security (RLS) Policies

```sql
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring schedules"
  ON recurring_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring schedules"
  ON recurring_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring schedules"
  ON recurring_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring schedules"
  ON recurring_schedules FOR DELETE
  USING (auth.uid() = user_id);
```

#### 4.3 Atomic PostgreSQL RPC: `process_due_recurring_transactions`

```sql
CREATE OR REPLACE FUNCTION process_due_recurring_transactions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_rec RECORD;
  v_tx_id UUID;
  v_allocated_amount NUMERIC;
  v_bucket RECORD;
  v_processed_count INT := 0;
  v_total_expense NUMERIC := 0;
  v_total_income NUMERIC := 0;
  v_processed_ids UUID[] := ARRAY[]::UUID[];
  v_next_date DATE;
  v_next_month_first DATE;
  v_days_in_next_month INT;
  v_target_day INT;
  v_next_year INT;
  v_month INT;
  v_day INT;
  v_tx_timestamp TIMESTAMPTZ;
  v_iter INT;
BEGIN
  -- 1. Security Check (IDOR Guard)
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Permission denied: Cannot process schedules for another user';
  END IF;

  -- 2. Iterate through all active, due schedules with row-level lock
  FOR v_rec IN 
    SELECT * FROM recurring_schedules
    WHERE user_id = p_user_id 
      AND is_active = true 
      AND auto_process = true 
      AND next_run_date <= CURRENT_DATE
      AND (end_date IS NULL OR next_run_date <= end_date)
    FOR UPDATE
  LOOP
    v_iter := 0;

    -- Catch-up loop: process all due dates up to CURRENT_DATE (safety cap: 36 iterations)
    WHILE v_rec.next_run_date <= CURRENT_DATE AND (v_rec.end_date IS NULL OR v_rec.next_run_date <= v_rec.end_date) AND v_iter < 36 LOOP
      v_iter := v_iter + 1;
      v_tx_timestamp := (v_rec.next_run_date::text || ' 12:00:00+07')::timestamptz;

      -- A. Handle Expense
      IF v_rec.type = 'expense' THEN
        -- Verify bucket exists or pick user's first bucket if bucket_id is null
        IF v_rec.bucket_id IS NULL THEN
          SELECT id INTO v_rec.bucket_id FROM buckets WHERE user_id = p_user_id LIMIT 1;
        END IF;

        IF v_rec.bucket_id IS NOT NULL THEN
          -- 1. Insert into transactions
          INSERT INTO transactions (
            user_id, bucket_id, type, amount, category, note, transaction_date
          ) VALUES (
            p_user_id,
            v_rec.bucket_id,
            'expense',
            v_rec.amount,
            COALESCE(v_rec.category, 'ค่าใช้จ่ายประจำ'),
            COALESCE(v_rec.note, 'รายการประจำอัตโนมัติ'),
            v_tx_timestamp
          ) RETURNING id INTO v_tx_id;

          -- 2. Deduct from bucket balance (allowing negative balance per spec)
          UPDATE buckets 
          SET balance = balance - v_rec.amount,
              updated_at = now()
          WHERE id = v_rec.bucket_id;

          v_total_expense := v_total_expense + v_rec.amount;
        END IF;

      -- B. Handle Income
      ELSIF v_rec.type = 'income' THEN
        -- 1. Insert into transactions
        INSERT INTO transactions (
          user_id, bucket_id, type, amount, category, note, transaction_date
        ) VALUES (
          p_user_id,
          NULL,
          'income',
          v_rec.amount,
          COALESCE(v_rec.category, 'รายรับประจำ'),
          COALESCE(v_rec.note, 'รายรับประจำอัตโนมัติ'),
          v_tx_timestamp
        ) RETURNING id INTO v_tx_id;

        -- 2. Allocate to buckets according to allocation_percentage
        FOR v_bucket IN 
          SELECT id, allocation_percentage, balance FROM buckets WHERE user_id = p_user_id 
        LOOP
          v_allocated_amount := ROUND((v_rec.amount * v_bucket.allocation_percentage) / 100.0, 2);
          IF v_allocated_amount > 0 THEN
            INSERT INTO allocations (user_id, income_transaction_id, bucket_id, amount)
            VALUES (p_user_id, v_tx_id, v_bucket.id, v_allocated_amount);

            UPDATE buckets 
            SET balance = balance + v_allocated_amount,
                updated_at = now()
            WHERE id = v_bucket.id;
          END IF;
        END LOOP;

        v_total_income := v_total_income + v_rec.amount;
      END IF;

      -- Track processed stats
      v_processed_count := v_processed_count + 1;
      IF NOT (v_rec.id = ANY(v_processed_ids)) THEN
        v_processed_ids := array_append(v_processed_ids, v_rec.id);
      END IF;

      -- C. Calculate Next Run Date with Clamping
      IF v_rec.frequency = 'daily' THEN
        v_next_date := v_rec.next_run_date + INTERVAL '1 day';

      ELSIF v_rec.frequency = 'weekly' THEN
        v_next_date := v_rec.next_run_date + INTERVAL '7 days';

      ELSIF v_rec.frequency = 'monthly' THEN
        v_next_month_first := (date_trunc('month', v_rec.next_run_date) + INTERVAL '1 month')::date;
        v_days_in_next_month := EXTRACT(DAY FROM (date_trunc('month', v_next_month_first) + INTERVAL '1 month - 1 day'))::int;
        v_target_day := LEAST(COALESCE(v_rec.day_of_month, EXTRACT(DAY FROM v_rec.next_run_date)::int), v_days_in_next_month);
        v_next_date := v_next_month_first + (v_target_day - 1) * INTERVAL '1 day';

      ELSIF v_rec.frequency = 'yearly' THEN
        v_next_year := EXTRACT(YEAR FROM v_rec.next_run_date)::int + 1;
        v_month := EXTRACT(MONTH FROM v_rec.next_run_date)::int;
        v_day := EXTRACT(DAY FROM v_rec.next_run_date)::int;
        -- Leap year clamping for Feb 29
        IF v_month = 2 AND v_day = 29 THEN
          IF NOT ((v_next_year % 4 = 0 AND v_next_year % 100 <> 0) OR (v_next_year % 400 = 0)) THEN
            v_day := 28;
          END IF;
        END IF;
        v_next_date := make_date(v_next_year, v_month, v_day);
      ELSE
        v_next_date := v_rec.next_run_date + INTERVAL '1 month';
      END IF;

      -- Update the schedule record in memory and in DB
      UPDATE recurring_schedules 
      SET last_run_date = v_rec.next_run_date,
          next_run_date = v_next_date,
          is_active = CASE 
            WHEN v_rec.end_date IS NOT NULL AND v_next_date > v_rec.end_date THEN false 
            ELSE is_active 
          END,
          updated_at = now()
      WHERE id = v_rec.id;

      -- Advance local variable for catch-up loop
      v_rec.next_run_date := v_next_date;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'processed_count', v_processed_count,
    'total_expense', v_total_expense,
    'total_income', v_total_income,
    'processed_schedule_ids', v_processed_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### R2. Date & Scheduling Calculation Logic (`src/utils/recurringHelper.ts`)

#### 4.4 Types & Interfaces

```ts
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringType = 'income' | 'expense';

export interface RecurringSchedule {
  id: string;
  user_id: string;
  type: RecurringType;
  bucket_id: string | null;
  amount: number;
  category: string;
  note: string | null;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  next_run_date: string; // YYYY-MM-DD
  last_run_date: string | null;
  is_active: boolean;
  auto_process: boolean;
  created_at: string;
  updated_at: string;
}
```

#### 4.5 Calculation Algorithm: `calculateNextRunDate`

```ts
/**
 * Calculates the next run date for a recurring schedule.
 * Handles edge cases:
 * - Monthly end-of-month clamping (Jan 31 -> Feb 28/29, Feb 28/29 -> Mar 31)
 * - Leap year February 29 clamping for yearly schedules
 * - Weekly offset calculation
 */
export function calculateNextRunDate(
  currentDate: Date | string,
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const d = typeof currentDate === 'string' ? new Date(currentDate) : new Date(currentDate);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed
  const date = d.getDate();

  switch (frequency) {
    case 'daily': {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    }

    case 'weekly': {
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const curDay = d.getDay();
        let diff = (dayOfWeek - curDay + 7) % 7;
        if (diff === 0) diff = 7; // advance to next week
        const next = new Date(d);
        next.setDate(next.getDate() + diff);
        return next;
      }
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    }

    case 'monthly': {
      // Determine target month and year
      const nextYear = month === 11 ? year + 1 : year;
      const nextMonth = month === 11 ? 0 : month + 1;
      
      // Calculate max days in next month (day 0 of month+1 gives last day of month)
      const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
      
      // Target day from parameter or fallback to original date's day
      const targetDay = dayOfMonth || date;
      const clampedDay = Math.min(targetDay, daysInNextMonth);
      
      return new Date(nextYear, nextMonth, clampedDay, d.getHours(), d.getMinutes(), d.getSeconds());
    }

    case 'yearly': {
      const nextYear = year + 1;
      // Handle leap year edge case: Feb 29 in non-leap next year clamps to Feb 28
      const daysInTargetMonth = new Date(nextYear, month + 1, 0).getDate();
      const clampedDay = Math.min(date, daysInTargetMonth);
      
      return new Date(nextYear, month, clampedDay, d.getHours(), d.getMinutes(), d.getSeconds());
    }

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
}
```

#### 4.6 Thai Localization Helpers

```ts
export const THAI_DAY_NAMES = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

export function formatFrequencyThai(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): string {
  switch (frequency) {
    case 'daily':
      return 'ทุกวัน';
    case 'weekly':
      return `ทุกสัปดาห์ (${dayOfWeek !== null && dayOfWeek !== undefined ? THAI_DAY_NAMES[dayOfWeek] : 'ตามวันที่กำหนด'})`;
    case 'monthly':
      return `ทุกเดือน (${dayOfMonth ? `วันที่ ${dayOfMonth}` : 'วันสิ้นเดือน'})`;
    case 'yearly':
      return 'ทุกปี';
    default:
      return frequency;
  }
}

export function formatThaiDateShort(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}
```

#### 4.7 Monthly Commitment Math

```ts
export function calculateMonthlyEquivalent(amount: number, frequency: RecurringFrequency): number {
  switch (frequency) {
    case 'daily':
      return amount * 30;
    case 'weekly':
      return Math.round((amount * 52) / 12);
    case 'monthly':
      return amount;
    case 'yearly':
      return Math.round(amount / 12);
    default:
      return amount;
  }
}

export function calculateMonthlyCommitments(schedules: RecurringSchedule[]): {
  monthlyExpense: number;
  monthlyIncome: number;
  monthlyNet: number;
  activeCount: number;
} {
  let monthlyExpense = 0;
  let monthlyIncome = 0;
  let activeCount = 0;

  for (const s of schedules) {
    if (!s.is_active) continue;
    activeCount++;
    const eq = calculateMonthlyEquivalent(Number(s.amount), s.frequency);
    if (s.type === 'expense') {
      monthlyExpense += eq;
    } else if (s.type === 'income') {
      monthlyIncome += eq;
    }
  }

  return {
    monthlyExpense,
    monthlyIncome,
    monthlyNet: monthlyIncome - monthlyExpense,
    activeCount,
  };
}
```

---

### R3. Server Actions & Lazy Evaluation Runner (`src/app/dashboard/actions.ts`)

#### 4.8 Signatures & Workflow

```ts
// 1. Create Schedule
export async function createRecurringSchedule(formData: FormData): Promise<{
  success: boolean;
  message?: string;
  data?: any;
}>

// 2. Update Schedule
export async function updateRecurringSchedule(
  id: string,
  formData: FormData
): Promise<{ success: boolean; message?: string }>

// 3. Delete Schedule
export async function deleteRecurringSchedule(
  id: string
): Promise<{ success: boolean; message?: string }>

// 4. Toggle Active Status
export async function toggleRecurringActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; message?: string }>

// 5. Lazy Evaluation Runner
export async function checkAndProcessRecurringAction(): Promise<{
  success: boolean;
  processedCount: number;
  totalExpense: number;
  totalIncome: number;
  message?: string;
}>
```

#### 4.9 Lazy Evaluation Runner Workflow:
1. When user requests `/dashboard` (or on initial client load):
2. `checkAndProcessRecurringAction()` is triggered.
3. Authenticate current user via `supabase.auth.getUser()`. If null, exit gracefully.
4. Call `supabase.rpc('process_due_recurring_transactions', { p_user_id: user.id })`.
5. If `data.processed_count > 0`:
   - Calls `revalidatePath('/dashboard', 'layout')`.
   - Calls `revalidatePath('/dashboard/history')`.
   - Calls `revalidatePath('/dashboard/analytics')`.
   - Returns `{ success: true, processedCount: data.processed_count, totalExpense: data.total_expense, totalIncome: data.total_income }`.
6. Dashboard renders a dismissible notification badge:
   `"🎉 บันทึกรายการประจำอัตโนมัติเรียบร้อย 2 รายการ (-฿1,250)"`

---

### R4. User Interface & Navigation Specification

#### 4.10 Route: `/dashboard/recurring` (`src/app/dashboard/recurring/page.tsx`)

1. **Header**:
   - Back button (`<ChevronLeft />`) navigating to `/dashboard`.
   - Title: `"รายการประจำอัตโนมัติ"`
   - Subtitle: `"จัดการค่าใช้จ่ายและรายรับตามรอบบิล"`
   - Action: `"+ เพิ่มรายการ"` (opens Create Modal/Drawer).

2. **Monthly Commitments Summary Card**:
   - 3-column KPI card or grid:
     - 🔴 **จ่ายออกประจำ/เดือน**: `฿...` (Sum of monthly equivalents)
     - 🟢 **รับเข้าประจำ/เดือน**: `฿...`
     - 🔵 **สุทธิประจำ/เดือน**: `+฿...` / `-฿...`
     - Subtext: `"เปิดใช้งานอยู่ X รายการ"`

3. **Filter Tabs**:
   - `ทั้งหมด` (All)
   - `รายจ่าย` (Expense)
   - `รายรับ` (Income)

4. **Schedule Card List**:
   - Icon / Bucket color indicator.
   - Note / Name (e.g., "ค่าเช่าห้องคอนโด", "Netflix Premium", "เงินเดือน").
   - Category & Bucket badge (e.g. `[ค่าใช้จ่ายประจำ] [เงินใช้ชีวิต]`).
   - Thai Frequency badge (e.g. `"ทุกเดือน (วันที่ 1)"`).
   - Amount: `"-฿12,000"` (Rose) / `"+฿45,000"` (Emerald).
   - Next run indicator: `"รอบถัดไป: 1 ต.ค. 2026"` (Badge: `"ถึงกำหนดวันนี้"` if today).
   - Toggle Switch: Instant active/pause toggle.
   - Menu: `"แก้ไข"` (Edit) and `"ลบ"` (Delete confirmation).

5. **Drawer / Modal Form (`RecurringFormModal.tsx`)**:
   - Type selector: Segmented button `[รายจ่าย] [รายรับ]`
   - Amount: Currency input with prefix `฿`
   - Note: Text input (`ชื่อรายการ เช่น ค่าเน็ตบ้าน, ค่าคอนโด`)
   - Category: Dropdown with common recurring categories (ที่พัก, สาธารณูปโภค, สื่อบันเทิง, ประกัน, เงินเดือน)
   - Bucket: Dropdown of user buckets with current balances (mandatory for expense)
   - Frequency: Select `[ทุกวัน (Daily), ทุกสัปดาห์ (Weekly), ทุกเดือน (Monthly), ทุกปี (Yearly)]`
   - Conditional Day Selector:
     - If `Weekly`: Day of week pills (อาทิตย์ - เสาร์)
     - If `Monthly`: Day of month picker (1 to 31)
   - Start Date: Date picker (default today)
   - End Date: Date picker (optional)
   - Auto Process: Switch (`ตัดยอดและบันทึกอัตโนมัติ`)
   - Submit Button: `"บันทึกรายการประจำ"`

#### 4.11 Integration on Dashboard (`/dashboard/page.tsx`)

- Add **Recurring Bills Widget**:
  - Below Budget Alerts card, show a card linking to `/dashboard/recurring`:
    - Icon: `CalendarClock` or `Repeat`
    - Title: `"รายการประจำ (Recurring)"`
    - Value: `X รายการที่เปิดใช้งาน` | `ภาระเดือนนี้ ~฿...`
    - Arrow chevron to `/dashboard/recurring`.
- Add **Notification Banner** when lazy runner executes:
  - If `processedCount > 0`, show green celebratory banner at top of dashboard:
    `"🎉 บันทึกรายการประจำอัตโนมัติแล้ว X รายการ (รวม ฿...)"` with dismiss `X`.

#### 4.12 Integration on Settings (`/dashboard/settings/page.tsx`)

- Under User Profile & Password sections, add navigation section:
  - Menu title: `"รายการประจำอัตโนมัติ (Recurring Transactions)"`
  - Icon: `Repeat` or `CalendarCheck2`
  - Description: `"จัดการบิลค่าห้อง, ค่าเน็ต, สตรีมมิ่ง, เงินเดือน"`
  - Link button: `"จัดการรายการประจำ"` -> `/dashboard/recurring`.

---

## 5. Quality Verification & Acceptance Criteria

### 5.1 Test Plan (`tests/milestone5_recurring.test.mjs`)

An automated test suite executed via `npm test` covering:
1. **Date Math - Daily**:
   - Advances +1 day across month boundaries.
2. **Date Math - Weekly**:
   - Advances +7 days.
   - Correctly matches specified `dayOfWeek` (0-6).
3. **Date Math - Monthly & End-of-Month Clamping**:
   - Jan 31 -> Feb 28 (non-leap year 2026/2027).
   - Jan 31 -> Feb 29 (leap year 2028).
   - Feb 28 -> Mar 31 when target `day_of_month` is 31.
   - Mar 31 -> Apr 30 (30-day month).
   - Apr 30 -> May 31 when target `day_of_month` is 31.
   - Day 30 in Jan -> Feb 28/29.
4. **Date Math - Yearly & Leap Year Clamping**:
   - 2026-05-15 -> 2027-05-15.
   - 2028-02-29 (leap day) -> 2029-02-28 (clamped in non-leap year).
5. **Thai Frequency Text Formatter**:
   - Formats `daily`, `weekly`, `monthly`, `yearly` into Thai descriptions with day numbers and day names.
6. **Monthly Equivalent Math**:
   - Calculates correct monthly approximations for daily (*30), weekly (*52/12), monthly (*1), yearly (/12).
7. **Input Validation**:
   - Rejects amount <= 0.
   - Rejects missing bucket on expense schedules.
   - Validates day_of_month between 1 and 31.
   - Validates day_of_week between 0 and 6.
   - Validates end_date >= start_date.

### 5.2 Build Verification
- Run `npm test` -> 100% pass (both Milestone 4 and Milestone 5 tests).
- Run `npm run build` -> 0 errors, 0 type errors.
- Verified compliant with Production Baseline rules (RLS, atomic RPC, no secrets leak).

---

## 6. Implementation Checklist for Subsequent Agents

- [ ] **SQL Migration**: Write `supabase/schema_recurring.sql` containing `recurring_schedules` table, RLS policies, indexes, and `process_due_recurring_transactions` RPC.
- [ ] **Helper Utilities**: Create `src/utils/recurringHelper.ts` with `calculateNextRunDate`, Thai formatting, and commitment math.
- [ ] **Server Actions**: Add `createRecurringSchedule`, `updateRecurringSchedule`, `deleteRecurringSchedule`, `toggleRecurringActive`, and `checkAndProcessRecurringAction` in `src/app/dashboard/actions.ts`.
- [ ] **UI Recurring Page**: Implement `src/app/dashboard/recurring/page.tsx` and modal component with full CRUD and toggle support.
- [ ] **Dashboard Integration**: Add recurring summary card and lazy evaluation trigger to `src/app/dashboard/page.tsx`.
- [ ] **Settings Integration**: Add recurring menu link to `src/app/dashboard/settings/page.tsx`.
- [ ] **Automated Tests**: Implement `tests/milestone5_recurring.test.mjs` and execute `npm test`.
- [ ] **Build Validation**: Run `npm run build` and ensure zero errors.
