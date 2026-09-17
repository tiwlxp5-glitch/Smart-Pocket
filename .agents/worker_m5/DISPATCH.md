## 2026-09-17T14:51:52Z
You are worker_m5 for Milestone 5: Recurring Transactions.
Your working directory is: c:\แอพรายรับรายจ่าย\.agents\worker_m5
Authoritative request file: c:\แอพรายรับรายจ่าย\ORIGINAL_REQUEST.md
Project blueprint file: c:\แอพรายรับรายจ่าย\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context and Resources:
Please thoroughly read:
- c:\แอพรายรับรายจ่าย\ORIGINAL_REQUEST.md
- c:\แอพรายรับรายจ่าย\PROJECT.md
- c:\แอพรายรับรายจ่าย\.agents\spec_miner_survey\report.md (Contains complete SQL schema, RPC function, helper logic, and edge cases)
- c:\แอพรายรับรายจ่าย\.agents\explorer_arch_survey\report.md (Contains codebase architecture, UI patterns, and action signatures)
- c:\แอพรายรับรายจ่าย\.agents\explorer_test_survey\report.md (Contains test architecture, ESM import notes, and test cases)

Your Assigned Tasks:
1. Create `supabase/schema_recurring.sql`:
   - Table `recurring_schedules` with UUID pk, user_id fk, type, bucket_id fk, amount (>0), category, note, frequency (daily, weekly, monthly, yearly), day_of_month (1-31), day_of_week (0-6), start_date, end_date, next_run_date, last_run_date, is_active, auto_process, timestamps, updated_at trigger.
   - Complete RLS policies for SELECT, INSERT, UPDATE, DELETE for auth.uid() = user_id.
   - Atomic PostgreSQL RPC `process_due_recurring_transactions(p_user_id UUID)` with `FOR UPDATE` row lock, negative bucket balance allowance for expenses, auto percentage distribution into allocations for incomes, multi-cycle catch-up loop, and next_run_date advancement.
2. Create `src/utils/recurringHelper.ts`:
   - `calculateNextRunDate(currentDate, frequency, dayOfMonth, dayOfWeek)` supporting daily, weekly, monthly with end-of-month day clamping (e.g. 31st into Feb 28/29, Apr 30 while preserving anchor day), yearly with leap year clamping.
   - `formatFrequencyThai(frequency, dayOfMonth, dayOfWeek)`.
   - `calculateMonthlyCommitment(schedules)`.
3. Update types in `src/types/database.ts` (or `src/types/index.ts`) for `RecurringSchedule` and `RecurringFrequency`.
4. Update `src/app/dashboard/actions.ts`:
   - `createRecurringSchedule(formData: FormData)`
   - `updateRecurringSchedule(id: string, formData: FormData)`
   - `deleteRecurringSchedule(id: string)`
   - `toggleRecurringActive(id: string, isActive: boolean)`
   - `checkAndProcessRecurringAction()` (lazy runner calling RPC with graceful fallback)
5. Create `src/app/dashboard/recurring/page.tsx`:
   - Monthly commitments summary card (total monthly expense, total monthly income, net commitment).
   - Filter tabs / list of recurring items with frequency badge, active toggle switch, edit/delete buttons.
   - Modal / Drawer form to create and edit schedules with dynamic inputs based on frequency.
6. Update `src/app/dashboard/page.tsx`:
   - Trigger lazy evaluation runner on page load.
   - Display a notification banner when recurring transactions were auto-processed.
   - Display a shortcut card linking to `/dashboard/recurring`.
7. Update `src/app/dashboard/settings/page.tsx`:
   - Add a navigation card/link to `/dashboard/recurring`.
8. Create `tests/milestone5_recurring.test.mjs`:
   - Test suite for `calculateNextRunDate` across daily, weekly, monthly (including Feb 28/29, April 30, 31st anchor preservation), yearly (leap years).
   - Test suite for `formatFrequencyThai` and `calculateMonthlyCommitment`.
   - Import helper using relative path (`../src/utils/recurringHelper.ts`).
9. Run Verification:
   - Run `npm test` using run_command to verify all tests pass 100%.
   - Run `npm run build` using run_command to verify 0 errors, 0 type errors.
10. Write your comprehensive completion report in `c:\แอพรายรับรายจ่าย\.agents\worker_m5\handoff.md` and send a completion message with results summary to parent.
