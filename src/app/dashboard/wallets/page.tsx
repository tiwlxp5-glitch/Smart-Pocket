import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wallet } from '@/types/database'
import { WalletCard } from '@/components/WalletCard'
import { calculateNetWorth, BANK_PRESETS } from '@/utils/walletHelper'
import { WalletsClientManager } from './WalletsClientManager'
import { ArrowLeft, ArrowRightLeft, Plus, ShieldAlert, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WalletsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch wallets
  let { data: wallets, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  // Fallback if table doesn't exist yet or user has no wallets
  if (error || !wallets || wallets.length === 0) {
    wallets = [
      {
        id: 'default-fallback',
        user_id: user.id,
        name: 'บัญชีหลัก / เงินสด',
        type: 'cash',
        bank_name: 'cash',
        color: '#10b981',
        icon: 'wallet',
        opening_balance: 0,
        balance: 0,
        is_default: true,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
  }

  const activeWallets = wallets.filter((w) => !w.is_archived)
  const archivedWallets = wallets.filter((w) => w.is_archived)
  const { totalAssets, totalDebts, netWorth } = calculateNetWorth(activeWallets)

  return (
    <div className="p-4 pb-28">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="p-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 transition shadow-2xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-tight">กระเป๋าและบัญชี</h1>
            <p className="text-xs text-gray-500">จัดการกระเป๋าเงิน ธนาคาร และบัตรเครดิต</p>
          </div>
        </div>

        <Link
          href="/dashboard/transfer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          <ArrowRightLeft size={14} /> โอนเงิน
        </Link>
      </header>

      {/* Net Worth Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-300 font-medium">สินทรัพย์สุทธิ (Net Worth)</span>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300 font-semibold">
            {activeWallets.length} บัญชีที่ใช้งาน
          </span>
        </div>
        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-lg text-slate-400 font-light">฿</span>
          <h2 className="text-3xl font-black tracking-tight text-white">
            {netWorth.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/60">
          <div>
            <p className="text-[11px] text-slate-400">สินทรัพย์รวม (Assets)</p>
            <p className="text-sm font-bold text-emerald-400">
              +฿{totalAssets.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">หนี้สิน/ยอดบัตร (Debts)</p>
            <p className="text-sm font-bold text-rose-400">
              -฿{totalDebts.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Wallets Management & Add/Edit Modal */}
      <WalletsClientManager
        initialWallets={activeWallets}
        archivedWallets={archivedWallets}
        bankPresets={BANK_PRESETS}
      />
    </div>
  )
}
