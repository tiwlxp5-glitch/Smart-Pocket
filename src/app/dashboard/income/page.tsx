'use client'

import { useState, useEffect } from 'react'
import { ArrowDownCircle, PieChart, CheckCircle2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addIncome } from '../actions'
import { createBrowserClient } from '@supabase/ssr'

export default function IncomePage() {
  const router = useRouter()
  const [buckets, setBuckets] = useState<any[]>([])
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState('')
  const [showSplitter, setShowSplitter] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const numAmount = Number(amount) || 0

  useEffect(() => {
    const fetchBuckets = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data } = await supabase.from('buckets').select('*').order('created_at')
      if (data) setBuckets(data)
      setIsLoading(false)
    }
    fetchBuckets()
  }, [])

  const handleAllocate = (e: React.FormEvent) => {
    e.preventDefault()
    if (numAmount > 0) {
      setShowSplitter(true)
    }
  }

  const handleConfirm = async () => {
    if (numAmount > 0) {
      setIsSaving(true)
      const formData = new FormData()
      formData.append('amount', numAmount.toString())
      formData.append('note', note)
      
      try {
        await addIncome(formData)
        setIsSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการบันทึกรายรับ')
        setIsSaving(false)
      }
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-gray-50 text-center pb-20">
        <CheckCircle2 size={80} className="text-emerald-500 mb-6 animate-bounce" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">จัดสรรเงินสำเร็จ!</h2>
        <p className="text-gray-500">ระบบได้แบ่งเงินเข้ากระเป๋าต่างๆ เรียบร้อยแล้ว</p>
      </div>
    )
  }

  return (
    <main className="p-6 pb-24 bg-gray-50 min-h-screen">
      <header className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">บันทึกรายรับ</h1>
      </header>

      {!showSplitter ? (
        <form onSubmit={handleAllocate} className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <ArrowDownCircle size={32} />
            </div>
            <p className="text-gray-500 mb-2">ยอดเงินที่ได้รับ (บาท)</p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-5xl font-extrabold text-center text-gray-900 w-full bg-transparent focus:outline-none placeholder:text-gray-300"
              autoFocus
              required
            />
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">บันทึกช่วยจำ (หมวดหมู่)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น เงินเดือน, โบนัส, ขายของ"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={numAmount <= 0 || isLoading}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <PieChart size={20} />
            {isLoading ? 'กำลังโหลด...' : 'จัดสรรเงินอัตโนมัติ'}
          </button>
        </form>
      ) : (
        <div className="animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg mb-6">
            <p className="text-emerald-100 text-sm mb-1">ยอดเงินรอจัดสรร</p>
            <h2 className="text-3xl font-extrabold mb-4">฿{numAmount.toLocaleString('th-TH')}</h2>
            <div className="bg-white/20 p-3 rounded-xl text-sm flex gap-2 items-center">
              <PieChart size={18} />
              ระบบกำลังแบ่งเงินตามแผนที่คุณตั้งไว้
            </div>
          </div>

          <h3 className="font-bold text-gray-900 mb-4 text-lg">สรุปการจัดสรรเงิน</h3>
          <div className="flex flex-col gap-3 mb-8">
            {buckets.map((bucket) => {
              const allocatedAmount = (numAmount * Number(bucket.allocation_percentage)) / 100
              
              return (
                <div key={bucket.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div 
                    className="w-4 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: bucket.color || '#3B82F6' }}
                  ></div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{bucket.name}</p>
                    <p className="text-xs text-gray-500">{bucket.allocation_percentage}% ของรายรับ</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 text-lg">
                      +฿{allocatedAmount.toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowSplitter(false)}
              disabled={isSaving}
              className="flex-1 bg-white text-gray-600 border border-gray-200 py-4 rounded-2xl font-bold hover:bg-gray-50 transition disabled:opacity-50"
            >
              แก้ไขยอด
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className="flex-[2] bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={20} />
              {isSaving ? 'กำลังบันทึก...' : 'ยืนยันการบันทึก'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
