'use client'

import { useState, useEffect } from 'react'
import { ArrowDownCircle, PieChart, CheckCircle2, ChevronLeft, Wallet as WalletIcon, Check, Layers, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { addIncome } from '../actions'
import { createBrowserClient } from '@supabase/ssr'
import { Wallet as WalletTypeInterface } from '@/types/database'
import { getWalletTypeLabel } from '@/utils/walletHelper'

interface Bucket {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  balance: number
  allocation_percentage?: number
  default_wallet_id?: string | null
  created_at?: string
}

export default function IncomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const aiAmount = searchParams.get('ai_amount')
  const aiNote = searchParams.get('ai_note')
  const aiWallet = searchParams.get('ai_wallet')
  const aiBucket = searchParams.get('ai_bucket') // Optional for income, but if passed, we can switch to single mode

  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [wallets, setWallets] = useState<WalletTypeInterface[]>([])
  const [selectedWalletId, setSelectedWalletId] = useState<string>(aiWallet || '')
  const [allocationMode, setAllocationMode] = useState<'auto' | 'single'>(aiBucket ? 'single' : 'auto')
  const [selectedBucketId, setSelectedBucketId] = useState<string>(aiBucket || '')
  const [amount, setAmount] = useState<string>(aiAmount || '')
  const [note, setNote] = useState(aiNote || '')
  const [showSplitter, setShowSplitter] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const numAmount = Number(amount) || 0

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      // Fetch buckets
      const { data: bucketData } = await supabase.from('buckets').select('*').eq('is_archived', false).order('created_at')
      if (bucketData) {
        setBuckets(bucketData)
        if (bucketData.length > 0 && !aiBucket) {
          setSelectedBucketId(bucketData[0].id)
        }
      }

      // Fetch wallets
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

      if (bucketData && walletData) {
        // Sort buckets based on their default_wallet_id matching the wallets array order
        const sortedBuckets = [...bucketData].sort((a, b) => {
          const aIndex = walletData.findIndex(w => w.id === a.default_wallet_id)
          const bIndex = walletData.findIndex(w => w.id === b.default_wallet_id)
          const safeAIndex = aIndex >= 0 ? aIndex : 999
          const safeBIndex = bIndex >= 0 ? bIndex : 999
          if (safeAIndex !== safeBIndex) return safeAIndex - safeBIndex
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
        setBuckets(sortedBuckets)
        if (sortedBuckets.length > 0 && !aiBucket) {
          setSelectedBucketId(sortedBuckets[0].id)
        }
      } else if (bucketData) {
        setBuckets(bucketData)
        if (bucketData.length > 0 && !aiBucket) {
          setSelectedBucketId(bucketData[0].id)
        }
      }

      setIsLoading(false)
    }
    fetchData()
  }, [])

  // Auto-select wallet when a single bucket is selected
  useEffect(() => {
    if (allocationMode === 'single' && selectedBucketId && buckets.length > 0) {
      const bucket = buckets.find(b => b.id === selectedBucketId)
      if (bucket?.default_wallet_id) {
        setSelectedWalletId(bucket.default_wallet_id)
      }
    }
  }, [selectedBucketId, buckets, allocationMode])

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
      if (selectedWalletId) formData.append('wallet_id', selectedWalletId)
      formData.append('allocation_mode', allocationMode)
      if (allocationMode === 'single' && selectedBucketId) {
        formData.append('single_bucket_id', selectedBucketId)
      }
      
      try {
        await addIncome(formData)
        setIsSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } catch (error) {
        alert('เกิดข้อผิดพลาดในการบันทึกรายรับ')
        setIsSaving(false)
      }
    }
  }

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId)
  const targetSingleBucket = buckets.find((b) => b.id === selectedBucketId)

  if (isSuccess) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-gray-50 text-center pb-20">
        <CheckCircle2 size={80} className="text-emerald-500 mb-6 animate-bounce" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">บันทึกรายรับสำเร็จ!</h2>
        <p className="text-gray-500">
          เงินเข้าบัญชี {selectedWallet?.name || 'หลัก'} และจัดสรรงบประมาณเรียบร้อยแล้ว
        </p>
      </div>
    )
  }

  return (
    <main className="p-6 pb-24 bg-gray-50 min-h-screen">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600">
          <ChevronLeft size={24} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">บันทึกรายรับ</h1>
          <p className="text-xs text-gray-500">เงินเดือน โบนัส หรือรายรับอื่นๆ</p>
        </div>
      </header>

      {!showSplitter ? (
        <form onSubmit={handleAllocate} className="flex flex-col gap-5">
          {/* Amount Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <ArrowDownCircle size={32} />
            </div>
            <p className="text-gray-500 mb-2 text-xs font-semibold">ยอดเงินที่ได้รับ (บาท)</p>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-5xl font-extrabold text-center text-gray-900 w-full bg-transparent focus:outline-none placeholder:text-gray-300"
              autoFocus
              required
            />
          </div>

          {/* Wallet Selector */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold text-gray-700">
                {allocationMode === 'auto' ? 'สรุปเงินเข้าแต่ละบัญชี (Wallet Breakdown)' : 'เงินเข้ากระเป๋า / บัญชีไหน (Wallet)'}
              </label>
              {allocationMode !== 'auto' && (
                <Link href="/dashboard/wallets" className="text-[11px] text-blue-600 font-semibold hover:underline">
                  + เพิ่มบัญชี
                </Link>
              )}
            </div>

            {wallets.length === 0 ? (
              <p className="text-xs text-gray-400 py-1">ใช้บัญชีเงินสดหลัก</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {wallets.map((w) => {
                  const isSelected = selectedWalletId === w.id
                  
                  // Calculate incoming amount for this wallet in auto mode
                  let incomingAmount = 0
                  if (allocationMode === 'auto') {
                    buckets.forEach(b => {
                      if (b.default_wallet_id === w.id) {
                        incomingAmount += (numAmount * (b.allocation_percentage || 0)) / 100
                      }
                    })
                  }

                  // If auto mode and this wallet gets 0, and it's not the main selected wallet, we might still want to show it, 
                  // but to match the mockup we show all of them with their incoming splits.
                  
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWalletId(w.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all active:scale-[0.98] duration-200 text-left ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs'
                          : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: w.color || '#10b981' }}
                        />
                        <div>
                          <p className="text-xs font-bold text-gray-900 leading-tight">{w.name}</p>
                          <p className="text-[10px] text-gray-500">{getWalletTypeLabel(w.type)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-700">
                        {allocationMode === 'auto' 
                          ? `+฿${incomingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                          : `฿${Number(w.balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                        }
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            
            {allocationMode === 'auto' && (
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                * บัญชีกรอบสีเขียวคือบัญชีที่รับเงินก้อนแรกก่อนระบบจะโอนแยกอัตโนมัติ
              </p>
            )}
          </div>

          {/* Allocation Mode Selector */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-xs font-bold text-gray-700 mb-2">
              การจัดสรรงบประมาณ (Envelope Allocation)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setAllocationMode('auto')}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  allocationMode === 'auto'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PieChart size={14} /> แบ่งตาม % อัตโนมัติ
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('single')}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  allocationMode === 'single'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Layers size={14} /> เลือกถังงบโดยเฉพาะ
              </button>
            </div>

            {allocationMode === 'single' && (
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <p className="text-[11px] text-gray-500 mb-1">เลือกถังงบที่ต้องการใส่เงินก้อนนี้เต็มจำนวน (100%):</p>
                <div className="grid grid-cols-1 gap-2">
                  {buckets.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBucketId(b.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs font-semibold transition-all active:scale-[0.98] duration-200 ${
                        selectedBucketId === b.id
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-2xs'
                          : 'border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{b.name}</span>
                      <span className="text-gray-500">คงเหลือ ฿{Number(b.balance).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Note Input */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-xs font-bold text-gray-700 mb-2">บันทึกช่วยจำ (Note)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น เงินเดือนประจำเดือน, งานฟรีแลนซ์, ปันผล"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={numAmount <= 0 || isLoading}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-700 transition disabled:opacity-50 disabled:bg-gray-400 flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
          >
            <PieChart size={18} />
            {isLoading ? 'กำลังโหลด...' : 'ตรวจสอบและจัดสรรเงิน'}
          </button>
        </form>
      ) : (
        <div className="animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg mb-6">
            <p className="text-emerald-100 text-xs mb-1">ยอดเงินรับเข้า</p>
            <h2 className="text-3xl font-black mb-3">฿{numAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</h2>
            <div className="bg-white/20 p-3 rounded-2xl text-xs flex gap-2 items-center">
              <WalletIcon size={16} />
              <span>เข้ากระเป๋า: <strong>{selectedWallet?.name || 'บัญชีหลัก'}</strong></span>
            </div>
          </div>

          <h3 className="font-bold text-gray-900 mb-3 text-base">สรุปการจัดสรรงบประมาณ</h3>
          
          {allocationMode === 'single' ? (
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-900">{targetSingleBucket?.name}</span>
                <span className="font-black text-emerald-600 text-base">
                  +฿{numAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">กำหนดเข้าถังนี้ 100%</p>
              {(() => {
                const linkedWallet = wallets.find(w => w.id === targetSingleBucket?.default_wallet_id)
                if (linkedWallet) {
                  return (
                    <div className="pt-3 mt-2 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: linkedWallet.color || '#10b981' }} />
                        <span className="text-xs text-gray-600 font-medium">
                          เข้ากระเป๋า: <strong style={{ color: linkedWallet.color || '#10b981' }}>{linkedWallet.name}</strong>
                        </span>
                      </div>
                      {linkedWallet.id !== selectedWalletId && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">โอนอัตโนมัติ</span>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </div>
          ) : (
            <div className="flex flex-col gap-3 mb-8">
              {buckets.map((bucket) => {
                const allocated = (numAmount * (bucket.allocation_percentage || 0)) / 100
                const linkedWallet = wallets.find(w => w.id === bucket.default_wallet_id)
                return (
                  <div key={bucket.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: bucket.color || '#10b981' }}
                        />
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{bucket.name}</h4>
                          <p className="text-[11px] text-gray-400">สัดส่วน {bucket.allocation_percentage}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 text-sm">
                          +฿{allocated.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    {linkedWallet && (
                      <div className="pt-3 mt-1 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: linkedWallet.color || '#10b981' }} />
                          <span className="text-xs text-gray-600 font-medium">
                            เข้ากระเป๋า: <strong style={{ color: linkedWallet.color || '#10b981' }}>{linkedWallet.name}</strong>
                          </span>
                        </div>
                        {linkedWallet.id !== selectedWalletId && (
                           <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">โอนอัตโนมัติ</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowSplitter(false)}
              className="flex-1 py-3.5 border border-gray-300 rounded-2xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              แก้ไขข้อมูล
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className="flex-2 py-3.5 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-all active:scale-[0.98] duration-200 shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  กำลังบันทึก...
                </>
              ) : (
                'ยืนยันการบันทึกรายรับ'
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
