import { describe, expect, it } from 'vitest'

import { funnelDropOff, percentOf } from '@/components/dashboard/guest-insights-math'
import { dashboardFixture } from '@/test/dashboard-fixture'

import { dashboardMetricsSchema, guestInsightsSchema } from './dashboard-schema'

const EMPTY_GUEST_INSIGHTS = {
  landingBreakdown: { lesson: 0, course: 0, start: 0, home: 0, other: 0 },
  landingBreakdownLast30d: { lesson: 0, course: 0, start: 0, home: 0, other: 0 },
  topLandingPaths: [],
  topReferrers: [],
  onboardingFunnel: {
    started: 0,
    personaSelected: 0,
    gradeSelected: 0,
    signupPromptShown: 0,
    googleClicked: 0,
    completed: 0,
  },
  conversionByLandingType: {
    lesson: { guests: 0, converted: 0 },
    course: { guests: 0, converted: 0 },
    start: { guests: 0, converted: 0 },
    home: { guests: 0, converted: 0 },
    other: { guests: 0, converted: 0 },
  },
  bots: {
    uaBotHitsLast30d: { search: 0, socialPreview: 0, aiCrawler: 0, other: 0 },
    guestSessionsLast30d: 0,
    jsConfirmedLast30d: 0,
    unconfirmedLast30d: 0,
  },
}

describe('guestInsights schema', () => {
  it('passes a full payload through unchanged', () => {
    const fixture = dashboardFixture()
    const parsed = dashboardMetricsSchema.parse(fixture)
    expect(parsed.guestInsights).toEqual(fixture.guestInsights)
  })

  it('defaults to an all-zero object when Web omits guestInsights', () => {
    const older: Partial<ReturnType<typeof dashboardFixture>> = dashboardFixture()
    delete older.guestInsights
    const parsed = dashboardMetricsSchema.parse(older)
    expect(parsed.guestInsights).toEqual(EMPTY_GUEST_INSIGHTS)
  })

  it('fills missing keys inside partial nested objects', () => {
    const parsed = guestInsightsSchema.parse({
      landingBreakdownLast30d: { lesson: 4 },
      onboardingFunnel: { started: 10, completed: 2 },
      conversionByLandingType: { course: { guests: 3 } },
      bots: { uaBotHitsLast30d: { aiCrawler: 7 }, unconfirmedLast30d: 1 },
    })

    expect(parsed.landingBreakdownLast30d).toEqual({
      lesson: 4,
      course: 0,
      start: 0,
      home: 0,
      other: 0,
    })
    expect(parsed.onboardingFunnel.started).toBe(10)
    expect(parsed.onboardingFunnel.signupPromptShown).toBe(0)
    expect(parsed.conversionByLandingType.course).toEqual({ guests: 3, converted: 0 })
    expect(parsed.conversionByLandingType.lesson).toEqual({ guests: 0, converted: 0 })
    expect(parsed.bots.uaBotHitsLast30d).toEqual({
      search: 0,
      socialPreview: 0,
      aiCrawler: 7,
      other: 0,
    })
    expect(parsed.bots.unconfirmedLast30d).toBe(1)
    expect(parsed.topLandingPaths).toEqual([])
    expect(parsed.landingBreakdown).toEqual(EMPTY_GUEST_INSIGHTS.landingBreakdown)
  })

  it('folds an unknown landing type into other', () => {
    const parsed = guestInsightsSchema.parse({
      topLandingPaths: [{ path: '/quiz/1', type: 'quiz', count: 3 }],
    })
    expect(parsed.topLandingPaths[0]?.type).toBe('other')
  })

  it('rejects a non-numeric count', () => {
    expect(guestInsightsSchema.safeParse({ onboardingFunnel: { started: 'ten' } }).success).toBe(
      false,
    )
  })
})

describe('period-scoped guest fields', () => {
  it('stays undefined when Web omits them', () => {
    const parsed = dashboardMetricsSchema.parse(dashboardFixture())
    expect(parsed.userMetrics.guestSessionsInPeriod).toBeUndefined()
    expect(parsed.userMetrics.guestConvertedInPeriod).toBeUndefined()
  })

  it('passes them through when present', () => {
    const fixture = dashboardFixture()
    fixture.userMetrics.guestSessionsInPeriod = 50
    fixture.userMetrics.guestConvertedInPeriod = 4
    const parsed = dashboardMetricsSchema.parse(fixture)
    expect(parsed.userMetrics.guestSessionsInPeriod).toBe(50)
    expect(parsed.userMetrics.guestConvertedInPeriod).toBe(4)
  })
})

describe('guest insights math', () => {
  it('guards percentages against a zero denominator', () => {
    expect(percentOf(3, 0)).toBeNull()
    expect(percentOf(1, 4)).toBe(25)
  })

  it('computes sign-up drop-off from prompt and Google click', () => {
    const { onboardingFunnel } = dashboardFixture().guestInsights
    expect(funnelDropOff(onboardingFunnel)).toEqual({
      reachedSignupButLeft: 16,
      clickedGoogleButLeft: 4,
    })
  })

  it('never reports negative drop-off', () => {
    const { onboardingFunnel } = EMPTY_GUEST_INSIGHTS
    expect(funnelDropOff({ ...onboardingFunnel, completed: 2 })).toEqual({
      reachedSignupButLeft: 0,
      clickedGoogleButLeft: 0,
    })
  })
})
