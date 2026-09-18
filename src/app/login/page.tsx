import { login } from './actions'
import Image from 'next/image'
import Link from 'next/link'
import { AuthCard } from '@/components/AuthCard'
import { SubmitButton } from '@/components/SubmitButton'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 overflow-hidden">
      <AuthCard mode="login">
        <div className="flex flex-col items-center mb-8">
          <Image src="/app-icon-clean-buckets.svg" alt="Smart Pocket Logo" width={64} height={64} className="mb-4 shadow-sm rounded-2xl" />
          <h1 className="text-2xl font-bold text-gray-900">Smart Pocket</h1>
          <p className="text-gray-500 text-sm mt-1">จัดการเงินง่ายๆ แบบอัตโนมัติ</p>
        </div>

        <form action={login} className="flex flex-col gap-4">
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
              รหัสผ่าน
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
            <SubmitButton pendingText="กำลังเข้าสู่ระบบ...">
              เข้าสู่ระบบ
            </SubmitButton>
            
            <div className="text-center text-sm text-gray-500 mt-2">
              ยังไม่มีบัญชี?{' '}
              <Link href="/signup" className="text-blue-600 font-medium hover:underline p-2 inline-block">
                สมัครสมาชิก
              </Link>
            </div>
          </div>
        </form>
      </AuthCard>
    </div>
  )
}
