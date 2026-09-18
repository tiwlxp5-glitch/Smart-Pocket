import Link from 'next/link'
import Image from 'next/image'
import { Wallet, ArrowRight, ShieldCheck, PieChart, TrendingUp } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Image src="/app-icon-clean-buckets.svg" alt="Smart Pocket Logo" width={32} height={32} className="rounded-lg shadow-sm" />
          <span className="font-bold text-xl text-gray-900">Smart Pocket</span>
        </div>
        <Link 
          href="/login" 
          className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition"
        >
          เข้าสู่ระบบ
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto">
        <Image src="/app-icon-clean-buckets.svg" alt="Smart Pocket Logo" width={72} height={72} className="mb-6 shadow-md rounded-[1.25rem]" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          จัดการเงินของคุณ <br className="hidden md:block" />
          <span className="text-blue-600">ฉลาดขึ้น อัตโนมัติขึ้น</span>
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-xl">
          บอกลาการจดบัญชีแบบเดิมๆ ด้วยระบบ Pocket Split ช่วยแบ่งเงินรายรับเข้ากระเป๋าต่างๆ ทันที พร้อมควบคุมรายจ่ายไม่ให้บานปลาย
        </p>

        <Link 
          href="/login"
          className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          เริ่มต้นใช้งานฟรี <ArrowRight size={20} />
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <PieChart className="text-emerald-500 mb-4" size={28} />
            <h3 className="font-bold text-gray-900 mb-2">จัดสรรเงินอัตโนมัติ</h3>
            <p className="text-gray-500 text-sm">รับเงินปุ๊บ แบ่งเข้ากระเป๋าเก็บ ลงทุน และใช้จ่ายทันที</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <ShieldCheck className="text-amber-500 mb-4" size={28} />
            <h3 className="font-bold text-gray-900 mb-2">ปลอดภัยด้วย Cloud</h3>
            <p className="text-gray-500 text-sm">ข้อมูลไม่หายแน่นอน ซิงค์ผ่านคลาวด์มาตรฐานโลก</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <TrendingUp className="text-blue-500 mb-4" size={28} />
            <h3 className="font-bold text-gray-900 mb-2">เห็นภาพรวมชัดเจน</h3>
            <p className="text-gray-500 text-sm">จ่ายเงินจากถังที่กำหนด ไม่เผลอเอาเงินเก็บมาใช้</p>
          </div>
        </div>
      </main>
    </div>
  )
}
