import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('UI Responsiveness & Transition Feedback Verification Suite', async (t) => {
  const rootDir = process.cwd()

  await t.test('1. NavigationProgress Component & Custom Event Contracts', () => {
    const navProgressPath = path.join(rootDir, 'src', 'components', 'NavigationProgress.tsx')
    assert.ok(fs.existsSync(navProgressPath), 'NavigationProgress.tsx must exist')

    const navProgressContent = fs.readFileSync(navProgressPath, 'utf8')
    assert.ok(navProgressContent.includes('startNavigationProgress'), 'Must export startNavigationProgress')
    assert.ok(navProgressContent.includes('finishNavigationProgress'), 'Must export finishNavigationProgress')
    assert.ok(navProgressContent.includes('smartpocket:nav:start'), 'Must listen to smartpocket:nav:start event')
    assert.ok(navProgressContent.includes('z-[99999]'), 'Must have high z-index to stay visible above modals/navs')
    assert.ok(!navProgressContent.includes('pushState=(...n)=>(a.done()'), 'Must NOT prematurely finish on pushState')
  })

  await t.test('2. Layout Integration Verification', () => {
    const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx')
    const layoutContent = fs.readFileSync(layoutPath, 'utf8')

    assert.ok(layoutContent.includes('NavigationProgress'), 'Root layout must integrate NavigationProgress')
    assert.ok(layoutContent.includes('Suspense'), 'NavigationProgress must be wrapped in Suspense for useSearchParams safety')
    assert.ok(!layoutContent.includes('NextTopLoader'), 'Deprecated nextjs-toploader must be removed')
  })

  await t.test('3. Authentication Forms Pending Feedback Verification', () => {
    const submitBtnPath = path.join(rootDir, 'src', 'components', 'SubmitButton.tsx')
    assert.ok(fs.existsSync(submitBtnPath), 'SubmitButton.tsx must exist')

    const submitBtnContent = fs.readFileSync(submitBtnPath, 'utf8')
    assert.ok(submitBtnContent.includes('useFormStatus'), 'SubmitButton must use useFormStatus for reactive pending detection')
    assert.ok(submitBtnContent.includes('animate-spin'), 'SubmitButton must display spinning loader when pending')
    assert.ok(submitBtnContent.includes('disabled={pending'), 'SubmitButton must disable during submission to prevent multi-clicks')

    const loginPath = path.join(rootDir, 'src', 'app', 'login', 'page.tsx')
    const loginContent = fs.readFileSync(loginPath, 'utf8')
    assert.ok(loginContent.includes('SubmitButton'), 'Login page must use SubmitButton')
    assert.ok(loginContent.includes('กำลังเข้าสู่ระบบ...'), 'Login page must provide Thai pending feedback')

    const signupPath = path.join(rootDir, 'src', 'app', 'signup', 'page.tsx')
    const signupContent = fs.readFileSync(signupPath, 'utf8')
    assert.ok(signupContent.includes('SubmitButton'), 'Signup page must use SubmitButton')
    assert.ok(signupContent.includes('กำลังสมัครสมาชิก...'), 'Signup page must provide Thai pending feedback')
  })

  await t.test('4. History & Trash Actions Pending State Verification', () => {
    const deleteBtnPath = path.join(rootDir, 'src', 'app', 'dashboard', 'history', 'DeleteHistoryButton.tsx')
    assert.ok(fs.existsSync(deleteBtnPath), 'DeleteHistoryButton.tsx must exist')
    const deleteBtnContent = fs.readFileSync(deleteBtnPath, 'utf8')
    assert.ok(deleteBtnContent.includes('useTransition'), 'DeleteHistoryButton must use useTransition')
    assert.ok(deleteBtnContent.includes('disabled={isPending}'), 'DeleteHistoryButton must disable while pending')
    assert.ok(deleteBtnContent.includes('กำลังลบ...'), 'DeleteHistoryButton must show loading text')

    const restoreBtnPath = path.join(rootDir, 'src', 'app', 'dashboard', 'history', 'trash', 'RestoreHistoryButton.tsx')
    assert.ok(fs.existsSync(restoreBtnPath), 'RestoreHistoryButton.tsx must exist')
    const restoreBtnContent = fs.readFileSync(restoreBtnPath, 'utf8')
    assert.ok(restoreBtnContent.includes('useTransition'), 'RestoreHistoryButton must use useTransition')
    assert.ok(restoreBtnContent.includes('disabled={isPending}'), 'RestoreHistoryButton must disable while pending')
    assert.ok(restoreBtnContent.includes('กำลังกู้คืน...'), 'RestoreHistoryButton must show loading text')
  })

  await t.test('5. BottomNav & QuickActionModal Immediate Feedback Verification', () => {
    const bottomNavPath = path.join(rootDir, 'src', 'components', 'BottomNav.tsx')
    const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8')
    assert.ok(bottomNavContent.includes('pendingHref'), 'BottomNav must track pending tab transition')
    assert.ok(bottomNavContent.includes('isPending'), 'BottomNav must calculate isPending state')
    assert.ok(bottomNavContent.includes('animate-pulse'), 'BottomNav must pulse on pending navigation')
    assert.ok(bottomNavContent.includes('setIsModalOpen(false)'), 'BottomNav must auto-dismiss modal on pathname transition')

    const quickModalPath = path.join(rootDir, 'src', 'components', 'QuickActionModal.tsx')
    const quickModalContent = fs.readFileSync(quickModalPath, 'utf8')
    assert.ok(quickModalContent.includes('navigatingHref'), 'QuickActionModal must track navigating state')
    assert.ok(quickModalContent.includes('startNavigationProgress'), 'QuickActionModal must start navigation progress')
    assert.ok(quickModalContent.includes('กำลังเปิด...'), 'QuickActionModal must show feedback text when clicked')
  })

  await t.test('6. HistoryFilter Immediate Tab Switching Verification', () => {
    const filterPath = path.join(rootDir, 'src', 'app', 'dashboard', 'history', 'HistoryFilter.tsx')
    const filterContent = fs.readFileSync(filterPath, 'utf8')
    assert.ok(filterContent.includes('pendingType'), 'HistoryFilter must track pendingType')
    assert.ok(filterContent.includes('pendingWallet'), 'HistoryFilter must track pendingWallet')
    assert.ok(filterContent.includes('activeType'), 'HistoryFilter must compute activeType with 0ms latency')
    assert.ok(filterContent.includes('activeWallet'), 'HistoryFilter must compute activeWallet with 0ms latency')
  })

  await t.test('7. Wallets & Settings Pending States Verification', () => {
    const walletsPath = path.join(rootDir, 'src', 'app', 'dashboard', 'wallets', 'WalletsClientManager.tsx')
    const walletsContent = fs.readFileSync(walletsPath, 'utf8')
    assert.ok(walletsContent.includes('deletingWalletId'), 'WalletsClientManager must track deletingWalletId')
    assert.ok(walletsContent.includes('disabled={deletingWalletId === wallet.id}'), 'Delete button must disable while deleting')

    const settingsPath = path.join(rootDir, 'src', 'app', 'dashboard', 'settings', 'page.tsx')
    const settingsContent = fs.readFileSync(settingsPath, 'utf8')
    assert.ok(settingsContent.includes('isSigningOut'), 'Settings page must track isSigningOut')
    assert.ok(settingsContent.includes('กำลังออกจากระบบ...'), 'Signout button must show loading text')
  })

  await t.test('8. NavigationProgress Same-URL Guard & Timer Coordination', () => {
    const navProgressPath = path.join(rootDir, 'src', 'components', 'NavigationProgress.tsx')
    const navProgressContent = fs.readFileSync(navProgressPath, 'utf8')

    // Must ignore same-URL navigation to prevent 8-10 second stuck progress bar
    assert.ok(
      navProgressContent.includes('url.pathname === currentUrl.pathname && url.search === currentUrl.search'),
      'NavigationProgress must guard against exact same pathname and query navigation'
    )
    assert.ok(
      navProgressContent.includes('clearAllTimers'),
      'NavigationProgress must cleanly abort lingering timers on new navigations'
    )
  })

  await t.test('9. Expense & Income Submit Isolation vs Initial Load State', () => {
    const expensePath = path.join(rootDir, 'src', 'app', 'dashboard', 'expense', 'page.tsx')
    const expenseContent = fs.readFileSync(expensePath, 'utf8')

    assert.ok(expenseContent.includes('isSubmitting'), 'ExpensePage must have distinct isSubmitting state')
    assert.ok(
      expenseContent.includes('{isSubmitting ?') || expenseContent.includes('isSubmitting ? ('),
      'Expense submit button must bind pending feedback to isSubmitting, NOT isLoading'
    )

    const incomePath = path.join(rootDir, 'src', 'app', 'dashboard', 'income', 'page.tsx')
    const incomeContent = fs.readFileSync(incomePath, 'utf8')
    assert.ok(
      !incomeContent.includes('กำลังจัดสรรเงิน...'),
      'IncomePage must not show misleading "กำลังจัดสรรเงิน..." during initial data load'
    )
  })

  await t.test('10. Transition Buttons Error Resilience (try/catch)', () => {
    const deleteHistoryPath = path.join(rootDir, 'src', 'app', 'dashboard', 'history', 'DeleteHistoryButton.tsx')
    const deleteHistoryContent = fs.readFileSync(deleteHistoryPath, 'utf8')
    assert.ok(deleteHistoryContent.includes('try {') && deleteHistoryContent.includes('catch'), 'DeleteHistoryButton must wrap moveToTrash in try/catch')

    const restoreHistoryPath = path.join(rootDir, 'src', 'app', 'dashboard', 'history', 'trash', 'RestoreHistoryButton.tsx')
    const restoreHistoryContent = fs.readFileSync(restoreHistoryPath, 'utf8')
    assert.ok(restoreHistoryContent.includes('try {') && restoreHistoryContent.includes('catch'), 'RestoreHistoryButton must wrap restoreFromTrash in try/catch')

    const walletDeletePath = path.join(rootDir, 'src', 'components', 'DashboardWalletDeleteButton.tsx')
    const walletDeleteContent = fs.readFileSync(walletDeletePath, 'utf8')
    assert.ok(walletDeleteContent.includes('try {') && walletDeleteContent.includes('catch'), 'DashboardWalletDeleteButton must wrap deleteWallet in try/catch')
  })

  await t.test('11. QuickActionModal Timer Lifecycle & Ghost Dismissal Guard', () => {
    const quickModalPath = path.join(rootDir, 'src', 'components', 'QuickActionModal.tsx')
    const quickModalContent = fs.readFileSync(quickModalPath, 'utf8')

    assert.ok(quickModalContent.includes('fallbackTimerRef'), 'Must track fallback timer in a ref')
    assert.ok(quickModalContent.includes('clearFallbackTimer'), 'Must cleanly cancel fallback timer')
    assert.ok(quickModalContent.includes('disabled={Boolean(navigatingHref)}'), 'Action cards must be disabled while navigating')
  })

  await t.test('12. Recurring Schedules Concurrency Protection & Error Resilience', () => {
    const recurringPath = path.join(rootDir, 'src', 'app', 'dashboard', 'recurring', 'page.tsx')
    const recurringContent = fs.readFileSync(recurringPath, 'utf8')

    assert.ok(recurringContent.includes('togglingId'), 'Recurring page must track togglingId to prevent concurrent toggle race conditions')
    assert.ok(recurringContent.includes('disabled={togglingId === schedule.id}'), 'Toggle button must disable while toggle is in flight')
    assert.ok(recurringContent.includes('finally {\n      setTogglingId(null)'), 'togglingId must always reset in finally block')
    assert.ok(recurringContent.includes('finally {\n      setDeletingId(null)'), 'deletingId must always reset in finally block')
    assert.ok(recurringContent.includes('finally {\n      setFormSubmitting(false)'), 'formSubmitting must always reset in finally block')
  })

  await t.test('13. Form Submissions Error Resilience & Finally Blocks', () => {
    const walletsPath = path.join(rootDir, 'src', 'app', 'dashboard', 'wallets', 'WalletsClientManager.tsx')
    const walletsContent = fs.readFileSync(walletsPath, 'utf8')
    assert.ok(walletsContent.includes('finally {\n      setIsSubmitting(false)'), 'WalletsClientManager must guarantee isSubmitting reset in finally')

    const transferPath = path.join(rootDir, 'src', 'app', 'dashboard', 'transfer', 'TransferFormClient.tsx')
    const transferContent = fs.readFileSync(transferPath, 'utf8')
    assert.ok(transferContent.includes('finally {\n      setIsSubmitting(false)'), 'TransferFormClient must guarantee isSubmitting reset in finally')

    const expensePath = path.join(rootDir, 'src', 'app', 'dashboard', 'expense', 'page.tsx')
    const expenseContent = fs.readFileSync(expensePath, 'utf8')
    assert.ok(expenseContent.includes('try {\n        let finalSlipUrl'), 'Expense page must wrap slip storage upload inside try block to prevent freezing')
  })

  await t.test('14. Tactile Feedback (active:scale) Verification', () => {
    const settingsPath = path.join(rootDir, 'src', 'app', 'dashboard', 'settings', 'page.tsx')
    const settingsContent = fs.readFileSync(settingsPath, 'utf8')
    assert.ok(settingsContent.includes('active:scale-[0.98]'), 'Settings page submit buttons must have tactile feedback')

    const analyticsPath = path.join(rootDir, 'src', 'app', 'dashboard', 'analytics', 'AnalyticsView.tsx')
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8')
    assert.ok(analyticsContent.includes('active:scale-95'), 'AnalyticsView period buttons must have tactile feedback')
  })
})
