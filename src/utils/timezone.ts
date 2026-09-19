// src/utils/timezone.ts
export const TIMEZONE = 'Asia/Bangkok'

/**
 * Returns the ISO string of the first moment of the current month in Bangkok time.
 * e.g., "2023-11-01T00:00:00+07:00"
 */
export function getStartOfMonthBkk(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit' }).format(new Date())
  return `${parts}-01T00:00:00+07:00`
}

/**
 * Returns the ISO string of the first moment of the current year in Bangkok time.
 * e.g., "2023-01-01T00:00:00+07:00"
 */
export function getStartOfYearBkk(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric' }).format(new Date())
  return `${parts}-01-01T00:00:00+07:00`
}

/**
 * Returns current date parts in Bangkok time.
 * Month is 0-indexed to match JS Date (0 = Jan, 11 = Dec).
 */
export function getCurrentBkkDateParts(): { year: number, month: number, day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [year, month, day] = parts.split('-')
  return { 
    year: parseInt(year, 10), 
    month: parseInt(month, 10) - 1, 
    day: parseInt(day, 10) 
  }
}

/**
 * Returns current month name in Thai (e.g., "กันยายน")
 */
export function getBkkMonthNameThai(): string {
  return new Intl.DateTimeFormat('th-TH', { timeZone: TIMEZONE, month: 'long' }).format(new Date())
}
