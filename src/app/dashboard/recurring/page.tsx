'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Plus, 
  Repeat, 
  CalendarClock, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Clock, 
  Loader2, 
  X,
  ShieldCheck,
  Coffee,
  Sparkles
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { 
  createRecurringSchedule, 
  updateRecurringSchedule, 
  deleteRecurringSchedule, 
  toggleRecurringActive 
} from '../actions'
import { 
  RecurringFrequency, 
  RecurringSchedule, 
  RecurringType,
  calculateMonthlyCommitment, 
  formatFrequencyThai, 
  formatThaiDateShort, 
  formatDateISO,
  THAI_DAY_NAMES
} from '@/utils/recurringHelper'

interface BucketItem {
  id: string
  name: string
  color?: string | null
  icon?: string | null
  balance: number
}

interface WalletItem {
  id: string
  name: string
  color?: string | null
  type?: string | null
  balance: number
}

const COMMON_EXPENSE_CATEGORIES = [
  'ค่าใช้จ่ายประจำ',
  'ค่าเช่าห้อง/คอนโด',
  'ค่าน้ำ/ค่าไฟ',
  'ค่าเน็ต/โทรศัพท์',
  'ความบันเทิง/สตรีมมิ่ง',
  'ค่าเดินทาง/น้ำมัน',
  'ประกัน/สุขภาพ',
  'หนี้สิน/ผ่อนชำระ',
  'อื่นๆ',
]

const COMMON_INCOME_CATEGORIES = [
  'เงินเดือน/รายได้หลัก',
  'งานฟรีแลนซ์/พาร์ทไทม์',
  'ผลตอบแทนจากการลงทุน',
  'เงินช่วยเหลือ/ครอบครัว',
  'รายได้อื่นๆ',
]

export default function RecurringPage() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [buckets, setBuckets] = useState<BucketItem[]>([])
  const [wallets, setWallets] = useState<WalletItem[]>([])
  const [walletId, setWalletId] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<RecurringSchedule | null>(null)
  const [formType, setFormType] = useState<RecurringType>('expense')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState('ค่าใช้จ่ายประจำ')
  const [bucketId, setBucketId] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [startDate, setStartDate] = useState(formatDateISO(new Date()))
  const [endDate, setEndDate] = useState('')
  const [autoProcess, setAutoProcess] = useState(true)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [isPending, startTransition] = useTransition()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // 1. Fetch Buckets
    const { data: bucketsData } = await supabase
      .from('buckets')
      .select('id, name, color, icon, balance')
      .eq('user_id', user.id)
      .order('created_at')

    if (bucketsData) {
      setBuckets(bucketsData)
      if (!bucketId && bucketsData.length > 0) {
        setBucketId(bucketsData[0].id)
      }
    }

    // 2. Fetch Wallets
    const { data: walletsData } = await supabase
      .from('wallets')
      .select('id, name, color, type, balance')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('is_default', { ascending: false })

    if (walletsData && walletsData.length > 0) {
      setWallets(walletsData)
      if (!walletId) {
        setWalletId(walletsData[0].id)
      }
    }

    // 3. Fetch Recurring Schedules
    const { data: schedulesData, error } = await supabase
      .from('recurring_schedules')
      .select(`
        *,
        bucket:buckets ( id, name, color, icon, balance )
      `)
      .eq('user_id', user.id)
      .order('next_run_date', { ascending: true })

    if (schedulesData) {
      setSchedules(schedulesData as RecurringSchedule[])
    } else if (error) {
      console.warn('Error loading recurring schedules:', error.message)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingSchedule(null)
    setFormType('expense')
    setAmount('')
    setNote('')
    setCategory('ค่าใช้จ่ายประจำ')
    setBucketId(buckets[0]?.id || '')
    setWalletId(wallets[0]?.id || '')
    setFrequency('monthly')
    setDayOfMonth('1')
    setDayOfWeek('1')
    setStartDate(formatDateISO(new Date()))
    setEndDate('')
    setAutoProcess(true)
    setFormError(null)
    setIsModalOpen(true)
  }

  // Open modal for Edit
  const handleOpenEdit = (schedule: RecurringSchedule) => {
    setEditingSchedule(schedule)
    setFormType(schedule.type)
    setAmount(String(schedule.amount))
    setNote(schedule.note || '')
    setCategory(schedule.category || (schedule.type === 'income' ? 'รายรับประจำ' : 'ค่าใช้จ่ายประจำ'))
    setBucketId(schedule.bucket_id || buckets[0]?.id || '')
    setWalletId(schedule.wallet_id || wallets[0]?.id || '')
    setFrequency(schedule.frequency)
    setDayOfMonth(schedule.day_of_month ? String(schedule.day_of_month) : '1')
    setDayOfWeek(schedule.day_of_week !== null && schedule.day_of_week !== undefined ? String(schedule.day_of_week) : '1')
    setStartDate(schedule.start_date || formatDateISO(new Date()))
    setEndDate(schedule.end_date || '')
    setAutoProcess(schedule.auto_process)
    setFormError(null)
    setIsModalOpen(true)
  }

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)

    const formData = new FormData()
    formData.append('type', formType)
    formData.append('amount', amount)
    formData.append('note', note)
    formData.append('category', category)
    formData.append('bucket_id', bucketId)
    if (walletId) formData.append('wallet_id', walletId)
    formData.append('frequency', frequency)
    if (frequency === 'monthly') {
      formData.append('day_of_month', dayOfMonth)
    } else if (frequency === 'weekly') {
      formData.append('day_of_week', dayOfWeek)
    }
    formData.append('start_date', startDate)
    if (endDate) formData.append('end_date', endDate)
    formData.append('auto_process', autoProcess ? 'true' : 'false')

    let res
    if (editingSchedule) {
      res = await updateRecurringSchedule(editingSchedule.id, formData)
    } else {
      res = await createRecurringSchedule(formData)
    }

    if (res.success) {
      setIsModalOpen(false)
      setFeedback({ type: 'success', text: editingSchedule ? 'บันทึกการแก้ไขเรียบร้อย' : 'เพิ่มรายการประจำสำเร็จ' })
      setTimeout(() => setFeedback(null), 3500)
      await loadData()
      startTransition(() => {
        router.refresh()
      })
    } else {
      setFormError(res.message || 'เกิดข้อผิดพลาดในการบันทึก')
    }
    setFormSubmitting(false)
  }

  // Handle Toggle Active
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const nextState = !currentActive
    // Optimistic update
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: nextState } : s))
    )

    const res = await toggleRecurringActive(id, nextState)
    if (!res.success) {
      // Rollback
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: currentActive } : s))
      )
      setFeedback({ type: 'error', text: res.message || 'ไม่สามารถเปลี่ยนสถานะได้' })
    } else {
      setFeedback({ type: 'success', text: res.message || 'อัปเดตสถานะสำเร็จ' })
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('คุณต้องการลบรายการประจำนี้ใช่หรือไม่?')) return

    setDeletingId(id)
    const res = await deleteRecurringSchedule(id)
    if (res.success) {
      setSchedules((prev) => prev.filter((s) => s.id !== id))
      setFeedback({ type: 'success', text: 'ลบรายการประจำเรียบร้อยแล้ว' })
      setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback({ type: 'error', text: res.message || 'ไม่สามารถลบรายการได้' })
    }
    setDeletingId(null)
  }

  // Monthly commitment calculation
  const commitment = calculateMonthlyCommitment(schedules)

  // Filtered schedules
  const filteredSchedules = schedules.filter((s) => {
    if (filterType === 'expense') return s.type === 'expense'
    if (filterType === 'income') return s.type === 'income'
    return true
  })

  const todayStr = formatDateISO(new Date())

  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">รายการประจำอัตโนมัติ</h1>
            <p className="text-xs text-gray-500">บิลและรายรับตามรอบเวลา (Recurring)</p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1 shadow-sm"
        >
          <Plus size={16} />
          <span>เพิ่มรายการ</span>
        </button>
      </header>

      <div className="max-w-md mx-auto p-4 flex flex-col gap-5">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-xs transition-all ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* 1. Monthly Commitments Summary Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <CalendarClock size={18} className="text-blue-600" />
              <span>สรุปภาระการเงินประจำเดือน (Monthly Commitments)</span>
            </div>
            <span className="text-[11px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
              เปิดใช้งาน {commitment.activeCount} รายการ
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100/60 flex flex-col justify-center">
              <span className="text-[10px] text-gray-500 mb-1">จ่ายออก/เดือน</span>
              <span className="text-xs font-bold text-rose-600 truncate">
                -฿{commitment.totalExpense.toLocaleString('th-TH')}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100/60 flex flex-col justify-center">
              <span className="text-[10px] text-gray-500 mb-1">รับเข้า/เดือน</span>
              <span className="text-xs font-bold text-emerald-600 truncate">
                +฿{commitment.totalIncome.toLocaleString('th-TH')}
              </span>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100/60 flex flex-col justify-center">
              <span className="text-[10px] text-gray-500 mb-1">สุทธิ/เดือน</span>
              <span className={`text-xs font-bold truncate ${
                commitment.netCommitment >= 0 ? 'text-blue-700' : 'text-amber-700'
              }`}>
                {commitment.netCommitment >= 0 ? '+' : ''}฿{commitment.netCommitment.toLocaleString('th-TH')}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-3">
            * คำนวณแปลงความถี่เป็นยอดประมาณการต่อเดือนเพื่อช่วยวางแผนสภาพคล่อง
          </p>
        </div>

        {/* 2. Filter Tabs */}
        <div className="flex bg-gray-200/70 p-1 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-xl transition ${
              filterType === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            ทั้งหมด ({schedules.length})
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`flex-1 py-1.5 rounded-xl transition ${
              filterType === 'expense' ? 'bg-white text-rose-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            รายจ่าย ({schedules.filter((s) => s.type === 'expense').length})
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`flex-1 py-1.5 rounded-xl transition ${
              filterType === 'income' ? 'bg-white text-emerald-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            รายรับ ({schedules.filter((s) => s.type === 'income').length})
          </button>
        </div>

        {/* 3. Schedules List */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-gray-100">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <p className="text-xs text-gray-400">กำลังโหลดรายการประจำ...</p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="py-14 text-center bg-white rounded-3xl border border-dashed border-gray-200 p-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Repeat size={26} />
            </div>
            <h3 className="font-bold text-gray-800 text-sm mb-1">ยังไม่มีรายการประจำ</h3>
            <p className="text-xs text-gray-500 mb-4 max-w-xs">
              ตั้งรายการค่าห้อง, ค่าเน็ต, Netflix หรือเงินเดือน เพื่อให้ระบบตัดยอดอัตโนมัติเมื่อถึงรอบ
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={16} />
              <span>สร้างรายการประจำรายการแรก</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredSchedules.map((schedule) => {
              const isExpense = schedule.type === 'expense'
              const isDueToday = schedule.next_run_date <= todayStr && schedule.is_active
              const isPaused = !schedule.is_active

              return (
                <div
                  key={schedule.id}
                  className={`bg-white rounded-3xl p-4 shadow-sm border transition-all ${
                    isPaused 
                      ? 'border-gray-200 opacity-60 bg-gray-50/50' 
                      : isDueToday 
                      ? 'border-amber-200 ring-1 ring-amber-200/50' 
                      : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-2xs ${
                          isExpense ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={schedule.bucket?.color && isExpense ? { backgroundColor: schedule.bucket.color } : {}}
                      >
                        {isExpense ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-tight">
                          {schedule.note || (isExpense ? 'รายจ่ายประจำ' : 'รายรับประจำ')}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                            {schedule.category || 'ทั่วไป'}
                          </span>
                          {isExpense && schedule.bucket && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                              <Wallet size={10} />
                              {schedule.bucket.name}
                            </span>
                          )}
                          {!isExpense && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium">
                              แบ่งตามสัดส่วนกระเป๋า
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-extrabold text-sm ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isExpense ? '-' : '+'}฿{Number(schedule.amount).toLocaleString('th-TH')}
                      </p>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {formatFrequencyThai(schedule.frequency, schedule.day_of_month, schedule.day_of_week)}
                      </span>
                    </div>
                  </div>

                  {/* Details & Actions Footer */}
                  <div className="pt-2.5 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Clock size={13} className="text-gray-400" />
                      <span>รอบถัดไป: <strong>{formatThaiDateShort(schedule.next_run_date)}</strong></span>
                      {isDueToday && (
                        <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[10px]">
                          ถึงกำหนดวันนี้
                        </span>
                      )}
                      {schedule.auto_process && (
                        <span className="text-[10px] text-blue-600 font-medium" title="ระบบตัดยอดอัตโนมัติเมื่อเปิดแอพ">
                          • อัตโนมัติ
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Active/Pause Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(schedule.id, schedule.is_active)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition ${
                          schedule.is_active 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {schedule.is_active ? 'เปิดอยู่' : 'ปิดอยู่'}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(schedule)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="แก้ไข"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete */}
                      <button
                        disabled={deletingId === schedule.id}
                        onClick={() => handleDelete(schedule.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                        title="ลบ"
                      >
                        {deletingId === schedule.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Create / Edit Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Repeat size={18} />
                </div>
                <h3 className="font-bold text-gray-900 text-base">
                  {editingSchedule ? 'แก้ไขรายการประจำ' : 'สร้างรายการประจำใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto flex flex-col gap-4">
              {/* Type Switcher */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">ประเภทรายการ</label>
                <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('expense')
                      if (category.includes('รายได้') || category.includes('เงินเดือน')) setCategory('ค่าใช้จ่ายประจำ')
                    }}
                    className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                      formType === 'expense' ? 'bg-rose-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <TrendingDown size={14} />
                    <span>รายจ่าย (Expense)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('income')
                      if (category.includes('จ่าย') || category.includes('ค่า')) setCategory('เงินเดือน/รายได้หลัก')
                    }}
                    className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                      formType === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <TrendingUp size={14} />
                    <span>รายรับ (Income)</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">จำนวนเงิน (บาท) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">฿</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Note / Name */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">ชื่อรายการ (เช่น ค่าเช่าห้อง, Netflix) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าเน็ตบ้าน, ค่าเช่าห้องคอนโด"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">หมวดหมู่</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                  {(formType === 'expense' ? COMMON_EXPENSE_CATEGORIES : COMMON_INCOME_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bucket (Required for expense) */}
              {formType === 'expense' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">หักจากถังงบประมาณ (Bucket Envelope) *</label>
                  <select
                    value={bucketId}
                    onChange={(e) => setBucketId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {buckets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (คงเหลือ ฿{Number(b.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Wallet Selection */}
              {wallets.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    {formType === 'expense' ? 'ตัดเงินจริงจากกระเป๋า / บัญชี (Wallet)' : 'รับเงินเข้ากระเป๋า / บัญชี (Wallet)'}
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (คงเหลือ ฿{Number(w.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Frequency */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">ความถี่ (Frequency) *</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                  <option value="daily">ทุกวัน (Daily)</option>
                  <option value="weekly">ทุกสัปดาห์ (Weekly)</option>
                  <option value="monthly">ทุกเดือน (Monthly)</option>
                  <option value="yearly">ทุกปี (Yearly)</option>
                </select>
              </div>

              {/* Conditional Day Selectors */}
              {frequency === 'monthly' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">วันที่ตัดรอบในแต่ละเดือน (1-31)</label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        วันที่ {d} {d === 31 ? '(หรือสิ้นเดือน)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {frequency === 'weekly' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">วันในสัปดาห์ที่ตัดรอบ</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                    {THAI_DAY_NAMES.map((dayName, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDayOfWeek(String(idx))}
                        className={`py-1.5 text-xs rounded-xl font-medium transition ${
                          dayOfWeek === String(idx)
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {dayName.replace('วัน', '')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">วันเริ่มมีผล *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">วันสิ้นสุด (ถ้ามี)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Auto Process Checkbox */}
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-900">บันทึกและตัดยอดอัตโนมัติ</p>
                  <p className="text-[11px] text-blue-700">ประมวลผลเมื่อถึงกำหนดทันทีที่เปิดแอพ</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoProcess}
                  onChange={(e) => setAutoProcess(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Form Error */}
              {formError && (
                <div className="p-3 rounded-xl text-xs bg-rose-50 text-rose-700 flex items-center gap-2 border border-rose-200">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
              >
                {formSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>{editingSchedule ? 'บันทึกการแก้ไข' : 'สร้างรายการประจำ'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
