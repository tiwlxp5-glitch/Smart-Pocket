'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
  const rawDate = formData.get('transaction_date') as string
  const date = rawDate || new Date().toISOString()

  if (!bucketId || isNaN(amount) || amount <= 0) throw new Error('Invalid input')

  // 1. Call updated process_expense RPC
  const { data: rpcTxId, error: rpcError } = await supabase.rpc('process_expense', {
    p_user_id: user.id,
    p_bucket_id: bucketId,
    p_amount: amount,
    p_category: 'expense',
    p_note: note,
    p_date: date,
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
  const rawDate = formData.get('transaction_date') as string
  const date = rawDate || new Date().toISOString()

  if (isNaN(amount) || amount <= 0) throw new Error('Invalid input')

  const { error: rpcError } = await supabase.rpc('process_income_allocation', {
    p_user_id: user.id,
    p_wallet_id: walletId,
    p_amount: amount,
    p_note: note,
    p_date: date,
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
