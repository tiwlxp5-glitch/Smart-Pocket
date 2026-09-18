'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ScrollText, Plus, PieChart, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { QuickActionModal } from './QuickActionModal'

export function BottomNav() {
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    setPendingHref(null)
    setIsModalOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!pendingHref) return
    const timer = setTimeout(() => {
      setPendingHref(null)
    }, 6000)
    return () => clearTimeout(timer)
  }, [pendingHref])

  const tabsLeft = [
    { name: 'หน้าแรก', href: '/dashboard', icon: LayoutDashboard },
    { name: 'ประวัติ', href: '/dashboard/history', icon: ScrollText },
  ]

  const tabsRight = [
    { name: 'สถิติ', href: '/dashboard/analytics', icon: PieChart },
    { name: 'ตั้งค่า', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <>
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2 relative">

          {tabsLeft.map((tab) => {
            const isActive = pathname === tab.href || pendingHref === tab.href
            const isPending = pendingHref === tab.href && pathname !== tab.href
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => {
                  if (pathname !== tab.href) {
                    setPendingHref(tab.href)
                  }
                }}
                className={`flex flex-col items-center justify-center w-16 h-full space-y-1 active:scale-90 transition-all duration-200 ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                } ${isPending ? 'opacity-80 animate-pulse' : ''}`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isPending ? 'scale-110 transition-transform' : ''} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                  {tab.name}
                </span>
              </Link>
            )
          })}

          {/* Center FAB: Quick Add */}
          <div className="relative -top-5 flex justify-center w-20">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex flex-col items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30 text-white active:scale-90 transition-transform duration-200 border-4 border-gray-50"
              aria-label="บันทึกรายการ"
            >
              <Plus size={26} strokeWidth={2.5} />
            </button>
          </div>

          {tabsRight.map((tab) => {
            const isActive = pathname === tab.href || pendingHref === tab.href
            const isPending = pendingHref === tab.href && pathname !== tab.href
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => {
                  if (pathname !== tab.href) {
                    setPendingHref(tab.href)
                  }
                }}
                className={`flex flex-col items-center justify-center w-16 h-full space-y-1 active:scale-90 transition-all duration-200 ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                } ${isPending ? 'opacity-80 animate-pulse' : ''}`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isPending ? 'scale-110 transition-transform' : ''} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                  {tab.name}
                </span>
              </Link>
            )
          })}

        </div>
      </nav>

      <QuickActionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
