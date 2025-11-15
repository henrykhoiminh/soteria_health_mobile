/**
 * Timezone Utilities
 *
 * Provides functions for handling dates in the user's local timezone
 * instead of UTC, ensuring daily progress resets at midnight local time
 */

/**
 * Get the current date in the user's local timezone as YYYY-MM-DD
 * This ensures daily progress resets at midnight local time, not UTC midnight
 */
export function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get yesterday's date in the user's local timezone as YYYY-MM-DD
 */
export function getLocalYesterdayString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const month = String(yesterday.getMonth() + 1).padStart(2, '0')
  const day = String(yesterday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get a date offset by N days in the user's local timezone as YYYY-MM-DD
 * @param daysOffset - Positive for future dates, negative for past dates
 */
export function getLocalDateWithOffset(daysOffset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convert a timestamp to local date string (YYYY-MM-DD)
 * @param timestamp - ISO timestamp or Date object
 */
export function timestampToLocalDateString(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get current timestamp in ISO format
 * This is used for completed_at and other precise timestamp fields
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Check if two date strings represent the same local day
 */
export function isSameLocalDay(date1: string, date2: string): boolean {
  return date1 === date2
}

/**
 * Calculate days difference between two local dates
 * @param date1 - YYYY-MM-DD format
 * @param date2 - YYYY-MM-DD format
 * @returns Number of days between dates (positive if date2 is after date1)
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T00:00:00')
  const d2 = new Date(date2 + 'T00:00:00')
  const diffTime = d2.getTime() - d1.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Check if a date string is today in local timezone
 */
export function isToday(dateString: string): boolean {
  return dateString === getLocalDateString()
}

/**
 * Check if a date string is yesterday in local timezone
 */
export function isYesterday(dateString: string): boolean {
  return dateString === getLocalYesterdayString()
}
