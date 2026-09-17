import { createClient } from '@/utils/supabase/server'
import { Wallet, ShieldCheck, TrendingUp, Coffee, LogOut } from 'lucide-react'

// Dummy fallback data if DB is empty or not connected
const fallbackBuckets = [
  { id: '1', name: 'เงินสำรองฉุกเฉิน', icon: 'shield', color: '#F59E0B', balance: 15000, target_amount: 50000, allocation_percentage: 20 },
  { id: '2', name: 'เงินลงทุน', icon: 'trending-up', color: '#10B981', balance: 8000, allocation_percentage: 30 },
  { id: '3', name: 'เงินใช้ชีวิต', icon: 'coffee', color: '#3B82F6', balance: 12500, allocation_percentage: 50 },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch from DB (will fail gracefully to fallback if no DB connection)
  let { data: buckets } = await supabase.from('buckets').select('*').order('created_at')
  
  if (!buckets || buckets.length === 0) {
    buckets = fallbackBuckets
  }

  const totalBalance = buckets.reduce((sum, b) => sum + (Number(b.balance) || 0), 0)

  return (
    <main className="p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <p className="text-sm text-gray-500">สวัสดี,</p>
          <h2 className="text-xl font-bold text-gray-900">{user?.user_metadata?.full_name || user?.email || 'Guest'}</h2>
        </div>
        <form action="/auth/signout" method="post">
          <button className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
            <LogOut size={20} />
          </button>
        </form>
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

      <h3 className="font-bold text-gray-900 mb-4 text-lg">กระเป๋าเงินของคุณ</h3>
      
      <div className="flex flex-col gap-4">
        {buckets.map((bucket) => {
          // Choose icon mapping
          const Icon = bucket.icon === 'shield' ? ShieldCheck : bucket.icon === 'trending-up' ? TrendingUp : Coffee

          return (
            <div key={bucket.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: bucket.color || '#3B82F6' }}
              >
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-semibold text-gray-900">{bucket.name}</h4>
                  <span className="font-bold text-gray-900">฿{Number(bucket.balance).toLocaleString('th-TH')}</span>
                </div>
                {bucket.target_amount ? (
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
