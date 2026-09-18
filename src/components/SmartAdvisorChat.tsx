'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Sparkles, Mic, Send, X, Bot, Check, ArrowRightLeft, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { createDirectTransaction } from '@/app/actions/transaction-action'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { detectBankFromText } from '@/utils/walletHelper'

export function SmartAdvisorChat({ wallets, buckets }: { wallets: any[], buckets: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [input, setInput] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('open-smart-ai', handleOpen)
    return () => window.removeEventListener('open-smart-ai', handleOpen)
  }, [])
  
  // Calculate some context to send
  const context = {
    wallets: wallets.map(w => ({ id: w.id, name: w.name, balance: w.balance })),
    buckets: buckets.map(b => ({ id: b.id, name: b.name, balance: b.balance })),
    monthlyExpense: 0 // Optional: pass real data if we pass it down
  }

  const { messages, sendMessage, status, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { context }
    }),
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: 'หวัดดีเพื่อน! เดือนนี้ใช้เงินเป็นไงบ้าง มีอะไรให้ช่วยบันทึกหรือปรึกษาบอกมาได้เลยนะ 💸' }]
      } as any
    ]
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ id: String(Date.now()), role: 'user', parts: [{ type: 'text', text: input.trim() }] } as any)
    setInput('')
  }

  // Speech Recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'th-TH'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(prev => (prev ? prev + ' ' : '') + transcript)
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

  const handleConfirmTransaction = async (toolCallId: string, args: any) => {
    try {
      const result = await createDirectTransaction(args)
      if (result.success) {
        addToolResult({
          toolCallId,
          tool: 'prepareTransaction',
          output: { success: true, message: 'บันทึกสำเร็จเรียบร้อย!' }
        })
      } else {
        addToolResult({
          toolCallId,
          tool: 'prepareTransaction',
          output: { success: false, message: result.message || 'บันทึกไม่สำเร็จ' }
        })
      }
    } catch (error: any) {
      addToolResult({
        toolCallId,
        tool: 'prepareTransaction',
        output: { success: false, message: error.message }
      })
    }
  }

  return (
    <>
      {/* Slide-over Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
          
          <div className="bg-white w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col relative z-10">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50 shrink-0">
              <div className="flex items-center gap-2 text-purple-700 font-bold">
                <Bot size={22} />
                <h3 className="text-lg">Smart Advisor</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white transition">
                <X size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.map((m: any) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.parts ? m.parts.map((part: any, index: number) => {
                    if (part.type === 'text') {
                      return (
                        <div key={index} className={`px-4 py-2.5 rounded-2xl max-w-[85%] mb-2 ${
                          m.role === 'user' 
                            ? 'bg-gradient-to-tr from-purple-600 to-blue-500 text-white rounded-tr-sm shadow-sm' 
                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                        }`}>
                          <div className="prose prose-sm max-w-none leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-purple-800">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                strong: ({ node, children, ...props }) => {
                                  // Extract text from children
                                  const extractText = (child: any): string => {
                                    if (typeof child === 'string') return child;
                                    if (Array.isArray(child)) return child.map(extractText).join('');
                                    if (child?.props?.children) return extractText(child.props.children);
                                    return '';
                                  };
                                  const text = extractText(children);
                                  const preset = detectBankFromText(text);

                                  return (
                                    <strong 
                                      {...props} 
                                      style={preset ? { color: preset.color } : {}}
                                      className={preset ? "font-bold" : "font-semibold text-purple-900"}
                                    >
                                      {children}
                                    </strong>
                                  );
                                }
                              }}
                            >
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )
                    } else if (part.type === 'tool-invocation' && part.toolInvocation.toolName === 'prepareTransaction') {
                      const args = part.toolInvocation.args;
                      const isResolved = 'result' in part.toolInvocation;
                      const result = isResolved ? part.toolInvocation.result : null;

                      // Display Card
                      return (
                        <div key={part.toolInvocation.toolCallId} className="mt-2 w-full max-w-[90%] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            {args.type === 'expense' ? <TrendingDown size={18} className="text-rose-500" /> : 
                             args.type === 'income' ? <TrendingUp size={18} className="text-emerald-500" /> : 
                             <ArrowRightLeft size={18} className="text-blue-500" />}
                            <span className="font-bold text-gray-800">
                              {args.type === 'expense' ? 'เตรียมบันทึกรายจ่าย' : args.type === 'income' ? 'เตรียมบันทึกรายรับ' : 'เตรียมบันทึกโอนเงิน'}
                            </span>
                          </div>
                          
                          <div className="space-y-1.5 mb-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">จำนวนเงิน:</span>
                              <span className="font-bold text-gray-900">฿{Number(args.amount).toLocaleString('th-TH')}</span>
                            </div>
                            {args.walletId && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">กระเป๋า:</span>
                                <span className="font-medium text-gray-900">
                                  {wallets.find(w => w.id === args.walletId)?.name || 'ไม่ทราบ'}
                                </span>
                              </div>
                            )}
                            {args.bucketId && args.type !== 'transfer' && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">หมวดหมู่:</span>
                                <span className="font-medium text-gray-900">
                                  {buckets.find(b => b.id === args.bucketId)?.name || 'ไม่ทราบ'}
                                </span>
                              </div>
                            )}
                            {args.note && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">โน้ต:</span>
                                <span className="font-medium text-gray-900">{args.note}</span>
                              </div>
                            )}
                          </div>

                          {!isResolved ? (
                            <button 
                              onClick={() => handleConfirmTransaction(part.toolInvocation.toolCallId, args)}
                              className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition"
                            >
                              <Check size={16} /> ยืนยันบันทึกรายการ
                            </button>
                          ) : (
                            <div className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold ${
                              result.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {result.success ? 'บันทึกสำเร็จแล้ว ✅' : `เกิดข้อผิดพลาด: ${result.message}`}
                            </div>
                          )}
                        </div>
                      )
                    }
                    return null;
                  }) : m.content ? (
                    <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-tr from-purple-600 to-blue-500 text-white rounded-tr-sm shadow-sm' 
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                    }`}>
                      {m.content}
                    </div>
                  ) : null}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start">
                  <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 size={16} className="animate-spin" /> กำลังพิมพ์...
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="พิมพ์หรือพูดเพื่อบันทึก..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full py-3.5 pl-5 pr-24 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition text-gray-900 text-sm"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={toggleListen}
                    className={`p-2 rounded-full transition ${isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-gray-400 hover:text-purple-600 hover:bg-gray-100'}`}
                  >
                    <Mic size={18} />
                  </button>
                  <button 
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 transition"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
