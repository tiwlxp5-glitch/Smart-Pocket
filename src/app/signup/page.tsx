import { signup } from '@/app/login/actions'
import Image from 'next/image'
import Link from 'next/link'
import { AuthCard } from '@/components/AuthCard'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 overflow-hidden">
      <AuthCard mode="signup">
        <div className="flex flex-col items-center mb-8">
          <Image src="/app-icon-clean-buckets.svg" alt="Smart Pocket Logo" width={64} height={64} className="mb-4 shadow-sm rounded-2xl" />
          <h1 className="text-2xl font-bold text-gray-900">สร้างบัญชีใหม่</h1>
          <p className="text-gray-500 text-sm mt-1">เริ่มต้นจัดการเงินของคุณง่ายๆ</p>
        </div>

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="full_name">
              ชื่อ-นามสกุล
            </label>
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              id="full_name"
              name="full_name"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              อีเมล
            </label>
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)
            </label>
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
          
          {params?.error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">
              {params.error}
            </div>
          )}

          <div className="flex flex-col gap-4 mt-4">
            <button
              formAction={signup}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              สมัครสมาชิก
            </button>
            
            <div className="text-center text-sm text-gray-500">
              มีบัญชีอยู่แล้ว?{' '}
              <Link href="/login" className="text-blue-600 font-medium hover:underline">
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </form>
      </AuthCard>
    </div>
  )
}
