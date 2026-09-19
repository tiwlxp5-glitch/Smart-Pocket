'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateRecurringInput, formatDateISO, RecurringFrequency, RecurringType } from '@/utils/recurringHelper'

export async function createRecurringSchedule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  const type = (formData.get('type') as RecurringType) || 'expense'
  const amount = Number(formData.get('amount'))
  const category = (formData.get('category') as string)?.trim() || (type === 'income' ? 'รายรับประจำ' : 'ค่าใช้จ่ายประจำ')
  const note = (formData.get('note') as string)?.trim() || null
  const bucketId = (formData.get('bucket_id') as string) || null
  const walletId = (formData.get('wallet_id') as string) || null
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
      wallet_id: walletId,
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
  const walletId = (formData.get('wallet_id') as string) || null
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
      wallet_id: walletId,
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
    let totalProcessedCount = 0;
    let totalExpenseSum = 0;
    let totalIncomeSum = 0;
    let currentProcessedCount = 0;
    let loopCount = 0;
    const MAX_LOOPS = 5;
    let lastError = null;

    let hasMorePending = false;
    do {
      const { data, error } = await supabase.rpc('process_due_recurring_transactions', {
        p_user_id: user.id,
      })

      if (error) {
        console.warn('Lazy Evaluation Runner warning:', error.message)
        lastError = error.message;
        break;
      }

      currentProcessedCount = Number(data?.processed_count) || 0
      totalProcessedCount += currentProcessedCount;
      totalExpenseSum += Number(data?.total_expense) || 0;
      totalIncomeSum += Number(data?.total_income) || 0;
      hasMorePending = Boolean(data?.has_more_pending);

      loopCount++;
    } while (hasMorePending && loopCount < MAX_LOOPS);

    if (totalProcessedCount === 0 && lastError && loopCount === 0) {
        return { success: false, processedCount: 0, totalExpense: 0, totalIncome: 0, message: lastError }
    }

    if (totalProcessedCount > 0) {
      revalidatePath('/dashboard', 'layout')
      revalidatePath('/dashboard/history')
      revalidatePath('/dashboard/analytics')
      revalidatePath('/dashboard/recurring')
    }

    return {
      success: true,
      processedCount: totalProcessedCount,
      totalExpense: totalExpenseSum,
      totalIncome: totalIncomeSum,
      message: `ประมวลผลรายการประจำแล้ว ${totalProcessedCount} รายการ`,
    }
  } catch (err: any) {
    console.warn('Lazy Evaluation Runner caught exception:', err?.message)
    return { success: false, processedCount: 0, totalExpense: 0, totalIncome: 0, message: err?.message }
  }
}
