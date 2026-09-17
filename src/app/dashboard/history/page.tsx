import { createClient } from '@/utils/supabase/server'
import { ScrollText, ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { moveToTrash } from '../actions'
import { ExportModal } from './ExportModal'

interface HistoryItem {
  id: string
  type: string
  amount: number
  note: string | null
  receiver: string | null
  transaction_date: string
  slip_url: string | null
  buckets?: { name?: string } | { name?: string }[] | null
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ดึงข้อมูลจริงจากฐานข้อมูล (เอาเฉพาะที่ยังไม่ถูกลบ)
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id, type, amount, note, receiver, transaction_date, slip_url,
      buckets ( name )
    `)
    .eq('user_id', user?.id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })

  return (
    <main className="p-6 pb-24 min-h-screen bg-gray-50">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <ScrollText size={28} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">ประวัติการเงิน</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportModal transactions={(transactions || []) as unknown as HistoryItem[]} />
          <Link href="/dashboard/history/trash" className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full hover:bg-rose-100 transition shadow-2xs">
            <Trash2 size={15} />
            ถังขยะ
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {!transactions || transactions.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <p>ยังไม่มีประวัติการทำรายการ</p>
          </div>
        ) : (
          (transactions as unknown as HistoryItem[]).map((item) => {
            const bucketName = Array.isArray(item.buckets) ? item.buckets[0]?.name : item.buckets?.name
            return (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {item.type === 'income' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.note || (item.type === 'income' ? 'รับเงิน' : 'จ่ายเงิน')}</p>
                    {item.receiver && (
                      <p className="text-sm text-gray-600 mt-0.5">ถึง: {item.receiver}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(item.transaction_date), { addSuffix: true, locale: th })}
                      </span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {bucketName || 'จัดสรรแล้ว'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-bold text-lg ${
                    item.type === 'income' ? 'text-emerald-600' : 'text-gray-900'
                  }`}>
                    {item.type === 'income' ? '+' : '-'}฿{Number(item.amount).toLocaleString('th-TH')}
                  </p>
                </div>
              </div>

              {/* ส่วนสลิปและปุ่มลบ */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-1">
                {item.slip_url ? (
                  <a href={item.slip_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                    ดูรูปสลิป
                  </a>
                ) : (
                  <div></div>
                )}
                
                <form action={async () => {
                  'use server'
                  await moveToTrash(item.id)
                }}>
                  <button type="submit" className="text-xs font-medium text-gray-400 hover:text-rose-500 transition flex items-center gap-1">
                    <Trash2 size={14} />
                    ลบรายการ
                  </button>
                </form>
              </div>
            </div>
          )})
        )}
      </div>
      
      {transactions && transactions.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">สิ้นสุดรายการย้อนหลัง</p>
        </div>
      )}
    </main>
  )
}
