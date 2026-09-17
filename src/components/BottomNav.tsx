'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, ScrollText, PieChart } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  const tabs = [
    { name: 'หน้าแรก', href: '/dashboard', icon: LayoutDashboard },
    { name: 'รับเงิน', href: '/dashboard/income', icon: ArrowDownCircle, color: 'text-emerald-500' },
    { name: 'จ่ายเงิน', href: '/dashboard/expense', icon: ArrowUpCircle, color: 'text-rose-500' },
    { name: 'สถิติ', href: '/dashboard/analytics', icon: PieChart },
    { name: 'ประวัติ', href: '/dashboard/history', icon: ScrollText },
  ]

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon
          
          return (
            <Link 
              key={tab.href} 
              href={tab.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Icon size={24} className={tab.color && !isActive ? tab.color : ''} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
