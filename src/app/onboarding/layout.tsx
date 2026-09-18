import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // If already onboarded, redirect to dashboard so they can't redo it here (they can edit in settings)
  const { data: profile, error } = await supabase.from('profiles').select('is_onboarded').eq('id', user.id).single()
  if (!error && profile && profile.is_onboarded) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
