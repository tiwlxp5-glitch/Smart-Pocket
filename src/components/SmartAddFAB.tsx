'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Mic, Send, X, AlertCircle, Bot, Loader2 } from 'lucide-react'
import { parseSmartAddText } from '@/app/actions/smart-add-action'

export function SmartAddFAB({ wallets, buckets }: { wallets: any[], buckets: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'th-TH'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setText(prev => (prev ? prev + ' ' : '') + transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsListening(false)
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  const handleProcess = async () => {
    if (!text.trim()) return
    setIsProcessing(true)
    setError(null)
    
    try {
      const result = await parseSmartAddText(text)
      if (result.success && result.data) {
        setPreview(result.data)
      } else {
        setError(result.message || 'เกิดข้อผิดพลาดในการวิเคราะห์')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle closing and reset state
  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => {
      setText('')
      setPreview(null)
      setError(null)
    }, 300)
  }

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform z-40 group"
      >
        <Sparkles size={24} className="group-hover:animate-pulse" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center gap-2 text-purple-700 font-bold">
                <Bot size={20} />
                <h3>พิมพ์บอก AI (Smart Add)</h3>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {!preview ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    จดบันทึกได้ง่ายๆ แค่พิมพ์หรือพูด เช่น <br/>
                    <span className="font-semibold text-purple-600">"กินชาบู 599 จ่ายผ่านบัตรเครดิต"</span> หรือ <br/>
                    <span className="font-semibold text-blue-600">"เงินเดือนเข้า 30000 เข้ากสิกร"</span>
                  </p>
                  
                  <div className="relative">
                    <textarea 
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="พิมพ์เพื่อบันทึก..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 pr-12 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition resize-none text-gray-900"
                    />
                    <button 
                      onClick={toggleListen}
                      className={`absolute right-3 top-3 p-2 rounded-full transition ${isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-gray-200 text-gray-500 hover:text-purple-600'}`}
                      title="พูดแทนพิมพ์"
                    >
                      <Mic size={18} />
                    </button>
                  </div>

                  {error && (
                    <div className="mt-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button 
                    onClick={handleProcess}
                    disabled={!text.trim() || isProcessing}
                    className="mt-6 w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                  >
                    {isProcessing ? (
                      <><Loader2 size={18} className="animate-spin" /> กำลังวิเคราะห์...</>
                    ) : (
                      <><Send size={18} /> ให้ AI วิเคราะห์</>
                    )}
                  </button>
                </>
              ) : (
                <div className="animate-in fade-in duration-300">
                  <div className="mb-4 flex items-center justify-center gap-2 text-emerald-600 font-bold bg-emerald-50 py-2 rounded-xl">
                    <Sparkles size={18} />
                    <span>AI วิเคราะห์สำเร็จ!</span>
                  </div>
                  
                  <div className="space-y-3 bg-gray-50 p-4 rounded-2xl mb-6 text-sm border border-gray-100">
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500">ประเภท</span>
                      <span className="font-bold capitalize text-gray-900">{preview.type === 'expense' ? 'จ่ายเงิน' : preview.type === 'income' ? 'รับเงิน' : 'โอนเงิน'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-500">จำนวนเงิน</span>
                      <span className="font-bold text-gray-900 text-base">฿{Number(preview.amount).toLocaleString('th-TH')}</span>
                    </div>
                    {preview.wallet_id && (
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-gray-500">{preview.type === 'transfer' ? 'จากกระเป๋า' : 'กระเป๋า'}</span>
                        <span className="font-bold text-gray-900">{wallets.find(w => w.id === preview.wallet_id)?.name || 'ไม่ทราบ'}</span>
                      </div>
                    )}
                    {preview.to_wallet_id && preview.type === 'transfer' && (
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-gray-500">ไปกระเป๋า</span>
                        <span className="font-bold text-gray-900">{wallets.find(w => w.id === preview.to_wallet_id)?.name || 'ไม่ทราบ'}</span>
                      </div>
                    )}
                    {preview.bucket_id && preview.type !== 'transfer' && (
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-gray-500">หมวดหมู่/ถังงบ</span>
                        <span className="font-bold text-gray-900">{buckets.find(b => b.id === preview.bucket_id)?.name || preview.category}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">บันทึกช่วยจำ</span>
                      <span className="font-medium text-gray-900">{preview.note || '-'}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setPreview(null)}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
                    >
                      แก้ไข/พิมพ์ใหม่
                    </button>
                    <form className="flex-1" action={preview.type === 'income' ? '/dashboard/income' : preview.type === 'transfer' ? '/dashboard/transfer' : '/dashboard/expense'} method="GET">
                      <input type="hidden" name="ai_amount" value={preview.amount} />
                      <input type="hidden" name="ai_note" value={preview.note} />
                      <input type="hidden" name="ai_wallet" value={preview.wallet_id || ''} />
                      {preview.type === 'transfer' && <input type="hidden" name="ai_to_wallet" value={preview.to_wallet_id || ''} />}
                      {preview.type !== 'transfer' && <input type="hidden" name="ai_bucket" value={preview.bucket_id || ''} />}
                      
                      <button 
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-md transition"
                      >
                        ถัดไป (ตรวจสอบ)
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
