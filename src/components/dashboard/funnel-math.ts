import type { Period, WallGate, WallGateStats } from '@/types/dashboard'

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

export const WALL_GATES: readonly WallGate[] = ['ai_quota', 'lesson', 'exercise']

/** Gates ordered by students hit, descending (stable for ties). */
export function gatesByStudents(byGate: Record<WallGate, WallGateStats>): WallGate[] {
  return [...WALL_GATES].sort((a, b) => byGate[b].students - byGate[a].students)
}

/**
 * Non-overlapping outcome split for one wall's stacked bar. Clamped so a
 * cohort edge (e.g. decidedPaid > decidedPlan) never produces a negative or
 * double-counted segment; the three parts sum to `students` whenever the
 * decided counts fit inside it.
 */
export function wallSegments(row: WallGateStats) {
  return {
    paid: row.decidedPaid,
    planNoPay: Math.max(row.decidedPlan - row.decidedPaid, 0),
    noPlan: Math.max(row.students - Math.max(row.decidedPlan, row.decidedPaid), 0),
  }
}

/** hits / students to 1 decimal, or "—" when nobody hit the wall. */
export function formatRatio(part: number, whole: number): string {
  return whole > 0 ? (part / whole).toFixed(1) : '—'
}
