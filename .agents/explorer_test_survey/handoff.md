# Handoff Report: Explorer Test Survey
**Task**: Survey test runner, schemas, date edge cases, and design test suite for Milestone 5: Recurring Transactions  
**Target Path**: [report.md](file:///c:/แอพรายรับรายจ่าย/.agents/explorer_test_survey/report.md)  
**Type**: Hard Handoff (Task Complete)

---

## 1. Observation
- **Test Runner & Scripts**:
  - In [package.json](file:///c:/แอพรายรับรายจ่าย/package.json) line 10: `"test": "node --test tests/*.test.mjs"`.
  - Node.js runtime is `v24.18.0` (verified via `node -v`).
  - Executed `npm test`:
    ```text
    > smart-pocket@0.1.0 test
    > node --test tests/*.test.mjs
    ...
    ℹ tests 10
    ℹ suites 5
    ℹ pass 10
    ℹ fail 0
    ℹ duration_ms 1082.2124
    ```
  - Executed `npm run build`:
    ```text
    ▲ Next.js 16.3.5 (Turbopack)
    ✓ Compiled successfully in 1406ms
    ✓ Generating static pages using 15 workers (13/13) in 3.1s
    ```
    Build succeeded with 0 errors.
- **Existing Tests**:
  - [tests/milestone4.test.mjs](file:///c:/แอพรายรับรายจ่าย/tests/milestone4.test.mjs) uses `import { test, describe } from 'node:test'` and `import assert from 'node:assert/strict'`. All tests are pure unit and contract tests running in <1.1s.
  - Node 24 natively imports TypeScript files (`import('./src/utils/exportExcel.ts')` succeeded and exported `generateExcelWorkbook`).
  - Path aliases such as `@/...` are not resolved by Node's native module loader without custom subpath mapping, so tests must import from relative paths (`../src/utils/recurringHelper.ts`).
- **Database Schema**:
  - Existing SQL schemas in [supabase/](file:///c:/แอพรายรับรายจ่าย/supabase/): `schema.sql`, `schema_budget.sql`, `schema_receiver.sql`, `schema_trash.sql`.
  - Tables: `profiles`, `buckets`, `transactions`, `allocations`.
  - Stored RPC `process_expense` updates `buckets.balance = balance - p_amount`.
  - Requirements in [ORIGINAL_REQUEST.md](file:///c:/แอพรายรับรายจ่าย/ORIGINAL_REQUEST.md) require `recurring_schedules` table and atomic RPC `process_due_recurring_transactions(p_user_id UUID)` in `supabase/schema_recurring.sql`.

---

## 2. Logic Chain
1. *From Observation 1 (`package.json` test script & Node 24 runtime)*: The test runner is configured to automatically discover and execute any file matching `tests/*.test.mjs`. Creating `tests/milestone5_recurring.test.mjs` will immediately be picked up by `npm test` without altering `package.json`.
2. *From Observation 2 (`milestone4.test.mjs` structure & Node 24 ESM TS support)*: Tests should be authored as ES Modules (`.mjs`) importing `{ test, describe } from 'node:test'` and `assert from 'node:assert/strict'`. Functions in `src/utils/recurringHelper.ts` should be pure functions and imported via relative paths (`../src/utils/recurringHelper.ts`) to avoid Next.js alias resolution issues in Node runner.
3. *From Observation 3 (financial date arithmetic & PostgreSQL schema)*: Monthly recurring schedules have a critical edge case: when a bill is set to day 31, February clamps to 28 (or 29 in leap years) and 30-day months clamp to 30. However, subsequent 31-day months (e.g. March after February) must restore the anchor day 31. This anchor clamping algorithm must be verified with comprehensive unit tests and mirrored in the PostgreSQL RPC.
4. *From Observations 1–3 and Rule 5 (Testing Culture)*: A 4-Tier test suite is required to cover:
   - Tier 1: Pure math & date scheduling (`calculateNextRunDate` across daily, weekly, monthly, yearly, edge cases).
   - Tier 2: Input validation & sanitization (amount, frequency enum, day bounds, date range).
   - Tier 3: RPC contract simulation (expense balance deduction with negative allowance, income allocation across buckets, lazy runner idempotency, auto-deactivation on end date).
   - Tier 4: UI presentation math (monthly commitments equivalent, status badge resolver, Thai notifications).

---

## 3. Caveats
- The live Supabase database instance is external and requires environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) to run end-to-end integration tests. Therefore, Tier 3 tests in `milestone5_recurring.test.mjs` simulate the state transition contract locally in Node.js rather than issuing live SQL queries, ensuring tests execute quickly and reliably in offline/CI environments.
- Timezone handling: Dates should be handled using UTC/local consistent ISO strings (`YYYY-MM-DD`) to avoid off-by-one day errors across different client timezones.
- No other caveats.

---

## 4. Conclusion
The testing and schema architecture for Milestone 5 (Recurring Transactions) is fully surveyed and specified. The test suite will reside in `tests/milestone5_recurring.test.mjs`, executable via standard `npm test`. Detailed test cases, edge case calculations, schema definitions, and implementation guidelines have been documented in [report.md](file:///c:/แอพรายรับรายจ่าย/.agents/explorer_test_survey/report.md).

---

## 5. Verification Method
1. **Verify Report**: Inspect [report.md](file:///c:/แอพรายรับรายจ่าย/.agents/explorer_test_survey/report.md) for complete 4-tier test case matrix and schema specifications.
2. **Verify Baseline Test Suite**:
   ```powershell
   npm test
   ```
   Must pass all 10 tests in `tests/milestone4.test.mjs` with 0 failures.
3. **Verify Baseline Build**:
   ```powershell
   npm run build
   ```
   Must compile cleanly with 0 TypeScript/Next.js errors.
4. **Invalidation Condition**: If `npm test` fails to match `tests/milestone5_recurring.test.mjs` or Node 24 fails to import `../src/utils/recurringHelper.ts`, this survey's import strategy must be re-evaluated.
