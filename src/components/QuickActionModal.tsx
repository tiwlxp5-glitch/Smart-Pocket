'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, TrendingUp, TrendingDown, ArrowRightLeft, Camera } from 'lucide-react'

interface QuickActionModalProps {
  isOpen: boolean
  onClose: () => void
}

const actions = [
  {
    label: 'รายรับ',
    sublabel: 'บันทึกเงินที่ได้รับ',
    href: '/dashboard/income',
    icon: TrendingUp,
    bgColor: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    ringColor: 'focus:ring-emerald-300',
  },
  {
    label: 'รายจ่าย',
    sublabel: 'บันทึกเงินที่จ่ายออก',
    href: '/dashboard/expense',
    icon: TrendingDown,
    bgColor: 'bg-rose-500',
    lightBg: 'bg-rose-50',
    textColor: 'text-rose-700',
    ringColor: 'focus:ring-rose-300',
  },
  {
    label: 'โอนเงิน',
    sublabel: 'โอนระหว่างกระเป๋า',
    href: '/dashboard/transfer',
    icon: ArrowRightLeft,
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    ringColor: 'focus:ring-blue-300',
  },
  {
    label: 'สแกนสลิป',
    sublabel: 'อ่านสลิปด้วย AI',
    href: '/dashboard/expense#slip',
    icon: Camera,
    bgColor: 'bg-violet-500',
    lightBg: 'bg-violet-50',
    textColor: 'text-violet-700',
    ringColor: 'focus:ring-violet-300',
  },
]

export function QuickActionModal({ isOpen, onClose }: QuickActionModalProps) {
  const router = useRouter()

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const handleAction = (href: string) => {
    onClose()
    router.push(href)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="เลือกประเภทรายการ"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 z-10">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">บันทึกรายการ</h3>
            <p className="text-xs text-gray-500 mt-0.5">เลือกประเภทที่ต้องการบันทึก</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition active:scale-95"
            aria-label="ปิด"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-3 px-6 pb-8">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.href}
                onClick={() => handleAction(action.href)}
                className={`flex flex-col items-start gap-3 p-4 rounded-2xl ${action.lightBg} border border-transparent hover:border-current hover:shadow-md active:scale-[0.97] transition-all duration-150 focus:outline-none focus:ring-2 ${action.ringColor}`}
              >
                <div className={`w-11 h-11 rounded-xl ${action.bgColor} flex items-center justify-center shadow-sm`}>
                  <Icon size={22} className="text-white" />
                </div>
                <div className="text-left">
                  <p className={`font-bold text-sm ${action.textColor}`}>{action.label}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{action.sublabel}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
