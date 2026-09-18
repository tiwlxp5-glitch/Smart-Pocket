# Progress: Fix Perceived UI Delay ("กดไม่ติด" / Unresponsiveness)

- [x] Initial survey and baseline tests passing (`npm test` 104/104, `npm run build` ok)
- [x] Root Cause Analysis:
  - `nextjs-toploader` prematurely calls `a.done()` on `pushState` at the very start of Next.js App Router navigation, before the RSC payload is retrieved.
  - Programmatic navigations (`router.push`) lacked navigation progress triggers.
  - `BottomNav`, `QuickActionModal`, `HistoryFilter`, `Delete/Restore` buttons, `login/signup` submit buttons lacked pending/loading states.
- [x] Implemented native, zero-dependency `NavigationProgress.tsx` with high z-index (`z-[99999]`), same-origin link interception, and programmatic `startNavigationProgress()`.
- [x] Replaced `NextTopLoader` in `src/app/layout.tsx` with `<Suspense fallback={null}><NavigationProgress /></Suspense>`.
- [x] Created `SubmitButton.tsx` using `useFormStatus` and integrated into `app/login/page.tsx` and `app/signup/page.tsx`.
- [x] Created `DeleteHistoryButton.tsx` and `RestoreHistoryButton.tsx` with `useTransition` and `Loader2` spinners.
- [x] Implemented instant pending highlight on `BottomNav.tsx` (`pendingHref`) and tactile feedback.
- [x] Implemented click spinner and progress trigger on `QuickActionModal.tsx`.
- [x] Implemented 0ms optimistic tab highlight on `HistoryFilter.tsx`.
- [x] Added loading spinners and disabled states on wallet creation, edit, and deletion in `WalletsClientManager.tsx` and `DashboardWalletDeleteButton.tsx`.
- [x] Added signout loading state in `settings/page.tsx`.
- [x] Added `active:scale-[0.98]` tactile scaling to dashboard shortcut cards and links.
- [x] Created automated test suite `tests/ui_responsiveness.test.mjs` (7 new tests).
- [x] Ran automated verification: `npm test` passed 112/112 tests; `npm run build` completed with 0 errors.
