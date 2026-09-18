'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface DirectTransactionParams {
  type: TransactionType
  amount: number
  note?: string
  bucketId?: string
  walletId?: string // from wallet
  toWalletId?: string // for transfer
  category?: string
}

export async function createDirectTransaction(params: DirectTransactionParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
  }

  const { type, amount, note, bucketId, walletId, toWalletId, category } = params

  try {
    if (type === 'expense') {
      if (!bucketId || !amount) return { success: false, message: 'ข้อมูลไม่ครบถ้วน (ต้องระบุถังเงินและจำนวนเงิน)' }
      
      const { error: rpcError } = await supabase.rpc('process_expense', {
        p_user_id: user.id,
        p_bucket_id: bucketId,
        p_amount: amount,
        p_category: category || 'expense',
        p_note: note || null,
        p_date: new Date().toISOString(),
        p_slip_url: null,
        p_receiver: null,
        p_wallet_id: walletId || null
      })

      if (rpcError) throw new Error(rpcError.message)
    } 
    else if (type === 'income') {
      if (!amount) return { success: false, message: 'กรุณาระบุจำนวนเงิน' }
      
      const { data: tx, error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        wallet_id: walletId || null,
        bucket_id: bucketId || null,
        type: 'income',
        amount: amount,
        category: category || 'income',
        note: note || null,
      }).select().single()
      
      if (txError) throw new Error(txError.message)

      if (walletId) {
        const { data: w } = await supabase.from('wallets').select('balance').eq('id', walletId).single()
        if (w) {
          await supabase.from('wallets').update({ balance: Number(w.balance) + amount }).eq('id', walletId)
        }
      }
    }
    else if (type === 'transfer') {
      if (!walletId || !toWalletId || !amount) return { success: false, message: 'ข้อมูลโอนเงินไม่ครบถ้วน' }

      const { error: rpcError } = await supabase.rpc('process_transfer', {
        p_user_id: user.id,
        p_from_wallet_id: walletId,
        p_to_wallet_id: toWalletId,
        p_amount: amount,
        p_fee: 0,
        p_note: note || null,
        p_date: new Date().toISOString()
      })

      if (rpcError) throw new Error(rpcError.message)
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true, message: 'บันทึกสำเร็จ' }
  } catch (error: any) {
    console.error('Direct Transaction Error:', error)
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการบันทึก' }
  }
}
