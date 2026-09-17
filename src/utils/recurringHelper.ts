export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringType = 'income' | 'expense';

export interface RecurringSchedule {
  id: string;
  user_id: string;
  type: RecurringType;
  bucket_id: string | null;
  wallet_id?: string | null;
  amount: number;
  category: string;
  note: string | null;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  auto_process: boolean;
  created_at?: string;
  updated_at?: string;
  bucket?: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
    balance?: number;
  } | null;
  wallet?: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
    type?: string | null;
  } | null;
}

export const THAI_DAY_NAMES = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
] as const;

export const THAI_MONTH_NAMES_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

/**
 * Safely parses Date or YYYY-MM-DD string into local midnight Date
 */
export function parseLocalDate(input: Date | string): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const d = new Date(input);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date();
}

/**
 * Formats a Date to YYYY-MM-DD in local time
 */
export function formatDateISO(date: Date | string): string {
  const d = parseLocalDate(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates the next run date for a recurring schedule.
 * Handles edge cases:
 * - Daily: next calendar day (+1 day)
 * - Weekly: next target day of week or +7 days
 * - Monthly: month-end clamping (Jan 31 -> Feb 28/29) while preserving original anchor dayOfMonth (Feb 28 -> Mar 31)
 * - Yearly: next year, clamping Feb 29 to Feb 28 in non-leap years
 */
export function calculateNextRunDate(
  currentDate: Date | string,
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const d = parseLocalDate(currentDate);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed
  const date = d.getDate();

  switch (frequency) {
    case 'daily': {
      return new Date(year, month, date + 1);
    }

    case 'weekly': {
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const curDay = d.getDay();
        let diff = (dayOfWeek - curDay + 7) % 7;
        if (diff === 0) diff = 7; // advance to next week if today is the target day
        return new Date(year, month, date + diff);
      }
      return new Date(year, month, date + 7);
    }

    case 'monthly': {
      const nextYear = month === 11 ? year + 1 : year;
      const nextMonth = month === 11 ? 0 : month + 1;

      // Days in target month (day 0 of month+1 is the last day of month)
      const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();

      // Anchor day preservation: prefer configured dayOfMonth, fallback to date
      const targetDay = dayOfMonth !== null && dayOfMonth !== undefined && dayOfMonth > 0
        ? dayOfMonth
        : date;

      const clampedDay = Math.min(targetDay, daysInNextMonth);
      return new Date(nextYear, nextMonth, clampedDay);
    }

    case 'yearly': {
      const nextYear = year + 1;
      const daysInTargetMonth = new Date(nextYear, month + 1, 0).getDate();
      const targetDay = dayOfMonth !== null && dayOfMonth !== undefined && dayOfMonth > 0
        ? dayOfMonth
        : date;

      const clampedDay = Math.min(targetDay, daysInTargetMonth);
      return new Date(nextYear, month, clampedDay);
    }

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
}

/**
 * Returns user-friendly Thai description of the recurrence pattern
 */
export function formatFrequencyThai(
  frequency: RecurringFrequency,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): string {
  switch (frequency) {
    case 'daily':
      return 'ทุกวัน';
    case 'weekly':
      if (dayOfWeek !== null && dayOfWeek !== undefined && THAI_DAY_NAMES[dayOfWeek]) {
        return `ทุกสัปดาห์ (${THAI_DAY_NAMES[dayOfWeek]})`;
      }
      return 'ทุกสัปดาห์';
    case 'monthly':
      if (dayOfMonth !== null && dayOfMonth !== undefined && dayOfMonth > 0) {
        return `ทุกเดือน (วันที่ ${dayOfMonth})`;
      }
      return 'ทุกเดือน (วันสิ้นเดือน)';
    case 'yearly':
      return 'ทุกปี';
    default:
      return frequency;
  }
}

/**
 * Formats a date into Thai format: "17 ก.ย. 2569"
 */
export function formatThaiDateShort(dateInput: string | Date): string {
  const d = parseLocalDate(dateInput);
  const day = d.getDate();
  const month = THAI_MONTH_NAMES_SHORT[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;
  return `${day} ${month} ${thaiYear}`;
}

/**
 * Converts any frequency amount into an estimated monthly equivalent
 */
export function calculateMonthlyEquivalent(amount: number, frequency: RecurringFrequency): number {
  const num = Number(amount) || 0;
  switch (frequency) {
    case 'daily':
      return num * 30;
    case 'weekly':
      return Math.round((num * 52) / 12);
    case 'monthly':
      return num;
    case 'yearly':
      return Math.round(num / 12);
    default:
      return num;
  }
}

/**
 * Calculates monthly commitments summary across all active schedules
 */
export function calculateMonthlyCommitment(
  schedules: Array<Pick<RecurringSchedule, 'amount' | 'frequency' | 'type'> & { is_active?: boolean }>
): {
  totalExpense: number;
  totalIncome: number;
  netCommitment: number;
  activeCount: number;
} {
  let totalExpense = 0;
  let totalIncome = 0;
  let activeCount = 0;

  for (const s of schedules) {
    if (s.is_active === false) continue;
    activeCount++;
    const eq = calculateMonthlyEquivalent(Number(s.amount), s.frequency);
    if (s.type === 'expense') {
      totalExpense += eq;
    } else if (s.type === 'income') {
      totalIncome += eq;
    }
  }

  return {
    totalExpense,
    totalIncome,
    netCommitment: totalIncome - totalExpense,
    activeCount,
  };
}

// Alias for plural naming compatibility
export const calculateMonthlyCommitments = calculateMonthlyCommitment;

/**
 * Validates input data for recurring schedule creation and updates
 */
export function validateRecurringInput(data: {
  type?: string;
  amount?: number;
  frequency?: string;
  day_of_month?: number | null;
  day_of_week?: number | null;
  start_date?: string;
  end_date?: string | null;
  bucket_id?: string | null;
  category?: string | null;
  note?: string | null;
}): { valid: boolean; message?: string } {
  if (data.amount === undefined || data.amount === null || isNaN(data.amount) || data.amount <= 0) {
    return { valid: false, message: 'จำนวนเงินต้องมากกว่า 0 บาท' };
  }

  const validFrequencies: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
  if (!data.frequency || !validFrequencies.includes(data.frequency as RecurringFrequency)) {
    return { valid: false, message: 'กรุณาเลือกความถี่การทำซ้ำที่ถูกต้อง (ทุกวัน, ทุกสัปดาห์, ทุกเดือน, ทุกปี)' };
  }

  if (data.type === 'expense' && !data.bucket_id) {
    return { valid: false, message: 'กรุณาเลือกกระเป๋าเงินสำหรับรายการรายจ่าย' };
  }

  if (data.day_of_month !== undefined && data.day_of_month !== null) {
    const dom = Number(data.day_of_month);
    if (isNaN(dom) || dom < 1 || dom > 31) {
      return { valid: false, message: 'วันที่ในรอบเดือนต้องอยู่ระหว่าง 1 ถึง 31' };
    }
  }

  if (data.day_of_week !== undefined && data.day_of_week !== null) {
    const dow = Number(data.day_of_week);
    if (isNaN(dow) || dow < 0 || dow > 6) {
      return { valid: false, message: 'วันในรอบสัปดาห์ต้องอยู่ระหว่าง 0 (วันอาทิตย์) ถึง 6 (วันเสาร์)' };
    }
  }

  if (data.start_date && data.end_date) {
    const start = parseLocalDate(data.start_date);
    const end = parseLocalDate(data.end_date);
    if (end < start) {
      return { valid: false, message: 'วันสิ้นสุดรอบต้องไม่มาก่อนวันเริ่มต้น' };
    }
  }

  if (data.note && data.note.length > 200) {
    return { valid: false, message: 'บันทึกช่วยจำต้องไม่เกิน 200 ตัวอักษร' };
  }

  if (data.category && data.category.length > 50) {
    return { valid: false, message: 'หมวดหมู่ต้องไม่เกิน 50 ตัวอักษร' };
  }

  return { valid: true };
}
