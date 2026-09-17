# Milestone 5 Review Report: Recurring Transactions

**Reviewer**: `reviewer_2` (Roles: Reviewer, Adversarial Critic)  
**Working Directory**: `c:\แอพรายรับรายจ่าย\.agents\reviewer_2`  
**Verdict**: **`APPROVE`**  
**Integrity Status**: **CLEAN (No Integrity Violations Detected)**  
**Date**: 2026-09-17T22:04:00+07:00  

---

## 1. Observation

### 1.1 Integrity & Source Code Authenticity
- [`src/utils/recurringHelper.ts`](file:///c:/แอพรายรับรายจ่าย/src/utils/recurringHelper.ts) (Lines 95-151): Implements genuine calendar mathematics for Daily, Weekly, Monthly, and Yearly frequencies. Uses dynamic day-in-month detection via `new Date(nextYear, nextMonth + 1, 0).getDate()` and math clamping `Math.min(targetDay, daysInNextMonth)` rather than hardcoded lookup tables or facade mocks.
- `calculateMonthlyEquivalent` (Lines 195-209) and `calculateMonthlyCommitment` (Lines 214-243): Employs authentic arithmetic normalization (`daily * 30`, `weekly * 52 / 12`, `yearly / 12`).
- No hardcoded test assertions, bypassed workflows, dummy facades, or fake logs exist.

### 1.2 Database Security & Schema Compliance
- [`supabase/schema_recurring.sql`](file:///c:/แอพรายรับรายจ่าย/supabase/schema_recurring.sql):
  - **Table Definition** (Lines 7-26): `recurring_schedules` with foreign key `user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL`, `type transaction_type NOT NULL`, `bucket_id UUID REFERENCES buckets(id)`, `amount NUMERIC(15,2) CHECK (amount > 0)`, `frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'))`, `day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31)`, `day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6)`.
  - **RLS Policies** (Lines 51-72): Row Level Security enabled with 4 strict policies:
    - SELECT: `USING (auth.uid() = user_id)`
    - INSERT: `WITH CHECK (auth.uid() = user_id)`
    - UPDATE: `USING (auth.uid() = user_id)`
    - DELETE: `USING (auth.uid() = user_id)`
  - **IDOR Protection** (Lines 96-99):
    ```sql
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'Permission denied: Cannot process schedules for another user';
    END IF;
    ```
  - **Concurrency & Race Condition Prevention** (Lines 101-110):
    ```sql
    FOR v_rec IN 
      SELECT * FROM recurring_schedules
      WHERE user_id = p_user_id 
        AND is_active = true 
        AND auto_process = true 
        AND next_run_date <= CURRENT_DATE
        AND (end_date IS NULL OR next_run_date <= end_date)
      FOR UPDATE
    LOOP
    ```
  - **Negative Bucket Balance Allowance (R1 Spec)** (Lines 140-144):
    ```sql
    UPDATE buckets 
    SET balance = balance - v_rec.amount,
        updated_at = now()
    WHERE id = v_rec.bucket_id;
    ```
    Allows bucket balance to become negative for accounting integrity without throwing constraint exceptions.
  - **Proportional Income Allocation (R1 Spec)** (Lines 150-182):
    Calculates `v_allocated_amount := ROUND((v_rec.amount * v_bucket.allocation_percentage) / 100.0, 2);`, records each in `allocations`, and increments `buckets.balance` atomically.
  - **Safety Capping** (Line 114): Multi-cycle catch-up capped at `v_iter < 36` to prevent statement timeouts and infinite loops.

### 1.3 Lazy Evaluation Runner Resilience
- [`src/app/dashboard/actions.ts`](file:///c:/แอพรายรับรายจ่าย/src/app/dashboard/actions.ts) (`checkAndProcessRecurringAction`, Lines 390-429):
  - Requires authenticated session (`user.id`).
  - Wrapped in `try...catch` with `console.warn` fallback, returning `{ success: false, ... }` gracefully rather than crashing the caller.
  - Automatically revalidates paths (`/dashboard`, `/dashboard/history`, `/dashboard/analytics`, `/dashboard/recurring`) only when `processedCount > 0`.
- [`src/app/dashboard/page.tsx`](file:///c:/แอพรายรับรายจ่าย/src/app/dashboard/page.tsx) (Lines 17-30):
  - Executes RPC asynchronously during server component render.
  - Gracefully catches exceptions, allowing normal dashboard display even if database migrations are pending or connection fails.
  - Displays auto-process celebratory banner (Lines 125-149) with breakdown of expenses/incomes.

### 1.4 Mobile Responsiveness & Localization
- [`src/app/dashboard/recurring/page.tsx`](file:///c:/แอพรายรับรายจ่าย/src/app/dashboard/recurring/page.tsx):
  - Mobile-first layout within `max-w-md mx-auto p-4 pb-28`.
  - Comprehensive Thai labels: "รายการประจำอัตโนมัติ", "ภาระการเงินประจำเดือน (Monthly Commitments)", "จ่ายออก/เดือน", "รับเข้า/เดือน", "สุทธิ/เดือน", "ถึงกำหนดวันนี้", "รอบถัดไป", "บันทึกและตัดยอดอัตโนมัติ".
  - Modal with dual responsiveness: Bottom sheet drawer on mobile devices (`items-end`), centered dialog on tablet/desktop (`sm:items-center`).
  - Active/Pause toggle switch with optimistic UI update and error rollback.
- [`src/app/dashboard/settings/page.tsx`](file:///c:/แอพรายรับรายจ่าย/src/app/dashboard/settings/page.tsx) (Section 4, Lines 364-385): Direct navigation card to `/dashboard/recurring`.
- [`src/app/dashboard/page.tsx`](file:///c:/แอพรายรับรายจ่าย/src/app/dashboard/page.tsx) (Lines 241-265): Dedicated Recurring shortcut card showing active bill count and monthly commitment.

### 1.5 Independent Command Verification Results
1. **`npm test`**:
   - Command: `node --test tests/*.test.mjs`
   - Test suites executed:
     - `tests/milestone4.test.mjs`: 10 tests PASS.
     - `tests/milestone5_recurring.test.mjs`: 29 tests PASS.
     - `tests/adversarial_m5_recurring.test.mjs`: 27 tests PASS.
     - `tests/milestone5_stress.test.mjs`: 21 tests PASS.
   - **Total Results**: **87 tests passed, 0 failed** in 1.25s.
2. **`npm run build`**:
   - Next.js 16.3.5 (Turbopack)
   - Exit code: 0
   - Static/dynamic route generation: 14 routes generated successfully with 0 TypeScript errors and 0 build warnings.
   - Route `/dashboard/recurring` cleanly emitted as dynamic App Router page (`ƒ /dashboard/recurring`).

---

## 2. Logic Chain

1. **Scheduling Engine Correctness**:
   - *Observation*: Naive calendar math on Jan 31 rolling +1 month spills into March due to February having 28/29 days.
   - *Implementation*: `calculateNextRunDate` clamps target day to the target month's maximum days (`daysInNextMonth`) while retaining the original `dayOfMonth` as the anchor.
   - *Evidence*: Validated across 48 consecutive months in `tests/adversarial_m5_recurring.test.mjs`, sequentially proving Jan 31 -> Feb 28 -> Mar 31 -> Apr 30 -> May 31 without drifting.

2. **Concurrency & Accounting Idempotency**:
   - *Observation*: If a user opens the dashboard across 3 browser tabs simultaneously, 3 lazy runner executions fire concurrently.
   - *Implementation*: `SELECT ... FOR UPDATE` acquires row-level locks on `recurring_schedules`. The first execution advances `next_run_date > CURRENT_DATE`. Subsequent executions unblock, re-evaluate the filter, find 0 due rows, and exit without double-charging or duplicate transactions.
   - *Evidence*: `tests/milestone5_stress.test.mjs` Oracle simulation verified sequential and locked execution guarantees.

3. **Financial Accounting Integrity**:
   - *Observation*: Requirement R1 stipulates allowing bucket balances to go negative for expenses so that user cashflow history remains unbroken.
   - *Implementation*: `buckets` balance deduction does not enforce a floor of 0 in the recurring RPC, while income allocation divides strictly by bucket percentage.
   - *Evidence*: Code inspection of `schema_recurring.sql` (Line 141) and `schema.sql` (Line 28) confirms absence of `balance >= 0` check constraint.

4. **Resilience & Fault Isolation**:
   - *Observation*: If Supabase network connection drops or RPC errors, client pages must not crash.
   - *Implementation*: Server action and dashboard page wrap runner in `try...catch` and return default/fallback state.
   - *Evidence*: Verified in `src/app/dashboard/page.tsx:27` and `src/app/dashboard/actions.ts:425`.

---

## 3. Caveats & Hardening Recommendations

1. **Supabase Function Execution Permissions (Low/Medium Hardening Finding)**:
   - *Observation*: In `schema_recurring.sql`, line 97: `IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN ...`.
   - *Risk Scenario*: If an anonymous caller directly invokes PostgREST `POST /rest/v1/rpc/process_due_recurring_transactions` with an arbitrary UUID, `auth.uid()` is NULL. While it only executes already-scheduled due transactions and cannot alter amounts or steal funds, it is best practice to explicitly restrict anonymous execution.
   - *Recommendation*: Add to `schema_recurring.sql`:
     ```sql
     REVOKE EXECUTE ON FUNCTION process_due_recurring_transactions(UUID) FROM PUBLIC, anon;
     GRANT EXECUTE ON FUNCTION process_due_recurring_transactions(UUID) TO authenticated, service_role;
     ```
2. **Postgres Session Timezone vs Thai Local Time (Minor Hardening Finding)**:
   - *Observation*: `process_due_recurring_transactions` compares `next_run_date <= CURRENT_DATE`. In default Supabase UTC configuration, Thai midnight (00:00 UTC+7) is 17:00 UTC previous day.
   - *Recommendation*: For exact midnight execution in Thailand, use `(now() AT TIME ZONE 'Asia/Bangkok')::date` instead of `CURRENT_DATE`.

---

## 4. Conclusion

The Milestone 5 (Recurring Transactions / ระบบรายการประจำอัตโนมัติ) implementation is **fully compliant**, **architecturally sound**, and **adheres to all Production Baseline requirements**.
- Zero integrity violations detected.
- All 8 acceptance criteria and requirements (R1–R4) satisfied.
- 87/87 automated tests pass (100% pass rate).
- Production build compiles cleanly with 0 errors.

**Verdict: `APPROVE`**

---

## 5. Verification Method

To independently reproduce the verification results:

1. **Run Full Automated Test Suite**:
   ```powershell
   npm test
   ```
   *Expected Output*: 87 tests passing across 25 suites with 0 failures in ~1.2s.

2. **Run Production Build Verification**:
   ```powershell
   npm run build
   ```
   *Expected Output*: Next.js 16 compiles cleanly with exit code 0 and generates `/dashboard/recurring`.

3. **Inspect Core Implementation Files**:
   - Database Schema & RPC: [`supabase/schema_recurring.sql`](file:///c:/แอพรายรับรายจ่าย/supabase/schema_recurring.sql)
   - Date Calculation Engine: [`src/utils/recurringHelper.ts`](file:///c:/แอพรายรับรายจ่าย/src/utils/recurringHelper.ts)
   - Server Actions & Runner: [`src/app/dashboard/actions.ts`](file:///c:/แอพรายรับรายจ่าย/src/app/dashboard/actions.ts)
   - Management UI: [`src/app/dashboard/recurring/page.tsx`](file:///c:/แอพรายรับรายจ่าย/src/app/dashboard/recurring/page.tsx)
   - Dashboard Shortcut & Notification: [`src/app/dashboard/page.tsx`](file:///c:/แอพรายรับรายจ่าย/src/app/dashboard/page.tsx)
   - Settings Link: [`src/app/dashboard/settings/page.tsx`](file:///c:/แอพรายรับรายจ่าย/src/app/dashboard/settings/page.tsx)
