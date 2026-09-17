export type TransactionType = 'income' | 'expense' | 'transfer';
export type { RecurringFrequency, RecurringSchedule, RecurringType } from '../utils/recurringHelper';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bucket {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  allocation_percentage: number;
  target_amount: number | null;
  monthly_budget: number | null;
  balance: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  bucket_id: string | null;
  type: TransactionType;
  amount: number;
  category: string | null;
  note: string | null;
  transaction_date: string;
  created_at: string;
  deleted_at?: string | null;
  slip_url?: string | null;
  receiver?: string | null;
  recurring_schedule_id?: string | null;
}

export interface Allocation {
  id: string;
  user_id: string;
  income_transaction_id: string;
  bucket_id: string;
  amount: number;
  created_at: string;
}

export interface RecurringProcessResult {
  processed_count: number;
  total_expense: number;
  total_income: number;
  processed_schedule_ids: string[];
}
