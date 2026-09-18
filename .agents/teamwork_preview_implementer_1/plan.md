# Plan: Fix Perceived UI Delay ("กดไม่ติด" / Unresponsiveness)

## 1. Problem Understanding & Analysis
Users experience perceived UI lag or "กดไม่ติด" (unresponsive clicks) across:
- Navigation (`<Link>` clicks, `BottomNav`, header buttons, cards navigating to pages)
- `router.push` transitions (e.g. QuickActionModal, form redirection, back buttons)
- Form submissions (Income, Expense, Transfer, Recurring, Login, Signup, Settings, Wallets, Trash restore/delete)
- Route transitions where Next.js 16 fetches dynamic server component data without immediate visual feedback

## 2. Audit Scope
1. **Global Navigation & Route Transitions**:
   - Verify `NextTopLoader` functionality in Next.js 16 App Router. Why might it not show or feel sluggish?
   - Check z-index, styles, and whether `NextTopLoader` responds to programmatic `router.push` or next/link.
   - Audit `BottomNav.tsx` for active feedback, touch feedback, and pending transitions.
   - Audit `template.tsx` and route transitions.
2. **Form Submissions & Buttons**:
   - `app/login/page.tsx`
   - `app/signup/page.tsx`
   - `app/dashboard/income/page.tsx`
   - `app/dashboard/expense/page.tsx`
   - `app/dashboard/transfer/TransferFormClient.tsx`
   - `app/dashboard/recurring/page.tsx`
   - `app/dashboard/settings/page.tsx`
   - `app/dashboard/wallets/WalletsClientManager.tsx`
   - `app/dashboard/history/page.tsx` & `app/dashboard/history/trash/page.tsx`
   - `components/QuickActionModal.tsx`
3. **Buttons & Clickable Elements**:
   - Check if buttons lack `disabled={loading}` or immediate visual feedback (spinner, opacity change, active state).
   - Check if `router.push` uses `useTransition` / `startTransition` with `isPending` state where appropriate.
   - Check if buttons give tactile/visual feedback immediately upon mousedown/touchstart.

## 3. Implementation Steps
1. Audit each interactive file identified above.
2. Implement immediate loading/pending visual feedback on all buttons and form submissions.
3. Ensure global loading bar / top loader responds immediately on any route change.
4. Verify build (`npm run build`) and test suite (`npm test`).
5. Verify edge cases (double clicks, aborted requests, fast back/forward navigation).
6. Generate handoff and report back to parent.
