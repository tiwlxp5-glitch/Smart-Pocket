import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wallet } from '@/types/database'
import { TransferFormClient } from './TransferFormClient'
import { ArrowLeft, ArrowRightLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TransferPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let { data: wallets } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('is_default', { ascending: false })

  if (!wallets || wallets.length < 2) {
    // If user has fewer than 2 wallets, advise them to add one first
    return (
      <div className="p-4 pb-28">
        <header className="flex items-center gap-2.5 mb-6">
          <Link
            href="/dashboard"
            className="p-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 transition shadow-2xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-black text-gray-900 leading-tight">โอนเงินระหว่างบัญชี</h1>
        </header>

        <div className="p-8 text-center bg-white border border-gray-200 rounded-3xl shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <ArrowRightLeft size={28} />
          </div>
          <h3 className="font-bold text-gray-900 text-base mb-1">ต้องมีอย่างน้อย 2 กระเป๋า/บัญชี</h3>
          <p className="text-xs text-gray-500 mb-5 max-w-xs mx-auto">
            ปัจจุบันคุณมีกระเป๋าเงินเพียงใบเดียว จึงยังไม่สามารถทำรายการโอนเงินระหว่างบัญชีได้ กรุณาเพิ่มกระเป๋าเงินใหม่ก่อนครับ
          </p>
          <Link
            href="/dashboard/wallets"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            + ไปที่หน้าจัดการกระเป๋าเงิน
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-28">
      <header className="flex items-center gap-2.5 mb-5">
        <Link
          href="/dashboard"
          className="p-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 transition shadow-2xs"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-tight">โอนเงินระหว่างบัญชี</h1>
          <p className="text-xs text-gray-500">ย้ายเงินข้ามธนาคาร หรือถอนเงินสดเข้ากระเป๋า</p>
        </div>
      </header>

      <TransferFormClient wallets={wallets} />
    </div>
  )
}
