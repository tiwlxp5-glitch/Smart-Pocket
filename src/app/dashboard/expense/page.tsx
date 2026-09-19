import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ExpenseFormClient from './ExpenseFormClient'
import { Loader2 } from 'lucide-react'
import { getStartOfMonthBkk } from '@/utils/timezone'

export const maxDuration = 60

export default async function ExpensePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch Wallets
  const { data: walletData } = await supabase
    .from('wallets')
    .select('*')
    .eq('is_archived', false)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  const wallets = walletData || []

  // Fetch Buckets
  const { data: bucketData } = await supabase
    .from('buckets')
    .select('*')
    .eq('is_archived', false)
    .order('created_at')

  let buckets = bucketData || []
  
  if (buckets.length > 0 && wallets.length > 0) {
    // Sort buckets based on their default_wallet_id matching the wallets array order
    buckets = [...buckets].sort((a, b) => {
      const aIndex = wallets.findIndex(w => w.id === a.default_wallet_id)
      const bIndex = wallets.findIndex(w => w.id === b.default_wallet_id)
      const safeAIndex = aIndex >= 0 ? aIndex : 999
      const safeBIndex = bIndex >= 0 ? bIndex : 999
      if (safeAIndex !== safeBIndex) return safeAIndex - safeBIndex
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }

  // Fetch current month expenses per bucket
  const startOfMonthStr = getStartOfMonthBkk()
  
  const { data: txs } = await supabase
    .from('transactions')
    .select('bucket_id, amount')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .is('deleted_at', null)
    .gte('transaction_date', startOfMonthStr)

  const expMap: Record<string, number> = {}
  if (txs) {
    txs.forEach((tx) => {
      if (tx.bucket_id) {
        expMap[tx.bucket_id] = (expMap[tx.bucket_id] || 0) + (Number(tx.amount) || 0)
      }
    })
  }

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-500 gap-3">
        <Loader2 className="animate-spin text-rose-500" size={32} />
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    }>
      <ExpenseFormClient 
        buckets={buckets} 
        wallets={wallets} 
        bucketExpenses={expMap} 
      />
    </Suspense>
  )
}
