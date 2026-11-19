import type { Period } from '@/types/dashboard'

function ymd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Local-date (YYYY-MM-DD) start of the selected period. Mirrors Web's
 * `periodStartFor` in date-buckets.ts: day = today 00:00, otherwise a
 * rolling week / month / year back from today 00:00.
 */
export function periodStartYmd(period: Period, now: Date = new Date()): string {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  if (period === 'week') d.setDate(d.getDate() - 7)
  else if (period === 'month') d.setMonth(d.getMonth() - 1)
  else if (period === 'year') d.setFullYear(d.getFullYear() - 1)
  return ymd(d)
}

/** True when the period window opens before funnel event tracking began. */
export function startsBeforeTracking(
  period: Period,
  eventsTrackedSince: string | null,
  now: Date = new Date(),
): boolean {
  if (!eventsTrackedSince) return false
  return periodStartYmd(period, now) < eventsTrackedSince
}
