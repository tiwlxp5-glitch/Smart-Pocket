import { createClient } from '@/utils/supabase/server'
import { ShieldCheck, TrendingUp, Coffee, Settings, PieChart, ChevronRight, AlertTriangle, AlertCircle, Wallet } from 'lucide-react'
import Link from 'next/link'

// Dummy fallback data if DB is empty or not connected
const fallbackBuckets = [
  { id: '1', name: 'เงินสำรองฉุกเฉิน', icon: 'shield', color: '#F59E0B', balance: 15000, target_amount: 50000, monthly_budget: null, allocation_percentage: 20 },
  { id: '2', name: 'เงินลงทุน', icon: 'trending-up', color: '#10B981', balance: 8000, monthly_budget: null, allocation_percentage: 30 },
  { id: '3', name: 'เงินใช้ชีวิต', icon: 'coffee', color: '#3B82F6', balance: 12500, monthly_budget: 15000, allocation_percentage: 50 },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
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

  const totalBalance = buckets.reduce((sum, b) => sum + (Number(b.balance) || 0), 0)

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
        <Link 
          href="/dashboard/settings"
          className="p-2.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 shadow-2xs transition"
          title="ตั้งค่าบัญชีและงบประมาณ"
        >
          <Settings size={20} />
        </Link>
      </header>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-lg mb-8">
        <p className="text-blue-100 text-sm mb-1">ยอดเงินรวมทุกกระเป๋า</p>
        <h1 className="text-4xl font-extrabold tracking-tight mb-6">
          ฿{totalBalance.toLocaleString('th-TH')}
        </h1>
        <div className="flex gap-2">
          <div className="bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur-sm">
            จัดการเงินฉลาด
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur-sm">
            ปลอดภัย 100%
          </div>
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

      <h3 className="font-bold text-gray-900 mb-4 text-lg">กระเป๋าเงินของคุณ</h3>
      
      <div className="flex flex-col gap-4">
        {buckets.map((bucket) => {
          // Choose icon mapping
          const Icon = bucket.icon === 'shield' ? ShieldCheck : bucket.icon === 'trending-up' ? TrendingUp : bucket.icon === 'wallet' ? Wallet : Coffee
          const spentThisMonth = bucketMonthlyExpenses[bucket.id] || 0
          const monthlyBudget = bucket.monthly_budget ? Number(bucket.monthly_budget) : null
          const hasBudget = monthlyBudget !== null && monthlyBudget > 0
          const budgetPercent = hasBudget ? Math.round((spentThisMonth / monthlyBudget) * 100) : 0

          return (
            <div key={bucket.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: bucket.color || '#3B82F6' }}
              >
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-semibold text-gray-900">{bucket.name}</h4>
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
