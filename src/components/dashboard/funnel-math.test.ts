import { describe, expect, it } from 'vitest'

import {
  formatRatio,
  gatesByStudents,
  googleDropOff,
  periodStartYmd,
  startsBeforeTracking,
  wallSegments,
} from './funnel-math'

// Local noon avoids any DST edge around midnight.
const NOW = new Date(2026, 10, 19, 12, 0, 0)

const gate = (students: number, decidedPlan = 0, decidedPaid = 0) => ({
  students,
  hits: 0,
  repeatStudents: 0,
  dismissedStudents: 0,
  decidedPlan,
  decidedPaid,
})

describe('periodStartYmd', () => {
  it('mirrors Web periodStartFor', () => {
    expect(periodStartYmd('day', NOW)).toBe('2026-11-19')
    expect(periodStartYmd('week', NOW)).toBe('2026-11-12')
    expect(periodStartYmd('month', NOW)).toBe('2026-10-19')
    expect(periodStartYmd('year', NOW)).toBe('2025-11-19')
  })
})

describe('startsBeforeTracking', () => {
  it('is true only when the window opens before tracking began', () => {
    expect(startsBeforeTracking('week', '2026-11-18', NOW)).toBe(true)
    expect(startsBeforeTracking('day', '2026-11-18', NOW)).toBe(false)
    expect(startsBeforeTracking('day', '2026-11-19', NOW)).toBe(false)
  })

  it('is false when Web has not reported a tracking date', () => {
    expect(startsBeforeTracking('year', null, NOW)).toBe(false)
  })
})

describe('gatesByStudents', () => {
  it('orders gates by students hit, descending', () => {
    expect(gatesByStudents({ ai_quota: gate(2), lesson: gate(9), exercise: gate(5) })).toEqual([
      'lesson',
      'exercise',
      'ai_quota',
    ])
  })
})

describe('wallSegments', () => {
  it('splits students into paid / picked-not-paid / no plan', () => {
    expect(wallSegments(gate(10, 4, 1))).toEqual({ paid: 1, planNoPay: 3, noPlan: 6 })
  })

  it('never goes negative when paid exceeds picked-plan', () => {
    expect(wallSegments(gate(5, 1, 2))).toEqual({ paid: 2, planNoPay: 0, noPlan: 3 })
  })
})

describe('googleDropOff', () => {
  const visitors = (
    googleClicked: number,
    signedUp: number,
    cancelled: number,
    failed: number,
  ) => ({
    visitors: 0,
    humans: 0,
    signupPromptShown: 0,
    googleClicked,
    signedUp,
    googleCancelled: cancelled,
    googleFailed: failed,
  })

  it('treats the remainder after cancels and failures as no return', () => {
    expect(googleDropOff(visitors(30, 20, 4, 1))).toEqual({ cancelled: 4, failed: 1, noReturn: 5 })
  })

  it('floors no return at 0', () => {
    expect(googleDropOff(visitors(10, 9, 2, 1)).noReturn).toBe(0)
  })
})

describe('formatRatio', () => {
  it('formats to one decimal and guards zero', () => {
    expect(formatRatio(7, 4)).toBe('1.8')
    expect(formatRatio(3, 0)).toBe('—')
  })
})
