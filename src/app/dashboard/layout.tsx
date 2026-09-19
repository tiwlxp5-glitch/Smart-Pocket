import { BottomNav } from '@/components/BottomNav'
import { SmartAdvisorChat } from '@/components/SmartAdvisorChat'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const maxDuration = 60


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase.from('profiles').select('is_onboarded, display_name').eq('id', user.id).single()

  if (!error && profile && profile.is_onboarded === false) {
    redirect('/onboarding')
  }

  // Fetch data for Smart Advisor context
  const { data: wallets } = await supabase.from('wallets').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
  const { data: buckets } = await supabase.from('buckets').select('*').eq('user_id', user.id).order('created_at', { ascending: true })

  const userName = profile?.display_name || 'คุณผู้ใช้งาน'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-sm">
        {children}
      </div>
      <BottomNav />
      <SmartAdvisorChat wallets={wallets || []} buckets={buckets || []} userName={userName} />
    </div>
  )
}
