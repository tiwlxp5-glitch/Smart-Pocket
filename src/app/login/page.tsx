import { login, signup } from './actions'
import { Wallet } from 'lucide-react'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 text-white">
            <Wallet size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Pocket</h1>
          <p className="text-gray-500 text-sm mt-1">จัดการเงินง่ายๆ แบบอัตโนมัติ</p>
        </div>

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="full_name">
              ชื่อ-นามสกุล (สำหรับสมัครสมาชิก)
            </label>
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              id="full_name"
              name="full_name"
              placeholder="John Doe"
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

          <div className="flex flex-col gap-2 mt-4">
            <button
              formAction={login}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              เข้าสู่ระบบ
            </button>
            <button
              formAction={signup}
              className="w-full bg-white text-gray-700 border border-gray-200 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              สมัครสมาชิก
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
