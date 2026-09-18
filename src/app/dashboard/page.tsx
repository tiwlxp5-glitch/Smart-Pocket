import { createClient } from '@/utils/supabase/server'
import { ShieldCheck, TrendingUp, Coffee, Settings, PieChart, ChevronRight, AlertTriangle, Wallet as WalletIcon, Repeat, Sparkles, ArrowRightLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { calculateMonthlyCommitment } from '@/utils/recurringHelper'
import { WalletCard } from '@/components/WalletCard'
import { DashboardWalletDeleteButton } from '@/components/DashboardWalletDeleteButton'
import { BANK_PRESETS } from '@/utils/walletHelper'
import OpenAIAdvisorButton from './_components/OpenAIAdvisorButton'


// Dummy fallback data if DB is empty or not connected
const fallbackBuckets = [
  { id: '1', name: 'เงินสำรองฉุกเฉิน', icon: 'shield', color: '#F59E0B', balance: 15000, target_amount: 50000, monthly_budget: null, allocation_percentage: 20 },
  { id: '2', name: 'เงินลงทุน', icon: 'trending-up', color: '#10B981', balance: 8000, monthly_budget: null, allocation_percentage: 30 },
  { id: '3', name: 'เงินใช้ชีวิต', icon: 'coffee', color: '#3B82F6', balance: 12500, monthly_budget: 15000, allocation_percentage: 50 },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Lazy Evaluation Runner: Trigger due recurring transactions
  let autoProcessedResult: { processed_count: number; total_expense: number; total_income: number } | null = null
  if (user) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('process_due_recurring_transactions', {
        p_user_id: user.id
      })
      if (!rpcError && rpcData && Number(rpcData.processed_count) > 0) {
        autoProcessedResult = rpcData
      }
    } catch (err) {
      console.warn('Dashboard recurring lazy runner warning:', err)
    }
  }

  // 2. Fetch Recurring summary
  const { data: recurringData } = user ? await supabase
    .from('recurring_schedules')
    .select('amount, frequency, type, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true) : { data: null }

  const recurringCommitment = calculateMonthlyCommitment((recurringData || []) as any)
  
  // Fetch from DB (will fail gracefully to fallback if no DB connection)
  let { data: buckets } = await supabase.from('buckets').select('*').order('created_at')
  
  if (!buckets || buckets.length === 0) {
    buckets = fallbackBuckets
  }

  // ดึงรายการสรุปประจำเดือนนี้
  const now = new Date()
  const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  
  const { data: monthTransactions } = user ? await supabase
    .from('transactions')
    .select('type, amount, bucket_id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('transaction_date', startOfMonthStr) : { data: null }

  let monthIncome = 0
  let monthExpense = 0
  const bucketMonthlyExpenses: Record<string, number> = {}

  if (monthTransactions) {
    monthTransactions.forEach((tx) => {
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

  // Fetch Wallets
  let { data: wallets } = user ? await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true }) : { data: null }

  // Fallback default wallet for display if not populated
  if (!wallets || wallets.length === 0) {
    wallets = [
      {
        id: 'default-w',
        user_id: user?.id || '',
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
      } as any
    ]
  }

  const totalBalance = (wallets && wallets.length > 0)
    ? wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0)
    : buckets.reduce((sum, b) => sum + (Number(b.balance) || 0), 0)

  // คำนวณการแจ้งเตือนงบประมาณรายเดือน (Budget Alerts >= 80%)
  const budgetAlerts = buckets
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

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest'

  return (
    <main className="p-6 pb-28 max-w-md mx-auto">
      {/* Top Header with Profile & Settings */}
      <header className="flex justify-between items-center mb-6">
        <Link href="/dashboard/settings" className="flex items-center gap-3 hover:opacity-85 transition group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:ring-2 group-hover:ring-blue-400 group-hover:ring-offset-2 transition">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500">สวัสดีครับ,</p>
              <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.2 rounded-md">ตั้งค่า</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition truncate max-w-[190px]">
              {displayName}
            </h2>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <OpenAIAdvisorButton />
          <Link 
            href="/dashboard/settings"
            className="p-2.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 shadow-2xs transition"
            title="ตั้งค่าบัญชีและงบประมาณ"
          >
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {/* Auto-processed Recurring Notification Banner */}
      {autoProcessedResult && Number(autoProcessedResult.processed_count) > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 text-emerald-900 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={18} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-emerald-900">
              ตัดรอบบิลประจำอัตโนมัติเรียบร้อย ({autoProcessedResult.processed_count} รายการ)
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              {Number(autoProcessedResult.total_expense) > 0 && `รายจ่าย -฿${Number(autoProcessedResult.total_expense).toLocaleString('th-TH')} `}
              {Number(autoProcessedResult.total_income) > 0 && `รายรับ +฿${Number(autoProcessedResult.total_income).toLocaleString('th-TH')}`}
            </p>
            <div className="flex gap-3 mt-2">
              <Link href="/dashboard/recurring" className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950">
                ดูรายการประจำ
              </Link>
              <Link href="/dashboard/history" className="text-xs font-semibold text-emerald-700 hover:underline">
                ดูประวัติการเงิน
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-blue-500/15 rounded-full blur-xl pointer-events-none" />
        <div className="flex justify-between items-center mb-1">
          <p className="text-blue-200 text-xs font-medium">ยอดเงินรวมทุกบัญชี</p>
          <Link href="/dashboard/wallets" className="text-[11px] text-blue-300 hover:text-white font-semibold flex items-center gap-0.5">
            ดู {wallets.length} บัญชี <ChevronRight size={13} />
          </Link>
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4 text-white">
          ฿{totalBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <div className="flex items-center gap-2">
          <Link 
            href="/dashboard/transfer" 
            className="flex-1 py-2 px-3 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition text-white shadow-2xs"
          >
            <ArrowRightLeft size={14} /> โอนเงิน
          </Link>
          <Link 
            href="/dashboard/wallets" 
            className="flex-1 py-2 px-3 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition text-white shadow-2xs"
          >
            <WalletIcon size={14} /> จัดการกระเป๋า
          </Link>
        </div>
      </div>

      {/* Wallets Horizontal Carousel */}
      <div className="mb-7">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5">
            <WalletIcon size={16} className="text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">กระเป๋าและบัญชี</h3>
          </div>
          <Link href="/dashboard/wallets" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
            ทั้งหมด <ChevronRight size={13} />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2 snap-x">
          {wallets.map((w) => (
            <div key={w.id} className="min-w-[210px] max-w-[230px] snap-start shrink-0 relative group">
              <WalletCard wallet={w} />
              {!w.is_default && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DashboardWalletDeleteButton walletId={w.id} walletName={w.name} />
                </div>
              )}
            </div>
          ))}
          <Link
            href="/dashboard/wallets"
            className="min-w-[120px] rounded-3xl border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50/60 hover:bg-blue-50/40 flex flex-col items-center justify-center p-4 text-center transition group snap-start shrink-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200 text-gray-400 group-hover:text-blue-600 group-hover:border-blue-300 flex items-center justify-center mb-1.5 shadow-2xs transition">
              <Plus size={18} />
            </div>
            <span className="text-[11px] font-bold text-gray-600 group-hover:text-blue-600">เพิ่มกระเป๋า</span>
          </Link>
        </div>
      </div>

      {/* Budget Limit Alerts Card */}
      {budgetAlerts.length > 0 && (
        <div className="bg-white border border-rose-100 rounded-3xl p-5 shadow-xs mb-8 overflow-hidden relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>แจ้งเตือนงบประมาณรายเดือน</span>
            </div>
            <Link href="/dashboard/settings" className="text-xs text-blue-600 font-semibold hover:underline">
              ตั้งค่างบ
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {budgetAlerts.map((alert) => (
              <div 
                key={alert.bucket.id}
                className={`p-3 rounded-2xl border flex flex-col gap-1.5 ${
                  alert.isOver 
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">{alert.bucket.name}</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    alert.isOver ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                  }`}>
                    {alert.isOver ? `เกินงบ (${alert.ratio}%)` : `ใกล้แตะงบ (${alert.ratio}%)`}
                  </span>
                </div>
                <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      alert.isOver ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(alert.ratio, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] opacity-80">
                  <span>จ่ายไปแล้ว ฿{alert.spent.toLocaleString('th-TH')}</span>
                  <span>เพดานงบ ฿{alert.limit.toLocaleString('th-TH')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Analytics Card */}
      <Link 
        href="/dashboard/analytics"
        className="block bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-8 hover:shadow-md hover:border-blue-200 transition group"
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
            <PieChart size={18} />
            <span>สถิติการเงินเดือนนี้</span>
          </div>
          <span className="text-xs text-blue-600 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
            ดูกราฟวิเคราะห์ <ChevronRight size={14} />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl">
          <div>
            <p className="text-[10px] text-gray-500">รับเข้าเดือนนี้</p>
            <p className="text-sm font-bold text-emerald-600">+฿{monthIncome.toLocaleString('th-TH')}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">จ่ายออกเดือนนี้</p>
            <p className="text-sm font-bold text-rose-600">-฿{monthExpense.toLocaleString('th-TH')}</p>
          </div>
        </div>
      </Link>

      {/* Recurring Transactions Shortcut Card */}
      <Link 
        href="/dashboard/recurring"
        className="block bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-8 hover:shadow-md hover:border-indigo-200 transition group"
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
            <Repeat size={18} />
            <span>รายการประจำ (Recurring)</span>
          </div>
          <span className="text-xs text-indigo-600 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
            จัดการรอบบิล <ChevronRight size={14} />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
          <div>
            <p className="text-[10px] text-gray-500">เปิดใช้งานอยู่</p>
            <p className="text-sm font-bold text-indigo-900">{recurringCommitment.activeCount} รายการ</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">ภาระจ่ายประจำ/เดือน</p>
            <p className="text-sm font-bold text-rose-600">~฿{recurringCommitment.totalExpense.toLocaleString('th-TH')}</p>
          </div>
        </div>
      </Link>

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900 text-lg">ถังงบประมาณ (Envelopes)</h3>
        <Link href="/dashboard/settings" className="text-xs text-blue-600 font-semibold hover:underline">
          ตั้งค่างบ
        </Link>
      </div>
      
      <div className="flex flex-col gap-4">
        {buckets.filter(b => b.default_wallet_id && wallets.some(w => w.id === b.default_wallet_id)).map((bucket) => {
          // Choose icon mapping
          const Icon = bucket.icon === 'shield' ? ShieldCheck : bucket.icon === 'trending-up' ? TrendingUp : bucket.icon === 'wallet' ? WalletIcon : Coffee
          const spentThisMonth = bucketMonthlyExpenses[bucket.id] || 0
          const monthlyBudget = bucket.monthly_budget ? Number(bucket.monthly_budget) : null
          const hasBudget = monthlyBudget !== null && monthlyBudget > 0
          const budgetPercent = hasBudget ? Math.round((spentThisMonth / monthlyBudget) * 100) : 0

          const linkedWallet = wallets.find(w => w.id === bucket.default_wallet_id)
          const bankPreset = linkedWallet ? BANK_PRESETS.find(p => p.code === linkedWallet.bank_name) : null

          return (
            <div key={bucket.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: bankPreset?.color || bucket.color || '#3B82F6' }}
              >
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex flex-col">
                    <h4 className="font-semibold text-gray-900">{bucket.name}</h4>
                    {linkedWallet && (
                      <span className="text-[10px] text-gray-500 font-medium">
                        บัญชี: {bankPreset ? bankPreset.name.split(' (')[0] : linkedWallet.name}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900">฿{Number(bucket.balance).toLocaleString('th-TH')}</span>
                </div>
                {hasBudget ? (
                  <div className="mt-1.5">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                      <span>งบเดือนนี้: ฿{spentThisMonth.toLocaleString('th-TH')} / ฿{monthlyBudget.toLocaleString('th-TH')}</span>
                      <span className={`font-semibold ${
                        budgetPercent >= 100 
                          ? 'text-rose-600' 
                          : budgetPercent >= 80 
                          ? 'text-amber-600' 
                          : 'text-emerald-600'
                      }`}>
                        {budgetPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          budgetPercent >= 100 
                            ? 'bg-rose-500' 
                            : budgetPercent >= 80 
                            ? 'bg-amber-500' 
                            : 'bg-emerald-500'
                        }`} 
                        style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : bucket.target_amount ? (
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                    <div 
                      className="h-1.5 rounded-full" 
                      style={{ 
                        backgroundColor: bucket.color || '#3B82F6', 
                        width: `${Math.min((Number(bucket.balance) / Number(bucket.target_amount)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">เป้าหมายแบ่งเงิน: {bucket.allocation_percentage}%</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      
    </main>
  )
}
