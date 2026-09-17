# Project: Smart Pocket (แอพรายรับรายจ่าย) — Milestone 5: Recurring Transactions

## Architecture
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Lucide Icons.
- **Data Layer & Auth**: Supabase PostgreSQL with Row Level Security (RLS) and stored procedures (RPC).
- **Core Strategy**: **Lazy Evaluation Runner** triggered when user navigates to the dashboard, processing all due recurring transactions atomically inside PostgreSQL RPC with `FOR UPDATE` locks.
- **Scheduling Calculation**: Pure deterministic date calculation engine (`src/utils/recurringHelper.ts`) handling leap years, variable month lengths (28/29/30/31), and anchor day preservation.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Table `recurring_schedules` | PostgreSQL table with constraints, defaults, indexes, and updated_at trigger | M1 | ORIGINAL_REQUEST § R1 |
| 2 | RLS Security Policies | Row Level Security enforcing `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE | M1 | ORIGINAL_REQUEST § R1 |
| 3 | RPC `process_due_recurring_transactions` | Atomic stored procedure executing due schedules, updating bucket balances, inserting transactions/allocations, and advancing dates | M1 | ORIGINAL_REQUEST § R1 |
| 4 | Negative Bucket Allowance | Allows expense deductions to push bucket balance negative for financial history integrity | M1 | ORIGINAL_REQUEST § R1 |
| 5 | Multi-Bucket Income Allocation | Automatically distributes recurring income across buckets according to `allocation_percentage` | M1 | ORIGINAL_REQUEST § R1 |
| 6 | IDOR & Concurrency Protection | Checks `auth.uid() = p_user_id` inside RPC and acquires `FOR UPDATE` lock on schedules | M1 | Survey findings |
| 7 | `calculateNextRunDate` Utility | Calendar math for Daily, Weekly, Monthly, Yearly with day clamping | M2 | ORIGINAL_REQUEST § R2 |
| 8 | End-of-Month Day Clamping | Handles Jan 31 -> Feb 28/29, Mar 31 -> Apr 30 while preserving original anchor day | M2 | ORIGINAL_REQUEST § R2 |
| 9 | Yearly Leap Year Clamping | Clamps Feb 29 to Feb 28 on non-leap subsequent years | M2 | Survey findings |
| 10 | `formatFrequencyThai` Utility | Formats schedule frequency into clear Thai text for UI display | M2 | ORIGINAL_REQUEST § R2 |
| 11 | `calculateMonthlyCommitment` | Normalizes recurring amounts across frequencies into estimated monthly commitment | M2 | Survey findings |
| 12 | TypeScript Definitions | Type interfaces for `RecurringSchedule`, `FrequencyType`, and RPC responses | M3 | Architecture survey |
| 13 | Server Actions CRUD | `createRecurringSchedule`, `updateRecurringSchedule`, `deleteRecurringSchedule`, `toggleRecurringActive` | M3 | ORIGINAL_REQUEST § R3 |
| 14 | Server Action Lazy Runner | `checkAndProcessRecurringAction` executing RPC on dashboard entry | M3 | ORIGINAL_REQUEST § R3 |
| 15 | `/dashboard/recurring` Management Page | Page showing monthly commitments, schedule list, status badges, and active toggles | M4 | ORIGINAL_REQUEST § R4 |
| 16 | Recurring Schedule Modal / Drawer | Full form to create and edit schedules with dynamic frequency fields | M4 | ORIGINAL_REQUEST § R4 |
| 17 | Dashboard Shortcut & Notification Banner | Dashboard card linking to recurring page and notification alert when bills auto-process | M4 | ORIGINAL_REQUEST § R4 |
| 18 | Settings Page Navigation Link | Menu link in `/dashboard/settings` leading to `/dashboard/recurring` | M4 | ORIGINAL_REQUEST § R4 |
| 19 | Unit Test Suite `tests/milestone5_recurring.test.mjs` | Comprehensive automated tests covering all frequencies, leap years, and edge cases | M5 | ORIGINAL_REQUEST Acceptance |
| 20 | Build & Full Suite Verification | 100% test pass on all test suites and 0 build errors | M5 | ORIGINAL_REQUEST Acceptance |
| 21 | Forensic Integrity Verification | Forensic audit confirming authentic implementation without mock shortcuts or bypasses | M5 | Production Baseline |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Database Schema & Supabase RPC | `supabase/schema_recurring.sql` with table, RLS, indexes, and `process_due_recurring_transactions` RPC | none | PLANNED |
| M2 | Date & Scheduling Engine | `src/utils/recurringHelper.ts` with pure date math, clamping, Thai labels, commitment calculator | none | PLANNED |
| M3 | Server Actions & Type Definitions | `src/types/database.ts` (or `index.ts`), `src/app/dashboard/actions.ts` with CRUD and lazy runner | M1, M2 | PLANNED |
| M4 | UI & Navigation Integration | `src/app/dashboard/recurring/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/settings/page.tsx` | M2, M3 | PLANNED |
| M5 | Test Suite, Build Verification & Integrity Audit | `tests/milestone5_recurring.test.mjs`, `npm test`, `npm run build`, forensic audit clean pass | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### `src/utils/recurringHelper.ts`
```typescript
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringSchedule {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  bucket_id: string | null;
  amount: number;
  category: string;
  note: string | null;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  auto_process: boolean;
  created_at?: string;
  updated_at?: string;
}

export function calculateNextRunDate(
  currentDate: Date | string,
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date;

export function formatFrequencyThai(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): string;

export function calculateMonthlyCommitment(
  schedules: RecurringSchedule[]
): { totalExpense: number; totalIncome: number; netCommitment: number; activeCount: number };
```

### `src/app/dashboard/actions.ts`
```typescript
export async function createRecurringSchedule(formData: FormData): Promise<{ success: boolean; error?: string }>;
export async function updateRecurringSchedule(id: string, formData: FormData): Promise<{ success: boolean; error?: string }>;
export async function deleteRecurringSchedule(id: string): Promise<{ success: boolean; error?: string }>;
export async function toggleRecurringActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }>;
export async function checkAndProcessRecurringAction(): Promise<{
  success: boolean;
  processedCount: number;
  totalExpense: number;
  totalIncome: number;
  error?: string;
}>;
```

## Code Layout
- `supabase/schema_recurring.sql` — New database schema and RPC definition
- `src/utils/recurringHelper.ts` — New date calculation and formatting utility
- `src/types/database.ts` (or `src/types/index.ts`) — Extended types for recurring transactions
- `src/app/dashboard/actions.ts` — Extended server actions for recurring schedule management & execution
- `src/app/dashboard/recurring/page.tsx` — New page for recurring transactions management
- `src/app/dashboard/page.tsx` — Updated dashboard with lazy runner trigger, alert banner, and shortcut card
- `src/app/dashboard/settings/page.tsx` — Updated settings with link to recurring management
- `tests/milestone5_recurring.test.mjs` — New automated unit tests for date calculation and scheduling logic
