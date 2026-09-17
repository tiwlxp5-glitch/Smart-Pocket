'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  User, 
  KeyRound, 
  Wallet, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  TrendingUp, 
  Coffee,
  Save,
  Mail,
  Repeat,
  ChevronRight
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { updateUserProfile, updateUserPassword, updateBucketSettings } from '../actions'

interface BucketItem {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  balance: number
  monthly_budget?: number | null
  default_wallet_id?: string | null
}

interface WalletItem {
  id: string
  name: string
  bank_name?: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Buckets state
  const [buckets, setBuckets] = useState<BucketItem[]>([])
  const [bucketBudgets, setBucketBudgets] = useState<Record<string, string>>({})
  const [bucketWallets, setBucketWallets] = useState<Record<string, string>>({})
  const [wallets, setWallets] = useState<WalletItem[]>([])
  const [savingBucketId, setSavingBucketId] = useState<string | null>(null)
  const [budgetFeedback, setBudgetFeedback] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        setFullName(user.user_metadata?.full_name || '')

        const [bucketsRes, walletsRes] = await Promise.all([
          supabase.from('buckets').select('*').eq('user_id', user.id).order('created_at'),
          supabase.from('wallets').select('id, name, bank_name').eq('user_id', user.id).eq('is_archived', false).order('name')
        ])

        if (walletsRes.data) {
          setWallets(walletsRes.data)
        }

        if (bucketsRes.data) {
          setBuckets(bucketsRes.data)
          const budgetMap: Record<string, string> = {}
          const walletMap: Record<string, string> = {}
          bucketsRes.data.forEach((b) => {
            budgetMap[b.id] = b.monthly_budget !== null && b.monthly_budget !== undefined ? String(b.monthly_budget) : ''
            walletMap[b.id] = b.default_wallet_id || ''
          })
          setBucketBudgets(budgetMap)
          setBucketWallets(walletMap)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [supabase])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileFeedback(null)

    const formData = new FormData()
    formData.append('full_name', fullName)
    const res = await updateUserProfile(formData)

    if (res.success) {
      setProfileFeedback({ type: 'success', text: res.message || 'บันทึกสำเร็จ' })
      router.refresh()
    } else {
      setProfileFeedback({ type: 'error', text: res.message || 'เกิดข้อผิดพลาด' })
    }
    setProfileSaving(false)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordFeedback(null)

    const formData = new FormData()
    formData.append('password', password)
    formData.append('confirm_password', confirmPassword)
    const res = await updateUserPassword(formData)

    if (res.success) {
      setPasswordFeedback({ type: 'success', text: res.message || 'เปลี่ยนรหัสผ่านเรียบร้อย' })
      setPassword('')
      setConfirmPassword('')
    } else {
      setPasswordFeedback({ type: 'error', text: res.message || 'เกิดข้อผิดพลาด' })
    }
    setPasswordSaving(false)
  }

  const handleSaveBudget = async (bucketId: string) => {
    setSavingBucketId(bucketId)
    setBudgetFeedback(null)

    const rawVal = bucketBudgets[bucketId]?.trim()
    const budgetVal = rawVal === '' ? null : Number(rawVal)
    
    const walletVal = bucketWallets[bucketId] || null

    const res = await updateBucketSettings(bucketId, budgetVal, walletVal)
    if (res.success) {
      setBudgetFeedback('บันทึกการตั้งค่าสำเร็จ')
      router.refresh()
      setTimeout(() => setBudgetFeedback(null), 3000)
    }
    setSavingBucketId(null)
  }

  const getBucketIcon = (iconName?: string | null) => {
    switch (iconName) {
      case 'shield': return ShieldCheck
      case 'trending-up': return TrendingUp
      case 'coffee': return Coffee
      default: return Wallet
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-sm text-gray-500">กำลังโหลดการตั้งค่า...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">ตั้งค่าบัญชีและการใช้งาน</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 flex flex-col gap-6">
        {/* Section 1: User Profile */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User size={22} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">ข้อมูลผู้ใช้งาน (Profile)</h2>
              <p className="text-xs text-gray-500">ชื่อที่จะแสดงผลในระบบและข้อมูลการเข้าสู่ระบบ</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">อีเมลผู้ใช้งาน (Email)</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                <Mail size={16} className="text-gray-400" />
                <span className="font-mono text-xs">{email || 'ไม่พบอีเมล'}</span>
                <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">ยืนยันแล้ว</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">ชื่อที่แสดงผล (Display Name)</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                required
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {profileFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                profileFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {profileFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{profileFeedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={profileSaving}
              className="mt-1 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>บันทึกชื่อโปรไฟล์</span>
            </button>
          </form>
        </section>

        {/* Section 2: Change Password */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">เปลี่ยนรหัสผ่าน (Password)</h2>
              <p className="text-xs text-gray-500">กำหนดรหัสผ่านใหม่เพื่อความปลอดภัย</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {passwordFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                passwordFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {passwordFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordSaving}
              className="mt-1 w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {passwordSaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              <span>อัปเดตรหัสผ่าน</span>
            </button>
          </form>
        </section>

        {/* Section 3: Monthly Budget Limits */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet size={22} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">งบประมาณรายเดือน (Monthly Budgets)</h2>
              <p className="text-xs text-gray-500">กำหนดเพดานจ่ายต่อเดือนเพื่อรับการแจ้งเตือน</p>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100/80 text-xs text-blue-900 flex items-start gap-2">
            <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <span>
              หากรายจ่ายในเดือนแตะ <strong>80%</strong> หรือเกิน <strong>100%</strong> ของงบประมาณ ระบบจะแสดงแถบเตือนสีส้ม/แดง เพื่อช่วยคุมวินัยทางการเงินทันที (เว้นว่างไว้หากไม่ต้องการจำกัดงบ)
            </span>
          </div>

          {budgetFeedback && (
            <div className="p-3 rounded-xl text-xs bg-emerald-50 text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{budgetFeedback}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {buckets.map((bucket) => {
              const Icon = getBucketIcon(bucket.icon)
              const isSaving = savingBucketId === bucket.id
              const currentVal = bucketBudgets[bucket.id] ?? ''

              return (
                <div key={bucket.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shadow-xs"
                        style={{ backgroundColor: bucket.color || '#3B82F6' }}
                      >
                        <Icon size={16} />
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{bucket.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">คงเหลือ ฿{Number(bucket.balance).toLocaleString()}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={currentVal}
                        onChange={(e) => setBucketBudgets({ ...bucketBudgets, [bucket.id]: e.target.value })}
                        placeholder="ไม่จำกัดงบประมาณ"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute left-2.5 top-2.5 text-xs text-gray-400 font-semibold">฿</span>
                    </div>
                    
                    <div className="relative flex-1">
                      <select
                        value={bucketWallets[bucket.id] || ''}
                        onChange={(e) => setBucketWallets({ ...bucketWallets, [bucket.id]: e.target.value })}
                        className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-700"
                      >
                        <option value="">-- ไม่ผูกบัญชี --</option>
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>
                            ผูกกับ: {w.name} {w.bank_name ? `(${w.bank_name})` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-2.5 pointer-events-none text-gray-400">
                        <ChevronRight size={16} className="rotate-90" />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveBudget(bucket.id)}
                      className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-1 shrink-0 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>บันทึก</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Section 4: Recurring Transactions */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Repeat size={22} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">รายการประจำอัตโนมัติ (Recurring)</h2>
              <p className="text-xs text-gray-500">จัดการบิลค่าห้อง, ค่าเน็ต, สตรีมมิ่ง, เงินเดือน</p>
            </div>
          </div>
          <Link
            href="/dashboard/recurring"
            className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-2xl text-sm font-semibold transition flex items-center justify-between border border-indigo-100 group"
          >
            <div className="flex items-center gap-2">
              <Repeat size={18} className="text-indigo-600 group-hover:rotate-45 transition-transform duration-300" />
              <span>เข้าสู่หน้าจัดการรายการประจำ</span>
            </div>
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </section>

        {/* Section 5: Sign Out */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl text-sm font-semibold hover:bg-rose-100 transition flex items-center justify-center gap-2 border border-rose-100"
            >
              <LogOut size={18} />
              <span>ออกจากระบบ (Sign Out)</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
