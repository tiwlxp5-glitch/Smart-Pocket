'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  // [DEV MODE] บายพาสล็อกอินเมื่อยังไม่ได้ใส่ API Key จริง
  if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mockproject.supabase.co') {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(`/login?error=Could not authenticate user`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  // [DEV MODE] บายพาสสมัครสมาชิกเมื่อยังไม่ได้ใส่ API Key จริง
  if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mockproject.supabase.co') {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
