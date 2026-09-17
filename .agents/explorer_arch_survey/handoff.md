# Handoff Report: Architecture Survey for Milestone 5

## 1. Observation
- **Dashboard Layout**: In [`src/app/dashboard/layout.tsx`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/src/app/dashboard/layout.tsx) lines 10-15, authentication is verified server-side with `await supabase.auth.getUser()`, and unauthorized requests are redirected to `/login`. The container wraps content in `max-w-md mx-auto bg-white min-h-screen shadow-sm pb-20` and renders [`src/components/BottomNav.tsx`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/src/components/BottomNav.tsx).
- **Bottom Navigation**: Contains 5 items (Dashboard, Income, Expense, Analytics, History). It should remain at 5 tabs for mobile ergonomics.
- **Server Actions**: In [`src/app/dashboard/actions.ts`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/src/app/dashboard/actions.ts), mutations execute with `'use server'`, use `createClient()` from `@/utils/supabase/server`, verify user presence, and call `revalidatePath('/dashboard', 'layout')`.
- **Database Functions**: Atomic operations like `process_expense`, `move_to_trash`, and `restore_from_trash` run via PostgreSQL stored procedures with `SECURITY DEFINER`.
- **Date Utilities**: `date-fns` 4.4.0 is available in `package.json`.
- **Automated Tests**: Current test suite `tests/milestone4.test.mjs` executes via `node --test tests/*.test.mjs` (`npm test`) and passes 100% (10 tests, 0 failed). `npm run build` succeeds with 0 TypeScript or lint errors.

## 2. Logic Chain
1. *From* the requirement of recurring transactions across 4 frequencies without external cron servers,
   *We deduce* a Lazy Evaluation Runner pattern executed upon opening the application (e.g. on `/dashboard` load) guarantees transactions are processed on or after their due dates.
2. *From* the financial consistency requirement (Rule 6: atomic DB operations for quota/financial math),
   *We deduce* the runner must invoke an atomic PostgreSQL RPC (`process_due_recurring_transactions`) that simultaneously inserts the transaction, updates bucket balances, creates allocations (for income), and advances `next_run_date`.
3. *From* calendar variations (month lengths 28, 29, 30, 31 and leap years),
   *We deduce* `calculateNextRunDate` in `src/utils/recurringHelper.ts` must use day-clipping (`Math.min(targetDay, daysInMonth)`) to prevent unintended month hopping.
4. *From* UI navigation standards,
   *We deduce* linking `/dashboard/recurring` from both a Dashboard quick-action card and Settings menu maintains high discoverability without cluttering the 5-tab BottomNav.

## 3. Caveats
- Direct Supabase CLI push requires an active database network connection or pre-configured credentials in `.env.local`. The SQL script must be saved to `supabase/schema_recurring.sql` so it can be executed both via CLI and through the Supabase web dashboard.
- Users inactive for several months could accumulate multiple pending cycles. The RPC should handle advancing dates predictably or capping single-run iterations to ensure fast page loads.

## 4. Conclusion
Milestone 5 architecture is completely defined, with concrete file integration targets:
1. `supabase/schema_recurring.sql` for table, RLS, and atomic RPC.
2. `src/utils/recurringHelper.ts` for scheduling calculations, boundary clipping, and Thai text formatting.
3. `src/app/dashboard/actions.ts` for server actions (CRUD + lazy runner trigger).
4. `src/app/dashboard/recurring/page.tsx` for full recurring management UI.
5. `src/app/dashboard/page.tsx` for lazy execution runner on page load and shortcut card with notification banner.
6. `src/app/dashboard/settings/page.tsx` for recurring settings menu link.
7. `tests/milestone5_recurring.test.mjs` for automated verification.

## 5. Verification Method
- Execute `npm test` to verify zero regressions on existing tests.
- Execute `npm run build` to confirm TypeScript type compliance and compilation.
- Inspect [`c:\แอพรายรับรายจ่าย\.agents\explorer_arch_survey\report.md`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/.agents/explorer_arch_survey/report.md) for full architectural mapping.
