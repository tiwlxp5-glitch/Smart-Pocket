'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowUpCircle, CheckCircle2, ChevronLeft, ShieldCheck, TrendingUp, Coffee, ScanLine, Loader2, AlertTriangle, Wallet as WalletIcon, Building2, Banknote, CreditCard, Smartphone } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { addExpense } from '../actions'
import { createBrowserClient } from '@supabase/ssr'
import { extractSlipData } from './extract-action'
import { Wallet as WalletTypeInterface } from '@/types/database'
import { getWalletTypeLabel, detectBankFromText } from '@/utils/walletHelper'

interface Bucket {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  balance: number
  allocation_percentage?: number
  monthly_budget?: number | null
  default_wallet_id?: string | null
}

export default function ExpensePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const aiAmount = searchParams.get('ai_amount')
  const aiNote = searchParams.get('ai_note')
  const aiBucket = searchParams.get('ai_bucket')
  const aiWallet = searchParams.get('ai_wallet')

  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [wallets, setWallets] = useState<WalletTypeInterface[]>([])
  const [selectedWalletId, setSelectedWalletId] = useState<string>(aiWallet || '')
  const [bucketExpenses, setBucketExpenses] = useState<Record<string, number>>({})
  const [amount, setAmount] = useState<string>(aiAmount || '')
  const [note, setNote] = useState(aiNote || '')
  const [receiver, setReceiver] = useState('')
  const [selectedBucketId, setSelectedBucketId] = useState<string>(aiBucket || '')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // AI Slip State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [compressedSlipBlob, setCompressedSlipBlob] = useState<Blob | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)

  const numAmount = Number(amount) || 0
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchBucketsAndExpenses = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('buckets').select('*').eq('is_archived', false).order('created_at')
      if (data) {
        setBuckets(data)
        if (data.length > 0 && !aiBucket) {
          setSelectedBucketId(data[data.length - 1].id)
        }
      }

      // Fetch Wallets
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('is_archived', false)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      if (walletData && walletData.length > 0) {
        setWallets(walletData)
        if (!aiWallet) {
          setSelectedWalletId(walletData[0].id)
        }
      }

      if (user) {
        const startOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const { data: txs } = await supabase
          .from('transactions')
          .select('bucket_id, amount')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .is('deleted_at', null)
          .gte('transaction_date', startOfMonthStr)

        if (txs) {
          const expMap: Record<string, number> = {}
          txs.forEach((tx) => {
            if (tx.bucket_id) {
              expMap[tx.bucket_id] = (expMap[tx.bucket_id] || 0) + (Number(tx.amount) || 0)
            }
          })
          setBucketExpenses(expMap)
        }
      }
      setIsLoading(false)
    }
    fetchBucketsAndExpenses()
  }, [supabase])

  // Auto-select wallet if bucket has a default_wallet_id
  useEffect(() => {
    if (selectedBucketId && buckets.length > 0) {
      const bucket = buckets.find(b => b.id === selectedBucketId)
      if (bucket?.default_wallet_id) {
        setSelectedWalletId(bucket.default_wallet_id)
      }
    }
  }, [selectedBucketId, buckets])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSlipFile(file)
    setCompressedSlipBlob(null)
    setIsScanning(true)
    
    try {
      // 1. บีบอัดรูปก่อนส่ง (แก้ปัญหา Vercel โหลดรูปจากกล้องมือถือไม่ผ่านเพราะไฟล์ใหญ่เกิน 4.5MB)
      const compressImage = (file: File): Promise<{ dataUrl: string; blob: Blob }> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              let { width, height } = img
              const MAX_SIZE = 1200
              if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width
                width = MAX_SIZE
              } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height
                height = MAX_SIZE
              }
              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')
              ctx?.drawImage(img, 0, 0, width, height)
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
              // แปลง dataURL → Blob เพื่อ upload ขึ้น Storage แทนไฟล์ต้นฉบับ
              canvas.toBlob(
                (blob) => {
                  if (blob) resolve({ dataUrl, blob })
                  else reject(new Error('Blob conversion failed'))
                },
                'image/jpeg',
                0.7
              )
            }
            img.onerror = reject
            img.src = e.target?.result as string
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      const { dataUrl: compressedDataUrl, blob: compressedBlob } = await compressImage(file)
      setSlipPreview(compressedDataUrl) // โชว์รูปพรีวิวจากที่บีบอัดแล้ว
      setCompressedSlipBlob(compressedBlob) // เก็บ Blob สำหรับ upload ขึ้น Storage
      
      const base64Data = compressedDataUrl.split(',')[1]
      
      // 2. ส่งไป AI
      const extracted = await extractSlipData(base64Data, 'image/jpeg')
      
      if (extracted.amount) setAmount(extracted.amount.toString())
      if (extracted.note) setNote(extracted.note)
      if (extracted.receiver) setReceiver(extracted.receiver)

      // Auto-match Wallet based on sender_bank or note
      let matchedWalletId = null
      if (extracted.sender_bank && wallets.length > 0) {
        const bankMatch = wallets.find(
          (w) =>
            (w.bank_name && w.bank_name.toLowerCase() === extracted.sender_bank.toLowerCase()) ||
            (w.name && w.name.toLowerCase().includes(extracted.sender_bank.toLowerCase()))
        )
        if (bankMatch) matchedWalletId = bankMatch.id
      } else if (extracted.note && wallets.length > 0) {
        const preset = detectBankFromText(extracted.note)
        if (preset) {
          const bankMatch = wallets.find(
            (w) => w.bank_name === preset.code || w.name.toLowerCase().includes(preset.code)
          )
          if (bankMatch) matchedWalletId = bankMatch.id
        }
      }

      if (matchedWalletId) {
        setSelectedWalletId(matchedWalletId)
        // Auto-select the bucket that is linked to this wallet
        const bucketMatch = buckets.find(b => b.default_wallet_id === matchedWalletId)
        if (bucketMatch) {
          setSelectedBucketId(bucketMatch.id)
        }
      }
    } catch (error) {
      console.error(error)
      alert('อ่านสลิปไม่สำเร็จ กรุณากรอกข้อมูลเองครับ')
      setSlipPreview(null)
      setSlipFile(null)
      setCompressedSlipBlob(null)
    } finally {
      setIsScanning(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (numAmount > 0 && selectedBucketId) {
      setIsLoading(true) // Disable form while processing
      
      let finalSlipUrl = ''
      
      // อัพโหลดรูปภาพที่บีบอัดแล้วขึ้น Supabase Storage (ประหยัดพื้นที่ กว่าไฟล์ต้นฉบับ)
      if (compressedSlipBlob) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('slips')
          .upload(fileName, compressedSlipBlob, { contentType: 'image/jpeg' })
          
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
      if (selectedWalletId) formData.append('wallet_id', selectedWalletId)
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

        {/* Bucket (Budget Envelope) Selector */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="block text-sm font-bold text-gray-900 mb-4">หักจากถังงบ / กระเป๋าเงิน</h3>
          {buckets.length === 0 ? (
            <p className="text-center text-gray-400 py-4">กำลังโหลดถังงบประมาณ...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {buckets.map(bucket => {
                const isSelected = selectedBucketId === bucket.id
                const Icon = bucket.icon === 'shield' ? ShieldCheck : bucket.icon === 'trending-up' ? TrendingUp : bucket.icon === 'wallet' ? WalletIcon : Coffee
                const bucketMonthlyLimit = bucket.monthly_budget ? Number(bucket.monthly_budget) : null
                const bucketSpent = bucketExpenses[bucket.id] || 0
                const linkedWallet = wallets.find(w => w.id === bucket.default_wallet_id)
                
                return (
                  <label 
                    key={bucket.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer active:scale-[0.98] duration-200 ${
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
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: linkedWallet?.color || bucket.color || '#3B82F6' }}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${isSelected ? 'text-rose-700' : 'text-gray-900'}`}>{bucket.name}</p>
                      <p className={`text-xs ${isSelected ? 'text-rose-500' : 'text-gray-500'} mt-0.5`}>
                        คงเหลือ: ฿{Number(bucket.balance).toLocaleString('th-TH')}
                        {bucketMonthlyLimit && (
                          <span className="ml-1 opacity-80">
                            • งบ: ฿{bucketSpent.toLocaleString('th-TH')}/฿{bucketMonthlyLimit.toLocaleString('th-TH')}
                          </span>
                        )}
                      </p>
                      {linkedWallet && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gray-500 bg-white/60 px-2 py-0.5 rounded-md inline-flex border border-gray-100 shadow-2xs">
                          <WalletIcon size={10} style={{ color: linkedWallet.color || '#10b981' }} />
                          <span>หักจากบัญชี: <strong style={{ color: linkedWallet.color || '#10b981' }}>{linkedWallet.name}</strong></span>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="text-rose-500 shrink-0" size={24} />
                    )}
                  </label>
                )
              })}

              {/* Dynamic Budget Warning Alert for selected bucket */}
              {(() => {
                const selectedBucket = buckets.find(b => b.id === selectedBucketId)
                const currentSpent = selectedBucket ? (bucketExpenses[selectedBucket.id] || 0) : 0
                const monthlyLimit = selectedBucket?.monthly_budget ? Number(selectedBucket.monthly_budget) : null
                if (!monthlyLimit || monthlyLimit <= 0) return null

                const projectedSpent = currentSpent + numAmount
                const projectedRatio = Math.round((projectedSpent / monthlyLimit) * 100)

                if (projectedRatio >= 100) {
                  return (
                    <div className="mt-2 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
                      <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">⚠️ การจ่ายครั้งนี้จะทำให้กระเป๋านี้เกินงบประมาณรายเดือน!</p>
                        <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
                          ใช้ไปแล้ว ฿{currentSpent.toLocaleString('th-TH')} {numAmount > 0 ? `+ ฿${numAmount.toLocaleString('th-TH')} = ฿${projectedSpent.toLocaleString('th-TH')}` : ''} (แตะ {projectedRatio}% ของเพดานงบ ฿{monthlyLimit.toLocaleString('th-TH')})
                        </p>
                      </div>
                    </div>
                  )
                }

                if (projectedRatio >= 80) {
                  return (
                    <div className="mt-2 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 animate-in fade-in duration-200">
                      <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">⚡ การจ่ายครั้งนี้จะแตะ {projectedRatio}% ของงบประมาณรายเดือน</p>
                        <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
                          ใช้ไปแล้ว ฿{currentSpent.toLocaleString('th-TH')} {numAmount > 0 ? `+ ฿${numAmount.toLocaleString('th-TH')} = ฿${projectedSpent.toLocaleString('th-TH')}` : ''} จากเพดานงบ ฿{monthlyLimit.toLocaleString('th-TH')}
                        </p>
                      </div>
                    </div>
                  )
                }

                return null
              })()}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={numAmount <= 0 || !selectedBucketId || isScanning || isLoading}
          className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-rose-700 transition-all active:scale-[0.98] duration-200 disabled:opacity-50 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              กำลังบันทึก...
            </>
          ) : (
            'ยืนยันการจ่ายเงิน'
          )}
        </button>
      </form>
    </main>
  )
}
