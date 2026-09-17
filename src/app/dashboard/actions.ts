'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateRecurringInput, formatDateISO, RecurringFrequency, RecurringType } from '@/utils/recurringHelper'

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const amount = Number(formData.get('amount'))
  const note = formData.get('note') as string
  const bucketId = formData.get('bucket_id') as string
  const slipUrl = formData.get('slip_url') as string || null
  const receiver = formData.get('receiver') as string || null

  if (!bucketId || amount <= 0) throw new Error('Invalid input')

  const { error } = await supabase.rpc('process_expense', {
    p_user_id: user.id,
    p_bucket_id: bucketId,
    p_amount: amount,
    p_category: 'expense',
    p_note: note,
    p_date: new Date().toISOString(),
    p_slip_url: slipUrl,
    p_receiver: receiver
  })

  if (error) {
    console.error('Error adding expense:', error)
    throw new Error('Failed to deduct expense')
  }

  revalidatePath('/dashboard', 'layout')
}

export async function addIncome(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const amount = Number(formData.get('amount'))
  const note = formData.get('note') as string

  if (amount <= 0) throw new Error('Invalid input')

  // 1. Fetch user's buckets
  const { data: buckets } = await supabase
    .from('buckets')
    .select('*')
    .eq('user_id', user.id)

  if (!buckets) throw new Error('No buckets found')

  // 2. Insert Income Transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'income',
      amount: amount,
      category: 'income',
      note: note,
    })
    .select()
    .single()

  if (txError) throw new Error('Failed to create transaction')

  // 3. Allocate to buckets (Client/Server loop since no RPC for income yet)
  // เหมาะสมกว่าถ้าทำใน RPC แต่สำหรับ Prototype สามารถใช้ loop ได้
  for (const bucket of buckets) {
    const allocatedAmount = (amount * bucket.allocation_percentage) / 100
    if (allocatedAmount <= 0) continue;

    // Insert allocation log
    await supabase.from('allocations').insert({
      user_id: user.id,
      income_transaction_id: tx.id,
      bucket_id: bucket.id,
      amount: allocatedAmount
    })

    // Update bucket balance
    await supabase
      .from('buckets')
      .update({ balance: Number(bucket.balance) + allocatedAmount })
      .eq('id', bucket.id)
      .eq('user_id', user.id)
  }

  revalidatePath('/dashboard', 'layout')
}

export async function moveToTrash(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { data, error } = await supabase.rpc('move_to_trash', {
    p_tx_id: transactionId,
    p_user_id: user.id
  })

  if (error || !data) {
    throw new Error('Failed to move to trash')
  }
  revalidatePath('/dashboard', 'layout')
}

export async function restoreFromTrash(transactionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { data, error } = await supabase.rpc('restore_from_trash', {
    p_tx_id: transactionId,
    p_user_id: user.id
  })

  if (error || !data) {
    throw new Error('Failed to restore from trash')
  }
  revalidatePath('/dashboard', 'layout')
}

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

export async function updateBucketBudget(bucketId: string, monthlyBudget: number | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  if (monthlyBudget !== null && monthlyBudget < 0) {
    return { success: false, message: 'งบประมาณต้องไม่ติดลบ' }
  }

  const { error } = await supabase
    .from('buckets')
    .update({ monthly_budget: monthlyBudget })
    .eq('id', bucketId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Update Bucket Budget Error:', error)
    return { success: false, message: 'ไม่สามารถบันทึกเพดานงบประมาณได้' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'บันทึกงบประมาณเรียบร้อยแล้ว' }
}

export async function createRecurringSchedule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  const type = (formData.get('type') as RecurringType) || 'expense'
  const amount = Number(formData.get('amount'))
  const category = (formData.get('category') as string)?.trim() || (type === 'income' ? 'รายรับประจำ' : 'ค่าใช้จ่ายประจำ')
  const note = (formData.get('note') as string)?.trim() || null
  const bucketId = (formData.get('bucket_id') as string) || null
  const frequency = (formData.get('frequency') as RecurringFrequency) || 'monthly'
  const rawDayOfMonth = formData.get('day_of_month')
  const dayOfMonth = rawDayOfMonth ? Number(rawDayOfMonth) : null
  const rawDayOfWeek = formData.get('day_of_week')
  const dayOfWeek = rawDayOfWeek !== null && rawDayOfWeek !== '' ? Number(rawDayOfWeek) : null
  const startDate = (formData.get('start_date') as string) || formatDateISO(new Date())
  const rawEndDate = formData.get('end_date') as string
  const endDate = rawEndDate?.trim() ? rawEndDate.trim() : null
  const autoProcess = formData.get('auto_process') === 'false' ? false : true

  const validation = validateRecurringInput({
    type,
    amount,
    frequency,
    day_of_month: dayOfMonth,
    day_of_week: dayOfWeek,
    start_date: startDate,
    end_date: endDate,
    bucket_id: bucketId,
    category,
    note,
  })

  if (!validation.valid) {
    return { success: false, message: validation.message || 'ข้อมูลไม่ถูกต้อง' }
  }

  const { data, error } = await supabase
    .from('recurring_schedules')
    .insert({
      user_id: user.id,
      type,
      bucket_id: type === 'expense' ? bucketId : null,
      amount,
      category,
      note,
      frequency,
      day_of_month: dayOfMonth,
      day_of_week: dayOfWeek,
      start_date: startDate,
      end_date: endDate,
      next_run_date: startDate,
      is_active: true,
      auto_process: autoProcess,
    })
    .select()
    .single()

  if (error) {
    console.error('Create Recurring Schedule Error:', error)
    return { success: false, message: error.message || 'ไม่สามารถสร้างรายการประจำได้' }
  }

  revalidatePath('/dashboard/recurring')
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'สร้างรายการประจำสำเร็จ', data }
}

export async function updateRecurringSchedule(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  const type = (formData.get('type') as RecurringType) || 'expense'
  const amount = Number(formData.get('amount'))
  const category = (formData.get('category') as string)?.trim() || (type === 'income' ? 'รายรับประจำ' : 'ค่าใช้จ่ายประจำ')
  const note = (formData.get('note') as string)?.trim() || null
  const bucketId = (formData.get('bucket_id') as string) || null
  const frequency = (formData.get('frequency') as RecurringFrequency) || 'monthly'
  const rawDayOfMonth = formData.get('day_of_month')
  const dayOfMonth = rawDayOfMonth ? Number(rawDayOfMonth) : null
  const rawDayOfWeek = formData.get('day_of_week')
  const dayOfWeek = rawDayOfWeek !== null && rawDayOfWeek !== '' ? Number(rawDayOfWeek) : null
  const startDate = (formData.get('start_date') as string) || formatDateISO(new Date())
  const rawEndDate = formData.get('end_date') as string
  const endDate = rawEndDate?.trim() ? rawEndDate.trim() : null
  const autoProcess = formData.get('auto_process') === 'false' ? false : true

  const validation = validateRecurringInput({
    type,
    amount,
    frequency,
    day_of_month: dayOfMonth,
    day_of_week: dayOfWeek,
    start_date: startDate,
    end_date: endDate,
    bucket_id: bucketId,
    category,
    note,
  })

  if (!validation.valid) {
    return { success: false, message: validation.message || 'ข้อมูลไม่ถูกต้อง' }
  }

  const { error } = await supabase
    .from('recurring_schedules')
    .update({
      type,
      bucket_id: type === 'expense' ? bucketId : null,
      amount,
      category,
      note,
      frequency,
      day_of_month: dayOfMonth,
      day_of_week: dayOfWeek,
      start_date: startDate,
      end_date: endDate,
      auto_process: autoProcess,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Update Recurring Schedule Error:', error)
    return { success: false, message: error.message || 'ไม่สามารถอัปเดตรายการประจำได้' }
  }

  revalidatePath('/dashboard/recurring')
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'บันทึกการแก้ไขเรียบร้อยแล้ว' }
}

export async function deleteRecurringSchedule(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  const { error } = await supabase
    .from('recurring_schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Delete Recurring Schedule Error:', error)
    return { success: false, message: error.message || 'ไม่สามารถลบรายการประจำได้' }
  }

  revalidatePath('/dashboard/recurring')
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'ลบรายการประจำเรียบร้อยแล้ว' }
}

export async function toggleRecurringActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  const { error } = await supabase
    .from('recurring_schedules')
    .update({ 
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Toggle Recurring Active Error:', error)
    return { success: false, message: error.message || 'ไม่สามารถเปลี่ยนสถานะได้' }
  }

  revalidatePath('/dashboard/recurring')
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: isActive ? 'เปิดใช้งานรายการประจำแล้ว' : 'ปิดใช้งานรายการประจำชั่วคราวแล้ว' }
}

export async function checkAndProcessRecurringAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, processedCount: 0, totalExpense: 0, totalIncome: 0, message: 'Not authenticated' }
  }

  try {
    const { data, error } = await supabase.rpc('process_due_recurring_transactions', {
      p_user_id: user.id,
    })

    if (error) {
      console.warn('Lazy Evaluation Runner warning:', error.message)
      return { success: false, processedCount: 0, totalExpense: 0, totalIncome: 0, message: error.message }
    }

    const processedCount = Number(data?.processed_count) || 0
    const totalExpense = Number(data?.total_expense) || 0
    const totalIncome = Number(data?.total_income) || 0

    if (processedCount > 0) {
      revalidatePath('/dashboard', 'layout')
      revalidatePath('/dashboard/history')
      revalidatePath('/dashboard/analytics')
      revalidatePath('/dashboard/recurring')
    }

    return {
      success: true,
      processedCount,
      totalExpense,
      totalIncome,
      message: `ประมวลผลรายการประจำแล้ว ${processedCount} รายการ`,
    }
  } catch (err: any) {
    console.warn('Lazy Evaluation Runner caught exception:', err?.message)
    return { success: false, processedCount: 0, totalExpense: 0, totalIncome: 0, message: err?.message }
  }
}
