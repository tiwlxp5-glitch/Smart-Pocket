'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Bot, Mic, Send, X, Loader2, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { detectBankFromText } from '@/utils/walletHelper'

const WELCOME_MESSAGE = '👋 สวัสดีครับ! ผมคือ Smart Advisor ที่ปรึกษาการเงินของคุณ\n\nถามผมได้เลยนะครับ เช่น:\n- **"สรุปค่าใช้จ่ายเดือนนี้ให้หน่อย"**\n- **"ควรออมเงินเดือนละเท่าไหร่ดี?"**\n- **"กระเป๋าไหนเหลือเงินเยอะสุด?"**\n\n_(หากต้องการบันทึกรายการ กดปุ่ม **+** ที่ด้านล่างได้เลยครับ)_'

export function SmartAdvisorChat({ wallets, buckets }: { wallets: any[], buckets: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [inputText, setInputText] = useState('')
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('open-smart-ai', handleOpen)
    return () => window.removeEventListener('open-smart-ai', handleOpen)
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  })

  const context = {
    wallets: wallets.map(w => ({ id: w.id, name: w.name, balance: w.balance })),
    buckets: buckets.map(b => ({ id: b.id, name: b.name, balance: b.balance })),
    monthlyExpense: 0,
  }

  // FIX: Don't pass welcome message in initial messages array
  // Welcome message is rendered separately as a static UI element
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { context },
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'
  const hasError = status === 'error'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return
    // FIX: sendMessage in AI SDK 7 accepts { text: string } not a full UIMessage object
    sendMessage({ text: inputText.trim() })
    setInputText('')
  }

  // Speech Recognition setup
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.lang = 'th-TH'
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInputText(prev => (prev ? prev + ' ' : '') + transcript)
      setIsListening(false)
    }
    recognitionRef.current.onerror = () => setIsListening(false)
    recognitionRef.current.onend = () => setIsListening(false)
  }, [])

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current?.start()
        setIsListening(true)
      } catch {
        setIsListening(false)
      }
    }
  }

  const renderMessageContent = (m: any) => {
    // Try parts first (AI SDK 7 format)
    if (m.parts && m.parts.length > 0) {
      return m.parts.map((part: any, index: number) => {
        if (part.type !== 'text') return null
        return (
          <div
            key={index}
            className={`px-4 py-2.5 rounded-2xl max-w-[88%] mb-1 ${
              m.role === 'user'
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
            }`}
          >
            <div className="prose prose-sm max-w-none leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-blue-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({ children, ...props }) => {
                    const extractText = (child: any): string => {
                      if (typeof child === 'string') return child
                      if (Array.isArray(child)) return child.map(extractText).join('')
                      if (child?.props?.children) return extractText(child.props.children)
                      return ''
                    }
                    const text = extractText(children)
                    const preset = detectBankFromText(text)
                    return (
                      <strong
                        {...props}
                        style={preset ? { color: preset.color } : {}}
                        className={preset ? 'font-bold' : 'font-semibold text-blue-900'}
                      >
                        {children}
                      </strong>
                    )
                  },
                  em: ({ children, ...props }) => {
                    const extractText = (child: any): string => {
                      if (typeof child === 'string') return child
                      if (Array.isArray(child)) return child.map(extractText).join('')
                      if (child?.props?.children) return extractText(child.props.children)
                      return ''
                    }
                    const text = extractText(children)
                    const preset = detectBankFromText(text)
                    return (
                      <em
                        {...props}
                        style={preset ? { color: preset.color, fontStyle: 'normal', fontWeight: 600 } : {}}
                      >
                        {children}
                      </em>
                    )
                  },
                }}
              >
                {part.text}
              </ReactMarkdown>
            </div>
          </div>
        )
      })
    }

    // Fallback to content (older format)
    if (m.content) {
      return (
        <div className={`px-4 py-2.5 rounded-2xl max-w-[88%] text-sm ${
          m.role === 'user'
            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
        }`}>
          {m.content}
        </div>
      )
    }

    return null
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop close */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          <div className="bg-white w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col relative z-10">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">Smart Advisor</h3>
                  <p className="text-[10px] text-gray-500 leading-tight">ที่ปรึกษาการเงินส่วนตัว</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {/* Static Welcome Message - rendered separately, never sent to API */}
              <div className="flex flex-col items-start">
                <div className="px-4 py-2.5 rounded-2xl max-w-[88%] mb-1 bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm">
                  <div className="prose prose-sm max-w-none leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-blue-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {WELCOME_MESSAGE}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Dynamic Messages from AI SDK */}
              {messages.map((m: any) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {renderMessageContent(m)}
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-start">
                  <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    <span>กำลังวิเคราะห์...</span>
                  </div>
                </div>
              )}

              {/* FIX: Error Display - shows error message and retry button */}
              {hasError && (
                <div className="flex items-start">
                  <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm shadow-sm text-sm space-y-2">
                    <p className="text-red-700">
                      ⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ AI
                      {error?.message && process.env.NODE_ENV === 'development' && (
                        <span className="block text-xs text-red-500 mt-1">{error.message}</span>
                      )}
                    </p>
                    <button
                      onClick={() => {
                        // Find the last user message and retry
                        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
                        if (lastUserMsg) {
                          const textPart = lastUserMsg.parts?.find((p) => p.type === 'text') as { type: 'text'; text: string } | undefined
                          if (textPart) {
                            sendMessage({ text: textPart.text })
                          }
                        }
                      }}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium transition"
                    >
                      <RotateCcw size={14} />
                      ลองใหม่อีกครั้ง
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="ถามเรื่องการเงิน วิเคราะห์ข้อมูล..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-gray-900 text-sm"
                  />
                  <button
                    type="button"
                    onClick={toggleListen}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition ${
                      isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                  >
                    <Mic size={16} />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
