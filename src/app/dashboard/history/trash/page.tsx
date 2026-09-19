import { createClient } from '@/utils/supabase/server'
import { Trash2, ArrowDownCircle, ArrowUpCircle, ArchiveRestore, ChevronLeft, Info } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { restoreFromTrash } from '../../trash-actions'
import { RestoreHistoryButton } from './RestoreHistoryButton'

interface TrashItem {
  id: string
  type: string
  amount: number
  note: string | null
  transaction_date: string
  deleted_at: string
  buckets?: { name?: string } | { name?: string }[] | null
}

export default async function TrashPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ดึงข้อมูลที่ถูกลบไปแล้ว (deleted_at IS NOT NULL)
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id, type, amount, note, transaction_date, deleted_at,
      buckets ( name )
    `)
    .eq('user_id', user?.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  return (
    <main className="p-6 pb-24 min-h-screen bg-rose-50">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/history" className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600">
          <ChevronLeft size={24} />
        </Link>
        <div className="flex items-center gap-2 text-rose-600">
          <Trash2 size={24} />
          <h1 className="text-xl font-bold">ถังขยะ</h1>
        </div>
      </header>

      <div className="bg-rose-100 text-rose-700 p-4 rounded-2xl mb-6 flex items-start gap-3 text-sm">
        <Info size={20} className="shrink-0 mt-0.5" />
        <p>
          รายการในถังขยะจะถูก <b>ลบทิ้งถาวรโดยอัตโนมัติเมื่อครบ 3 วัน</b><br/>
          (เมื่อกู้คืน ยอดเงินจะถูกคำนวณกลับเข้ากระเป๋าให้ใหม่)
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {!transactions || transactions.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-2xl shadow-sm border border-gray-100">
            <Trash2 size={40} className="mx-auto mb-3 opacity-20" />
            <p>ถังขยะว่างเปล่า</p>
          </div>
        ) : (
          (transactions as unknown as TrashItem[]).map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100 flex flex-col gap-3 opacity-75 hover:opacity-100 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 grayscale ${
                    item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {item.type === 'income' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 line-through decoration-gray-300">{item.note || (item.type === 'income' ? 'รับเงิน' : 'จ่ายเงิน')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-rose-500 font-medium">
                        ลบเมื่อ {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true, locale: th })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right grayscale">
                  <p className={`font-bold text-lg line-through decoration-gray-300 ${
                    item.type === 'income' ? 'text-emerald-600' : 'text-gray-900'
                  }`}>
                    {item.type === 'income' ? '+' : '-'}฿{Number(item.amount).toLocaleString('th-TH')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-gray-50 mt-1">
                <RestoreHistoryButton id={item.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
