'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
