'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
