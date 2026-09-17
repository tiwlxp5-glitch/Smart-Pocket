# Handoff Report: Milestone 5 Specification Mining

**Agent**: `spec_miner_survey`  
**Working Directory**: `c:\แอพรายรับรายจ่าย\.agents\spec_miner_survey`  
**Target File**: `c:\แอพรายรับรายจ่าย\.agents\spec_miner_survey\report.md`  
**Date**: 2026-09-17  
**Type**: Hard Handoff (Task Complete)

---

## 1. Observation

1. **User Request & Requirements**:
   - `ORIGINAL_REQUEST.md`: Contains the authoritative specifications for Milestone 5: Recurring Transactions with R1 (Database & RPC), R2 (Date & Scheduling calculation logic), R3 (Server actions & lazy evaluation runner), R4 (UI components & navigation), and Acceptance Criteria.
2. **Existing Database Schemas**:
   - `supabase/schema.sql`: Contains `profiles`, `buckets`, `transactions`, and `allocations` tables. `transactions.type` is defined as `transaction_type ENUM ('income', 'expense', 'transfer')`.
   - `supabase/schema_receiver.sql`: Added `receiver TEXT` to `transactions`.
   - `supabase/schema_trash.sql`: Added `deleted_at TIMESTAMPTZ` and RPC `move_to_trash` / `restore_from_trash` with 3-day lazy cleanup.
   - `supabase/schema_budget.sql`: Added `monthly_budget NUMERIC(15,2)` to `buckets`.
3. **Date Math & Edge Cases**:
   - Node command `node -e "..."` verified that standard JavaScript `setFullYear()` on `2028-02-29` (leap year) rolls over to `2029-03-01` in non-leap years instead of `2029-02-28`. Clamping with `Math.min(day, daysInMonth)` is strictly necessary.
   - Tested month-to-month clamping for day 31: `Jan 31 -> Feb 28 -> Mar 31 -> Apr 30 -> May 31`. Verified that storing `day_of_month: 31` in the database prevents loss of day 31 after passing through short months.
4. **Existing Codebase & Test Suite**:
   - `tests/milestone4.test.mjs` runs via `npm test` (`node --test tests/*.test.mjs`) and passes 10/10 tests in 1.18 seconds.
   - `src/app/dashboard/actions.ts` uses `@/utils/supabase/server` for authenticated server actions.

---

## 2. Logic Chain

1. **Database & RPC Design (R1)**:
   - To guarantee data integrity and prevent race conditions when multiple client tabs load the app, the lazy runner execution must be performed inside an atomic PostgreSQL RPC (`process_due_recurring_transactions`) using `FOR UPDATE` row locks.
   - For recurring expenses, requirement R1 states "ยอมให้ยอดติดลบได้เพื่อความสมบูรณ์ของประวัติบัญชี" (allow negative balance), meaning the RPC must directly deduct without throwing an insufficient funds error.
   - For recurring income, the RPC must dynamically fetch the user's buckets and insert records into `allocations` proportional to `allocation_percentage`, mirroring the behavior in `addIncome`.
   - To guard against IDOR vulnerabilities, the RPC enforces `auth.uid() = p_user_id`.
2. **Scheduling & Date Algorithm (R2)**:
   - Standard date increments fail on month-end edge cases (e.g. adding 1 month to Jan 31 in JS or naive SQL produces March 2nd/3rd or Feb 28 followed by March 28).
   - By retaining `day_of_month` (e.g. 31) and `day_of_week` (0-6) in `recurring_schedules`, `calculateNextRunDate` accurately computes the target date clamped to the last day of short months, then restores the 31st for longer months.
3. **Server Actions & Runner (R3)**:
   - Server Actions in Next.js App Router (`actions.ts`) provide secure, validated mutation endpoints.
   - `checkAndProcessRecurringAction` acts as the lazy evaluation trigger, calling `process_due_recurring_transactions` upon dashboard visit and revalidating dashboard routes if transactions were processed.
4. **UI & Navigation (R4)**:
   - Route `/dashboard/recurring` gives users clear visibility into their monthly commitments and allows full CRUD control over recurring items.
   - Dashboard card and notification banner ensure users are aware of automatically processed transactions.
   - Settings page provides an intuitive path to discover and configure recurring transactions.

---

## 3. Caveats

- Supabase Database currently runs against the user's configured remote or local instance; the SQL script `supabase/schema_recurring.sql` must be pushed or executed via Supabase CLI / migration tool by the implementation team.
- The lazy runner operates whenever an authenticated user accesses the dashboard. If an active schedule is overdue for multiple billing cycles (e.g. user was offline for 3 months), the catch-up loop processes each cycle up to `CURRENT_DATE`, capped at 36 iterations to protect against runaway loops.

---

## 4. Conclusion

The specification for Milestone 5 (Recurring Transactions) is fully mined, verified against the codebase, and documented in:
- `c:\แอพรายรับรายจ่าย\.agents\spec_miner_survey\report.md`

All four core requirements (R1: DB & RPC, R2: Scheduling & Date Math, R3: Server Actions & Lazy Runner, R4: UI & Navigation), alongside edge cases, Thai localization, monthly commitment math, and automated test specifications, are completely detailed and ready for implementation.

---

## 5. Verification Method

To verify the specification findings and foundations:
1. Inspect the full specification report:
   - File: `c:\แอพรายรับรายจ่าย\.agents\spec_miner_survey\report.md`
2. Verify existing test suite baseline:
   - Run: `npm test`
   - Expected output: 10 tests passed (100% pass rate)
3. Verify date clamping behavior in Node:
   - Run: `node -e "console.log(new Date(2026, 1, Math.min(31, new Date(2026, 2, 0).getDate())).toLocaleDateString('en-CA'))"`
   - Expected output: `2026-02-28`
