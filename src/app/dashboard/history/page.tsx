import { createClient } from '@/utils/supabase/server'
import { ScrollText, ArrowDownCircle, ArrowUpCircle, Trash2, ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { th } from 'date-fns/locale'
import { moveToTrash } from '../actions'
import { ExportModal } from './ExportModal'
import { SlipLightbox } from '@/components/SlipLightbox'

interface HistoryItem {
  id: string
  type: string
  amount: number
  note: string | null
  receiver: string | null
  transaction_date: string
  slip_url: string | null
  wallet_id?: string | null
  to_wallet_id?: string | null
  transfer_fee?: number | null
  buckets?: { name?: string } | { name?: string }[] | null
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ดึงข้อมูลกระเป๋าเงินสำหรับแสดงชื่อ
  const { data: userWallets } = await supabase
    .from('wallets')
    .select('id, name, color, type')
    .eq('user_id', user?.id)

  const walletMap = new Map((userWallets || []).map((w) => [w.id, w]))

  // ดึงข้อมูลจริงจากฐานข้อมูล (เอาเฉพาะที่ยังไม่ถูกลบ)
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id, type, amount, note, receiver, transaction_date, slip_url, wallet_id, to_wallet_id, transfer_fee,
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
            const fromWallet = item.wallet_id ? walletMap.get(item.wallet_id) : null
            const toWallet = item.to_wallet_id ? walletMap.get(item.to_wallet_id) : null
            const isTransfer = item.type === 'transfer'

            return (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isTransfer
                      ? 'bg-blue-100 text-blue-600'
                      : item.type === 'income'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-rose-100 text-rose-600'
                  }`}>
                    {isTransfer ? (
                      <ArrowRightLeft size={20} />
                    ) : item.type === 'income' ? (
                      <ArrowDownCircle size={22} />
                    ) : (
                      <ArrowUpCircle size={22} />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      {isTransfer
                        ? item.note || 'โอนเงินระหว่างบัญชี'
                        : item.note || (item.type === 'income' ? 'รับเงิน' : 'จ่ายเงิน')}
                    </p>

                    {isTransfer ? (
                      <p className="text-xs text-blue-700 font-semibold mt-0.5">
                        {fromWallet?.name || 'บัญชีต้นทาง'} ➔ {toWallet?.name || 'บัญชีปลายทาง'}
                      </p>
                    ) : (
                      item.receiver && <p className="text-xs text-gray-600 mt-0.5">ถึง: {item.receiver}</p>
                    )}

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[11px] text-gray-400">
                        {formatDistanceToNow(new Date(item.transaction_date), { addSuffix: true, locale: th })}
                      </span>

                      {/* Wallet Badge */}
                      {fromWallet && !isTransfer && (
                        <>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                            style={{
                              backgroundColor: `${fromWallet.color || '#10b981'}15`,
                              color: fromWallet.color || '#10b981',
                            }}
                          >
                            {fromWallet.name}
                          </span>
                        </>
                      )}

                      {/* Bucket Badge */}
                      {!isTransfer && (
                        <>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {bucketName || 'จัดสรรแล้ว'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <p className={`font-black text-base ${
                    isTransfer
                      ? 'text-blue-600'
                      : item.type === 'income'
                      ? 'text-emerald-600'
                      : 'text-gray-900'
                  }`}>
                    {isTransfer ? '' : item.type === 'income' ? '+' : '-'}฿{Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {isTransfer && Number(item.transfer_fee) > 0 && (
                    <p className="text-[10px] text-gray-400">
                      ค่าธรรมเนียม ฿{Number(item.transfer_fee).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* ส่วนสลิปและปุ่มลบ */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-1">
                {item.slip_url ? (
                  <SlipLightbox slipUrl={item.slip_url} />
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
