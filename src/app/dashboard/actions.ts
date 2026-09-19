'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateRecurringInput, formatDateISO, RecurringFrequency, RecurringType } from '@/utils/recurringHelper'

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const amount = Number(formData.get('amount'))
  const note = (formData.get('note') as string)?.trim() || null
  const bucketId = formData.get('bucket_id') as string
  const walletId = (formData.get('wallet_id') as string) || null
  const slipUrl = (formData.get('slip_url') as string) || null
  const receiver = (formData.get('receiver') as string)?.trim() || null

  if (!bucketId || isNaN(amount) || amount <= 0) throw new Error('Invalid input')

  // 1. Call updated process_expense RPC
  const { data: rpcTxId, error: rpcError } = await supabase.rpc('process_expense', {
    p_user_id: user.id,
    p_bucket_id: bucketId,
    p_amount: amount,
    p_category: 'expense',
    p_note: note,
    p_date: new Date().toISOString(),
    p_slip_url: slipUrl,
    p_receiver: receiver,
    p_wallet_id: walletId
  })

  if (rpcError) {
    console.error('RPC process_expense error:', rpcError)
    throw new Error('Failed to deduct expense: ' + rpcError.message)
  }

  revalidatePath('/dashboard', 'layout')
}

export async function addIncome(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const amount = Number(formData.get('amount'))
  const note = (formData.get('note') as string)?.trim() || null
  const walletId = (formData.get('wallet_id') as string) || null
  const allocationMode = (formData.get('allocation_mode') as string) || 'auto' // 'auto' | 'single'
  const singleBucketId = (formData.get('single_bucket_id') as string) || null

  if (isNaN(amount) || amount <= 0) throw new Error('Invalid input')

  const { error: rpcError } = await supabase.rpc('process_income_allocation', {
    p_user_id: user.id,
    p_wallet_id: walletId,
    p_amount: amount,
    p_note: note,
    p_date: new Date().toISOString(),
    p_allocation_mode: allocationMode,
    p_single_bucket_id: singleBucketId
  })

  if (rpcError) {
    console.error('RPC process_income_allocation error:', rpcError)
    throw new Error('Failed to process income: ' + rpcError.message)
  }

  revalidatePath('/dashboard', 'layout')
}

export async function transferMoney(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const fromWalletId = formData.get('from_wallet_id') as string
  const toWalletId = formData.get('to_wallet_id') as string
  const amount = Number(formData.get('amount'))
  const rawFee = formData.get('transfer_fee')
  const fee = rawFee ? Number(rawFee) : 0
  const note = (formData.get('note') as string)?.trim() || null
  const date = (formData.get('date') as string) || new Date().toISOString()

  if (!fromWalletId || !toWalletId || fromWalletId === toWalletId) {
    return { success: false, message: 'กรุณาเลือกกระเป๋าต้นทางและปลายทางที่ต่างกัน' }
  }
  if (isNaN(amount) || amount <= 0) {
    return { success: false, message: 'จำนวนเงินที่โอนต้องมากกว่า 0 บาท' }
  }
  if (isNaN(fee) || fee < 0) {
    return { success: false, message: 'ค่าธรรมเนียมต้องไม่ติดลบ' }
  }

  // 1. Call atomic PostgreSQL RPC
  const { error: rpcError } = await supabase.rpc('process_transfer', {
    p_user_id: user.id,
    p_from_wallet_id: fromWalletId,
    p_to_wallet_id: toWalletId,
    p_amount: amount,
    p_fee: fee,
    p_note: note,
    p_date: date
  })

  if (rpcError) {
    console.error('process_transfer RPC error:', rpcError)
    return { success: false, message: 'เกิดข้อผิดพลาดในการโอนเงิน: ' + rpcError.message }
  }

  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'โอนเงินสำเร็จ' }
}

export async function createWallet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const name = (formData.get('name') as string)?.trim()
  const type = (formData.get('type') as string) || 'bank'
  const bankName = (formData.get('bank_name') as string) || null
  const color = (formData.get('color') as string) || '#10b981'
  const icon = (formData.get('icon') as string) || 'wallet'
  const rawOpening = formData.get('opening_balance')
  const openingBalance = rawOpening ? Number(rawOpening) : 0
  const rawCash = formData.get('cash_balance')
  const cashBalance = rawCash ? Number(rawCash) : 0
  const rawAllocation = formData.get('allocation_percentage')
  const allocationPercentage = rawAllocation ? Number(rawAllocation) : 0
  const rawBudget = formData.get('monthly_budget')
  const monthlyBudget = rawBudget && rawBudget !== '' ? Number(rawBudget) : null

  if (!name) {
    return { success: false, message: 'กรุณาระบุชื่อกระเป๋าเงิน' }
  }

  // 1. Insert Wallet
  const { data: walletData, error: walletError } = await supabase.from('wallets').insert({
    user_id: user.id,
    name,
    type,
    bank_name: bankName,
    color,
    icon,
    opening_balance: openingBalance,
    balance: openingBalance,
  }).select().single()

  if (walletError || !walletData) {
    console.error('Create wallet error:', walletError)
    return { success: false, message: 'ไม่สามารถสร้างกระเป๋าเงินได้: ' + walletError?.message }
  }

  // 2. Insert Linked Bucket
  const { error: bucketError } = await supabase.from('buckets').insert({
    user_id: user.id,
    name,
    icon,
    color,
    allocation_percentage: allocationPercentage,
    monthly_budget: monthlyBudget,
    default_wallet_id: walletData.id,
    balance: openingBalance // Initial bucket balance matches wallet
  })

  if (bucketError) {
    console.error('Create linked bucket error:', bucketError)
    // We don't rollback wallet here to keep it simple, but we should log it
  }

  // 3. Insert Cash Wallet (If applicable)
  if (type === 'bank' && cashBalance > 0) {
    const cashName = `${name} (เงินสด)`
    const { data: cashWalletData, error: cashWalletError } = await supabase.from('wallets').insert({
      user_id: user.id,
      name: cashName,
      type: 'cash',
      bank_name: bankName,
      color,
      icon,
      opening_balance: cashBalance,
      balance: cashBalance,
    }).select().single()

    if (!cashWalletError && cashWalletData) {
      await supabase.from('buckets').insert({
        user_id: user.id,
        name: cashName,
        icon,
        color,
        allocation_percentage: 0, // Keep 0 to avoid messing up 100% allocation logic
        monthly_budget: null,
        default_wallet_id: cashWalletData.id,
        balance: cashBalance
      })
    }
  }

  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'สร้างกระเป๋าเงินสำเร็จ', data: walletData }
}

export async function updateWallet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const walletId = formData.get('wallet_id') as string
  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) || '#10b981'
  const icon = (formData.get('icon') as string) || 'wallet'
  const rawAllocation = formData.get('allocation_percentage')
  const allocationPercentage = rawAllocation ? Number(rawAllocation) : 0
  const rawBudget = formData.get('monthly_budget')
  const monthlyBudget = rawBudget && rawBudget !== '' ? Number(rawBudget) : null

  if (!walletId || !name) {
    return { success: false, message: 'ข้อมูลไม่ถูกต้อง' }
  }

  // 0. Fetch current wallet
  const { data: currentWallet } = await supabase.from('wallets').select('type, bank_name').eq('id', walletId).single()

  // 1. Update Wallet
  const { error: walletError } = await supabase.from('wallets').update({
    name,
    color,
    icon,
    updated_at: new Date().toISOString()
  }).eq('id', walletId).eq('user_id', user.id)

  if (walletError) {
    console.error('Update wallet error:', walletError)
    return { success: false, message: 'ไม่สามารถแก้ไขกระเป๋าเงินได้' }
  }

  // 2. Update Linked Bucket
  await supabase.from('buckets').update({
    name,
    color,
    icon,
    allocation_percentage: allocationPercentage,
    monthly_budget: monthlyBudget,
    updated_at: new Date().toISOString()
  }).eq('default_wallet_id', walletId).eq('user_id', user.id)

  // 3. Update Paired Cash Wallet (if applicable)
  if (currentWallet?.type === 'bank' && currentWallet?.bank_name) {
    const cashName = `${name} (เงินสด)`
    const { data: cashWallet } = await supabase.from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'cash')
      .eq('bank_name', currentWallet.bank_name)
      .single()

    if (cashWallet) {
      await supabase.from('wallets').update({
        name: cashName,
        color,
        icon,
        updated_at: new Date().toISOString()
      }).eq('id', cashWallet.id)

      await supabase.from('buckets').update({
        name: cashName,
        color,
        icon,
        updated_at: new Date().toISOString()
      }).eq('default_wallet_id', cashWallet.id)
    }
  }

  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'บันทึกการแก้ไขเรียบร้อย' }
}

export async function deleteWallet(walletId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  // 1. Fetch wallet details
  const { data: wallet, error: fetchError } = await supabase
    .from('wallets')
    .select('is_default, balance')
    .eq('id', walletId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !wallet) {
    return { success: false, message: 'ไม่พบข้อมูลกระเป๋าเงิน' }
  }

  // 2. Check if default wallet
  if (wallet.is_default) {
    return { success: false, message: 'ไม่สามารถลบกระเป๋าหลักได้ กรุณาเปลี่ยนกระเป๋าหลักเป็นใบอื่นก่อน' }
  }

  // 3. Count transactions
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .or(`wallet_id.eq.${walletId},to_wallet_id.eq.${walletId}`)
    .eq('user_id', user.id)

  if (countError) {
    console.error('Count transactions error:', countError)
    return { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบประวัติรายการ' }
  }

  if (count === 0) {
    // Hard delete linked bucket first (to avoid ON DELETE SET NULL losing the reference)
    await supabase.from('buckets').delete().eq('default_wallet_id', walletId).eq('user_id', user.id)

    // Hard Delete Wallet
    const { error: deleteError } = await supabase
      .from('wallets')
      .delete()
      .eq('id', walletId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Delete wallet error:', deleteError)
      return { success: false, message: 'ไม่สามารถลบกระเป๋าเงินได้' }
    }

    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard', 'layout')
    return { success: true, message: 'ลบกระเป๋าเงินเรียบร้อยแล้ว' }
  } else {
    // Soft Delete (Archive)
    if (Number(wallet.balance) !== 0) {
      return { success: false, message: 'ไม่สามารถลบได้เนื่องจากมียอดเงินคงเหลือ กรุณาโอนเงินออกให้เป็น 0 บาทก่อน' }
    }

    const { error: archiveError } = await supabase
      .from('wallets')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', walletId)
      .eq('user_id', user.id)

    if (archiveError) {
      console.error('Archive wallet error:', archiveError)
      return { success: false, message: 'ไม่สามารถซ่อนกระเป๋าเงินได้' }
    }

    // Soft delete (archive) linked bucket
    await supabase
      .from('buckets')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('default_wallet_id', walletId)
      .eq('user_id', user.id)

    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard', 'layout')
    return { success: true, message: 'ซ่อนกระเป๋าเงินเรียบร้อยแล้ว' }
  }
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

export async function updateBucketSettings(bucketId: string, monthlyBudget: number | null, defaultWalletId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  if (monthlyBudget !== null && monthlyBudget < 0) {
    return { success: false, message: 'งบประมาณต้องไม่ติดลบ' }
  }

  const { error } = await supabase
    .from('buckets')
    .update({ 
      monthly_budget: monthlyBudget,
      default_wallet_id: defaultWalletId
    })
    .eq('id', bucketId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Update Bucket Settings Error:', error)
    return { success: false, message: 'ไม่สามารถบันทึกการตั้งค่าถังงบประมาณได้' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' }
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
