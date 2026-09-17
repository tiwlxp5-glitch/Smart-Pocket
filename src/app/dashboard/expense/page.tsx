'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowUpCircle, CheckCircle2, ChevronLeft, ShieldCheck, TrendingUp, Coffee, ScanLine, Loader2, FileImage } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addExpense } from '../actions'
import { createBrowserClient } from '@supabase/ssr'
import { extractSlipData } from './extract-action'

export default function ExpensePage() {
  const router = useRouter()
  const [buckets, setBuckets] = useState<any[]>([])
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState('')
  const [receiver, setReceiver] = useState('')
  const [selectedBucketId, setSelectedBucketId] = useState<string>('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // AI Slip State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)

  const numAmount = Number(amount) || 0
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchBuckets = async () => {
      const { data } = await supabase.from('buckets').select('*').order('created_at')
      if (data) {
        setBuckets(data)
        if (data.length > 0) setSelectedBucketId(data[data.length - 1].id)
      }
      setIsLoading(false)
    }
    fetchBuckets()
  }, [supabase])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSlipFile(file)
    setSlipPreview(URL.createObjectURL(file))
    setIsScanning(true)

    try {
      // อ่านไฟล์เป็น Base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1] // เอาแค่ส่วน data
          // ส่งให้ Gemini AI อ่านสลิป
          const extracted = await extractSlipData(base64Data, file.type)
          
          if (extracted.amount) setAmount(extracted.amount.toString())
          if (extracted.note) setNote(extracted.note)
          if (extracted.receiver) setReceiver(extracted.receiver)
        } catch (error) {
          alert('อ่านสลิปไม่สำเร็จ กรุณากรอกข้อมูลเองครับ')
          setSlipPreview(null)
          setSlipFile(null)
        } finally {
          setIsScanning(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      alert('อ่านไฟล์ไม่สำเร็จ')
      setIsScanning(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (numAmount > 0 && selectedBucketId) {
      setIsLoading(true) // Disable form while processing
      
      let finalSlipUrl = ''
      
      // อัพโหลดรูปภาพขึ้น Supabase Storage (ถ้ามีการแนบสลิป)
      if (slipFile) {
        const fileExt = slipFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('slips')
          .upload(fileName, slipFile)
          
        if (!uploadError && uploadData) {
          const { data } = supabase.storage.from('slips').getPublicUrl(uploadData.path)
          finalSlipUrl = data.publicUrl
        }
      }

      const formData = new FormData()
      formData.append('amount', numAmount.toString())
      formData.append('note', note)
      formData.append('receiver', receiver)
      formData.append('bucket_id', selectedBucketId)
      if (finalSlipUrl) formData.append('slip_url', finalSlipUrl)
      
      try {
        await addExpense(formData)
        setIsSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการบันทึกรายจ่าย')
        setIsLoading(false)
      }
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

      {/* AI Slip Scanner Section */}
      <div className="mb-6">
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect}
        />
        
        {slipPreview ? (
          <div className="relative bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <img src={slipPreview} alt="Slip" className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
            <div className="flex-1">
              {isScanning ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="animate-spin" size={20} />
                  <span className="font-semibold text-sm animate-pulse">AI กำลังอ่านสลิป...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={20} />
                  <span className="font-semibold text-sm">ดึงข้อมูลสำเร็จ!</span>
                </div>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-semibold bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              เปลี่ยนรูป
            </button>
          </div>
        ) : (
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-3xl shadow-md flex items-center justify-between hover:shadow-lg transition-all"
          >
            <div className="text-left">
              <h3 className="font-bold text-lg mb-1">สแกนสลิปอัจฉริยะ (AI)</h3>
              <p className="text-blue-100 text-xs">อัพโหลดรูปสลิปให้ AI ดึงข้อมูลให้อัตโนมัติ</p>
            </div>
            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
              <ScanLine size={24} />
            </div>
          </button>
        )}
      </div>

      <form onSubmit={handleConfirm} className="flex flex-col gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <ArrowUpCircle size={32} />
          </div>
          <p className="text-gray-500 mb-2">ยอดเงินที่จ่าย (บาท)</p>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`text-5xl font-extrabold text-center w-full bg-transparent focus:outline-none placeholder:text-gray-300 transition-colors ${isScanning ? 'text-gray-300' : 'text-gray-900'}`}
            required
            disabled={isScanning}
          />
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">บันทึกช่วยจำ (สินค้า/เหตุผล)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ค่ากาแฟ, ซื้อของออนไลน์"
              className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors ${isScanning ? 'text-gray-300 bg-gray-50' : 'text-gray-900'}`}
              disabled={isScanning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้รับเงิน (ร้านค้า/บุคคล)</label>
            <input
              type="text"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder="เช่น ร้านถุงเงิน, นายใจดี"
              className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors ${isScanning ? 'text-gray-300 bg-gray-50' : 'text-gray-900'}`}
              disabled={isScanning}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="block text-sm font-medium text-gray-700 mb-4">หักจากกระเป๋าเงิน</h3>
          {buckets.length === 0 ? (
            <p className="text-center text-gray-400 py-4">กำลังโหลดกระเป๋าเงิน...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {buckets.map(bucket => {
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
                      style={{ backgroundColor: bucket.color || '#3B82F6' }}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${isSelected ? 'text-rose-700' : 'text-gray-900'}`}>{bucket.name}</p>
                      <p className={`text-xs ${isSelected ? 'text-rose-500' : 'text-gray-500'}`}>คงเหลือ: ฿{Number(bucket.balance).toLocaleString('th-TH')}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="text-rose-500" size={24} />
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={numAmount <= 0 || !selectedBucketId || isScanning || isLoading}
          className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-rose-700 transition disabled:opacity-50 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {isLoading ? 'กำลังบันทึก...' : 'ยืนยันการจ่ายเงิน'}
        </button>
      </form>
    </main>
  )
}
