// ============================================
// Date Utility Functions
// ============================================

/**
 * Gets a local date as a YYYY-MM-DD string.
 * Avoids timezone issues with toISOString() which uses UTC.
 */
export function getLocalDateString(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date as a YYYY-MM-DD string in local timezone.
 */
export function getTodayString(): string {
  return getLocalDateString();
}

/**
 * Gets a date N days ago as a YYYY-MM-DD string.
 */
export function getDaysAgoString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return getLocalDateString(date);
}