# Milestone 5 Architecture Survey Report: Recurring Transactions

## 1. Executive Summary
This architecture survey report establishes the blueprint for implementing **Milestone 5: Recurring Transactions (ระบบรายการประจำอัตโนมัติ)** for **Smart Pocket**. 

The system enables users to automate routine financial entries (such as room rent, subscription fees, mobile/internet bills, and salary income) across 4 frequencies (**Daily, Weekly, Monthly, Yearly**) with:
- Zero external cron dependencies (powered by a **Lazy Evaluation Runner** executed upon app opening).
- Atomic database execution using a **PostgreSQL RPC** with strict Row Level Security (RLS).
- Mathematical resilience for calendar edge cases (month-end clipping, leap years).
- Seamless integration with existing Dashboard, Settings, and Transaction History features.

---

## 2. Existing Codebase Architecture Survey

### 2.1 Technology Stack & Version Matrix
- **Framework**: Next.js 16.3.5 (App Router, Turbopack enabled)
- **Runtime & Language**: React 19.2.8, TypeScript 5, Node.js
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`, `tailwindcss`)
- **Icons**: Lucide React (`lucide-react`)
- **Date Utilities**: `date-fns` 4.4.0
- **Database & Auth**: Supabase PostgreSQL with `@supabase/ssr` (0.12.7) and `@supabase/supabase-js` (2.116.0)
- **Testing**: Native Node.js Test Runner (`node --test tests/*.test.mjs`)

### 2.2 Dashboard Layout & Navigation
- **File**: [`src/app/dashboard/layout.tsx`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/src/app/dashboard/layout.tsx)
  - Enforces server-side authentication using `supabase.auth.getUser()`. Redirects unauthenticated requests to `/login`.
  - Wraps pages with a mobile-first responsive viewport container: `max-w-md mx-auto bg-white min-h-screen shadow-sm pb-20`.
  - Integrates [`src/components/BottomNav.tsx`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/src/components/BottomNav.tsx) fixed at bottom with 5 primary tabs (หน้าแรก `/dashboard`, รับเงิน `/dashboard/income`, จ่ายเงิน `/dashboard/expense`, สถิติ `/dashboard/analytics`, ประวัติ `/dashboard/history`).
  - **Milestone 5 Impact**: BottomNav maintains 5 tabs to preserve mobile ergonomic balance. Navigation to Recurring Transactions is exposed via a prominent dashboard widget card and Settings menu.

### 2.3 Server Actions Architecture
- **File**: [`src/app/dashboard/actions.ts`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/src/app/dashboard/actions.ts)
  - Marked with `'use server'` directive.
  - Pattern: Creates server client via `await createClient()`, retrieves authenticated user, validates inputs, and executes operations.
  - Cache Revalidation: Uses `revalidatePath('/dashboard', 'layout')` or page-specific paths after state mutation.
  - Existing Actions:
    - `addExpense(formData: FormData)` -> Invokes RPC `process_expense`.
    - `addIncome(formData: FormData)` -> Inserts transaction and executes bucket allocation loop.
    - `moveToTrash(transactionId: string)` & `restoreFromTrash(transactionId: string)` -> Invokes RPCs.
    - `updateUserProfile`, `updateUserPassword`, `updateBucketBudget`.
  - **Milestone 5 Requirements**: Add CRUD actions for `recurring_schedules` and `checkAndProcessRecurringAction()`.

### 2.4 Database Schema & RPC Architecture
- **Existing Schema Files**:
  - [`supabase/schema.sql`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/supabase/schema.sql): Profiles, Buckets, Transactions, Allocations, `process_expense` RPC.
  - [`supabase/schema_trash.sql`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/supabase/schema_trash.sql): Soft delete & 3-day lazy cleanup.
  - [`supabase/schema_budget.sql`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/supabase/schema_budget.sql): Monthly budget limits on buckets.
  - [`supabase/schema_receiver.sql`](file:///c:/%E0%B9%81%E0%B8%AD%E0%B8%9E%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2/supabase/schema_receiver.sql): Payee/Receiver support.
- **Milestone 5 File**: `supabase/schema_recurring.sql` to house `recurring_schedules` table, RLS policies, and `process_due_recurring_transactions` RPC.

---

## 3. Milestone 5 Architectural Integration Points

| Component | Target File | Type | Architectural Responsibility |
|---|---|---|---|
| **Database Schema & RPC** | `supabase/schema_recurring.sql` | SQL | Defines `recurring_schedules` table, RLS policies, triggers, and `process_due_recurring_transactions` atomic RPC. |
| **Calculation Engine** | `src/utils/recurringHelper.ts` | TypeScript Helper | Date math (`calculateNextRunDate`), calendar boundary clipping, Thai localized labels, commitment math. |
| **Server Actions** | `src/app/dashboard/actions.ts` | Server Actions | CRUD for recurring items and `checkAndProcessRecurringAction` for lazy evaluation runner. |
| **Management Page** | `src/app/dashboard/recurring/page.tsx` | Next.js Page | UI for managing recurring items, monthly commitment overview, schedule list, and creation modal. |
| **Dashboard Integration** | `src/app/dashboard/page.tsx` | Next.js Page | Lazy evaluation invocation on load, notification banner for processed items, and quick shortcut card. |
| **Settings Navigation** | `src/app/dashboard/settings/page.tsx` | Next.js Page | Settings menu link to `/dashboard/recurring`. |
| **Automated Tests** | `tests/milestone5_recurring.test.mjs` | Node.js Test | Automated tests proving date math, leap year/month-end handling, frequency parsing, and commitment math. |

---

## 4. Deep-Dive Design Specifications

### 4.1 Database Table Specification: `recurring_schedules`
```sql
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL, -- 'income' or 'expense'
  bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  category TEXT DEFAULT 'bill',
  note TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE DEFAULT NULL,
  next_run_date DATE NOT NULL,
  last_run_date DATE DEFAULT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  auto_process BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Backward compatibility reference in transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL;
```

### 4.2 Atomic RPC: `process_due_recurring_transactions`
The function executes inside an atomic transaction:
1. Filters schedules where:
   - `user_id = p_user_id`
   - `is_active = true`
   - `auto_process = true`
   - `next_run_date <= CURRENT_DATE`
   - `(end_date IS NULL OR next_run_date <= end_date)`
2. For each due schedule:
   - **Expense**: Deducts bucket balance (permits negative balance to preserve financial history integrity) and creates an expense record in `transactions`.
   - **Income**: Creates income record in `transactions`, calculates percentage distribution across all user buckets, updates bucket balances, and creates audit records in `allocations`.
   - Advances `next_run_date` using the frequency rule.
   - If `end_date` is reached (`next_run_date > end_date`), automatically sets `is_active = false`.
   - Sets `last_run_date = CURRENT_DATE`.
3. Returns JSON metadata: `{ "processed_count": N, "processed_ids": [...] }`.

### 4.3 Scheduling & Date Calculation Rules (`src/utils/recurringHelper.ts`)
Handling date boundaries requires explicit algorithms to avoid month-skipping bugs:
1. **Daily**:
   - `currentDate + 1 day`.
2. **Weekly**:
   - `currentDate + 7 days` (or next target `day_of_week` 0-6 where 0=Sunday).
3. **Monthly (Crucial Edge Case)**:
   - When configured with `dayOfMonth = 31`:
     - Jan 31 -> Feb 28 (or Feb 29 in leap year).
     - Feb 28 -> Mar 31 (retains target day 31!).
     - Mar 31 -> Apr 30.
   - Algorithm:
     ```ts
     const nextMonth = addMonths(currentDate, 1);
     const maxDaysInNextMonth = getDaysInMonth(nextMonth);
     const safeDay = Math.min(targetDayOfMonth, maxDaysInNextMonth);
     return setDate(nextMonth, safeDay);
     ```
4. **Yearly (Leap Year Edge Case)**:
   - When configured on Feb 29 (leap year), next non-leap year resolves to Feb 28.

### 4.4 Monthly Commitments KPI Calculation
To provide users with visibility into fixed financial obligations:
- Daily: `amount * 30` (or `amount * (365 / 12)`)
- Weekly: `amount * (52 / 12)` (~4.33 weeks/month)
- Monthly: `amount * 1`
- Yearly: `amount / 12`
Summary Card on `/dashboard/recurring` displays:
- **ยอดจ่ายประจำรายเดือน (Monthly Expense Commitment)**
- **ยอดรับประจำรายเดือน (Monthly Income Commitment)**
- **ภาระสุทธิต่อเดือน (Net Monthly Commitment)**

### 4.5 User Interface Specifications
1. **`/dashboard/recurring`**:
   - Clean, mobile-optimized card layout matching the app's standard design.
   - Header with back button to `/dashboard` and "+ สร้างรายการประจำ" modal trigger.
   - Commitment KPI Card with gradient/neutral background.
   - Bill list items with active/inactive toggle switch, frequency badge, next billing date, bucket name, amount, edit, and delete options.
   - Responsive modal/drawer supporting both income and expense schedules with conditional inputs for frequency parameters.
2. **`/dashboard` Integration**:
   - Lazy runner invocation on server component load (`DashboardPage`).
   - Notification banner at the top if any recurring transactions were processed:
     *"🔄 บันทึกรายการประจำอัตโนมัติแล้ว X รายการ"* with quick dismiss or link to view.
   - Dedicated shortcut widget: *"รายการประจำ (Recurring Bills)"* showing active count and total monthly commitment.
3. **`/dashboard/settings` Integration**:
   - Navigation row with `Repeat` / `Clock` icon: *"จัดการรายการประจำ (Recurring)"*.

---

## 5. Risk Assessment & Engineering Mitigations

1. **Risk: Repeated execution on multiple page refreshes.**
   - *Mitigation*: The RPC strictly filters `next_run_date <= CURRENT_DATE`. Once processed, `next_run_date` is immediately advanced to the next cycle in the same atomic transaction. Subsequent calls on the same day find 0 due items.
2. **Risk: Infinite loop on catch-up if user is absent for multiple months.**
   - *Mitigation*: The runner advances in single-step cycles or applies a loop cap (e.g. max 12 iterations per schedule) to guarantee fast request times.
3. **Risk: Date-fns / Timezone drift across UTC and local dates.**
   - *Mitigation*: Store dates consistently as `DATE` (`YYYY-MM-DD`) or normalize comparison with `CURRENT_DATE` in PostgreSQL.

---

## 6. Verification & Quality Gates
1. **Automated Unit Tests**:
   - File: `tests/milestone5_recurring.test.mjs`
   - Command: `npm test`
   - Gate: 100% pass across Milestone 4 and Milestone 5 tests.
2. **Type Safety & Build Integrity**:
   - Command: `npm run build`
   - Gate: 0 TypeScript errors, 0 compilation errors.
3. **Production Standards**:
   - Adherence to Rule 6 (atomic DB calculations, strict RLS) and Rule 16 (clickable markdown file links).
