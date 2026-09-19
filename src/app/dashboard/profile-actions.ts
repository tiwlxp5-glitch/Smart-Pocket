'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  const fullName = (formData.get('full_name') as string)?.trim()
  if (!fullName || fullName.length > 100) {
    return { success: false, message: 'กรุณาระบุชื่อความยาวระหว่าง 1 ถึง 100 ตัวอักษร' }
  }

  // 1. Update Supabase Auth user_metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName }
  })
  if (authError) {
    console.error('Update Auth Error:', authError)
    return { success: false, message: authError.message || 'ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้' }
  }

  // 2. Update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id)

  if (profileError) {
    console.warn('Update profiles table warning:', profileError)
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'บันทึกชื่อโปรไฟล์เรียบร้อยแล้ว' }
}

export async function updateUserPassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || password.length < 6) {
    return { success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }
  }

  if (password !== confirmPassword) {
    return { success: false, message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('Update Password Error:', error)
    return { success: false, message: error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้' }
  }

  return { success: true, message: 'เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว' }
}
