import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { PieChart } from 'lucide-react'
import { AnalyticsView, TransactionItem, BucketItem } from './AnalyticsView'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ดึงรายการธุรกรรมทั้งหมดที่ไม่ถูกลบ
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id,
      type,
      amount,
      note,
      receiver,
      transaction_date,
      bucket_id,
      buckets (
        id,
        name,
        color,
        icon
      )
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })

  // ดึงรายชื่อกระเป๋าเงิน
  const { data: buckets } = await supabase
    .from('buckets')
    .select('id, name, color, icon, balance')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return (
    <main className="p-6 pb-28 min-h-screen bg-gray-50">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <PieChart size={22} />
            </div>
            <h1 className="text-2xl font-black text-gray-900">วิเคราะห์การเงิน</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            สถิติกระแสเงินสดและสัดส่วนการใช้จ่ายอัจฉริยะ
          </p>
        </div>
      </header>

      <AnalyticsView
        initialTransactions={(transactions as unknown as TransactionItem[]) || []}
        buckets={(buckets as unknown as BucketItem[]) || []}
      />
    </main>
  )
}
