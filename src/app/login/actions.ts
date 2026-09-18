'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    let thError = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
    if (error.message.includes('Invalid login credentials')) {
      thError = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
    } else if (error.message.includes('Email not confirmed')) {
      thError = 'กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ'
    }
    redirect(`/login?error=${encodeURIComponent(thError)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
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
    let thError = 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
    if (error.message.includes('User already registered')) {
      thError = 'อีเมลนี้มีผู้ใช้งานแล้ว'
    } else if (error.message.includes('Password should be at least')) {
      thError = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    } else if (error.message.includes('invalid format')) {
      thError = 'รูปแบบอีเมลไม่ถูกต้อง'
    }
    redirect(`/signup?error=${encodeURIComponent(thError)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
