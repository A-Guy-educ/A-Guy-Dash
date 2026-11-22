import { describe, expect, it } from 'vitest'

import { avgActiveDays, formatAvgDays, periodStartYmd, startsBeforeTracking } from './funnel-math'

describe('avgActiveDays', () => {
  it('divides active days by completed weeks', () => {
    expect(formatAvgDays(avgActiveDays({ activeDaysFirstWeek: 25, weekCompleted: 10 }))).toBe('2.5')
  })

  it('renders — when no signup has finished their first week', () => {
    expect(formatAvgDays(avgActiveDays({ activeDaysFirstWeek: 0, weekCompleted: 0 }))).toBe('—')
  })
})

// Local noon avoids any DST edge around midnight.
const NOW = new Date(2026, 10, 19, 12, 0, 0)

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
