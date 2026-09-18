'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ScrollText, PieChart, Settings, Sparkles } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  const tabsLeft = [
    { name: 'หน้าแรก', href: '/dashboard', icon: LayoutDashboard },
    { name: 'ประวัติ', href: '/dashboard/history', icon: ScrollText },
  ]
  
  const tabsRight = [
    { name: 'สถิติ', href: '/dashboard/analytics', icon: PieChart },
    { name: 'ตั้งค่า', href: '/dashboard/settings', icon: Settings },
  ]

  const handleOpenSmartAI = (e: React.MouseEvent) => {
    e.preventDefault()
    window.dispatchEvent(new Event('open-smart-ai'))
  }

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2 relative">
        
        {tabsLeft.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon
          return (
            <Link key={tab.href} href={tab.href} className={`flex flex-col items-center justify-center w-16 h-full space-y-1 active:scale-90 transition-transform duration-200 ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>{tab.name}</span>
            </Link>
          )
        })}

        {/* Center Big AI Button */}
        <div className="relative -top-5 flex justify-center w-20">
          <button 
            onClick={handleOpenSmartAI}
            className="flex flex-col items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-500/30 text-white active:scale-90 transition-transform duration-200 border-4 border-gray-50"
          >
            <Sparkles size={24} className="animate-pulse" />
          </button>
        </div>

        {tabsRight.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon
          return (
            <Link key={tab.href} href={tab.href} className={`flex flex-col items-center justify-center w-16 h-full space-y-1 active:scale-90 transition-transform duration-200 ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>{tab.name}</span>
            </Link>
          )
        })}

      </div>
    </nav>
  )
}
