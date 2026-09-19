export const fallbackBuckets = [
  { id: '1', name: 'เงินสำรองฉุกเฉิน', icon: 'shield', color: '#F59E0B', balance: 15000, target_amount: 50000, monthly_budget: null, allocation_percentage: 20 },
  { id: '2', name: 'เงินลงทุน', icon: 'trending-up', color: '#10B981', balance: 8000, monthly_budget: null, allocation_percentage: 30 },
  { id: '3', name: 'เงินใช้ชีวิต', icon: 'coffee', color: '#3B82F6', balance: 12500, monthly_budget: 15000, allocation_percentage: 50 },
]

export function calculateMonthlyTransactionsSummary(transactions: any[] | null) {
  let monthIncome = 0
  let monthExpense = 0
  const bucketMonthlyExpenses: Record<string, number> = {}

  if (transactions) {
    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0
      if (tx.type === 'income') {
        monthIncome += amt
      } else if (tx.type === 'expense') {
        monthExpense += amt
        if (tx.bucket_id) {
          bucketMonthlyExpenses[tx.bucket_id] = (bucketMonthlyExpenses[tx.bucket_id] || 0) + amt
        }
      }
    })
  }

  return { monthIncome, monthExpense, bucketMonthlyExpenses }
}

export function getWalletsWithFallback(wallets: any[] | null, buckets: any[], userId: string) {
  if (!wallets || wallets.length === 0) {
    return [
      {
        id: 'default-w',
        user_id: userId || '',
        name: 'บัญชีหลัก / เงินสด',
        type: 'cash',
        bank_name: 'cash',
        color: '#10b981',
        icon: 'wallet',
        opening_balance: 0,
        balance: buckets.reduce((sum, b) => sum + (Number(b.balance) || 0), 0),
        is_default: true,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }
  return wallets
}

export function calculateTotalBalance(wallets: any[] | null, buckets: any[]) {
  if (wallets && wallets.length > 0) {
    return wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0)
  }
  return buckets.reduce((sum, b) => sum + (Number(b.balance) || 0), 0)
}

export function calculateBudgetAlerts(buckets: any[], bucketMonthlyExpenses: Record<string, number>) {
  return buckets
    .filter((b) => b.monthly_budget && Number(b.monthly_budget) > 0)
    .map((b) => {
      const spent = bucketMonthlyExpenses[b.id] || 0
      const limit = Number(b.monthly_budget)
      const ratio = Math.round((spent / limit) * 100)
      return {
        bucket: b,
        spent,
        limit,
        ratio,
        isOver: ratio >= 100,
      }
    })
    .filter((item) => item.ratio >= 80)
}

export function getDisplayName(user: any) {
  return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest'
}
