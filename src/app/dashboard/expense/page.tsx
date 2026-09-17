'use client'

import { useState } from 'react'
import { ArrowUpCircle, CheckCircle2, ChevronLeft, ShieldCheck, TrendingUp, Coffee } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const fallbackBuckets = [
  { id: '1', name: 'เงินสำรองฉุกเฉิน', icon: 'shield', color: '#F59E0B', balance: 15000 },
  { id: '2', name: 'เงินลงทุน', icon: 'trending-up', color: '#10B981', balance: 8000 },
  { id: '3', name: 'เงินใช้ชีวิต', icon: 'coffee', color: '#3B82F6', balance: 12500 },
]

export default function ExpensePage() {
  const router = useRouter()
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState('')
  const [selectedBucketId, setSelectedBucketId] = useState<string>('3') // Default to Daily Living
  const [isSuccess, setIsSuccess] = useState(false)

  const numAmount = Number(amount) || 0

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (numAmount > 0) {
      setIsSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-gray-50 text-center pb-20">
        <CheckCircle2 size={80} className="text-rose-500 mb-6 animate-bounce" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">บันทึกรายจ่ายสำเร็จ!</h2>
        <p className="text-gray-500">ระบบได้หักเงินออกจากกระเป๋าที่คุณเลือกแล้ว</p>
      </div>
    )
  }

  return (
    <main className="p-6 pb-24 bg-gray-50 min-h-screen">
      <header className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">บันทึกรายจ่าย</h1>
      </header>

      <form onSubmit={handleConfirm} className="flex flex-col gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <ArrowUpCircle size={32} />
          </div>
          <p className="text-gray-500 mb-2">ยอดเงินที่จ่าย (บาท)</p>
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
          <h3 className="block text-sm font-medium text-gray-700 mb-4">หักจากกระเป๋าเงิน</h3>
          <div className="flex flex-col gap-3">
            {fallbackBuckets.map(bucket => {
              const isSelected = selectedBucketId === bucket.id
              const Icon = bucket.icon === 'shield' ? ShieldCheck : bucket.icon === 'trending-up' ? TrendingUp : Coffee
              
              return (
                <label 
                  key={bucket.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected ? 'border-rose-500 bg-rose-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="bucket" 
                    value={bucket.id} 
                    checked={isSelected}
                    onChange={() => setSelectedBucketId(bucket.id)}
                    className="hidden"
                  />
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: bucket.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${isSelected ? 'text-rose-700' : 'text-gray-900'}`}>{bucket.name}</p>
                    <p className={`text-xs ${isSelected ? 'text-rose-500' : 'text-gray-500'}`}>คงเหลือ: ฿{bucket.balance.toLocaleString('th-TH')}</p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="text-rose-500" size={24} />
                  )}
                </label>
              )
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">บันทึกช่วยจำ (ซื้ออะไรไป?)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น ค่ากาแฟ, ค่ารถ, ซื้อของออนไลน์"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900"
          />
        </div>

        <button
          type="submit"
          disabled={numAmount <= 0}
          className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-rose-700 transition disabled:opacity-50 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          ยืนยันการจ่ายเงิน
        </button>
      </form>
    </main>
  )
}
