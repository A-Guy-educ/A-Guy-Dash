import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/components/i18n'
import en from '@/messages/en.json'
import he from '@/messages/he.json'
import { funnelSchema } from '@/types/dashboard'

import { FunnelSection } from './FunnelSection'

vi.stubGlobal('React', React)

const funnelInput = {
  eventsTrackedSince: '2026-11-18',
  googleOutcomesSince: '2026-11-20' as string | null,
  existingStudentVisits: 7,
  visitors: {
    visitors: 120,
    humans: 100,
    signupPromptShown: 60,
    googleClicked: 30,
    signedUp: 20,
    googleCancelled: 4,
    googleFailed: 1,
  },
  visitorsByLandingType: { lesson: { visitors: 50, humans: 45, signedUp: 10 } },
  signups: {
    signedUp: 20,
    activeFirstWeek: 15,
    engagedFirstWeek: 10,
    returnedFirstWeek: 5,
    weekCompleted: 8,
    paid: 2,
  },
  firstWeekActiveDays: [1, 2, 2, 1, 1, 0, 0, 1],
  bySource: { guykoren: { signedUp: 6, paid: 1 } },
  byLandingType: { lesson: { signedUp: 10 } },
  payments: {
    paywallShown: 40,
    planSelected: 10,
    checkoutStarted: 6,
    paid: 3,
    paywallDismissed: 12,
    pricingViewed: 9,
    byGate: {
      ai_quota: { students: 30, hits: 70, repeatStudents: 12, dismissedStudents: 12 },
      lesson: { students: 8, hits: 9, decidedPlan: 4, decidedPaid: 2 },
    },
  },
}

function render(
  locale: 'en' | 'he',
  period: 'day' | 'month' = 'month',
  overrides: Partial<typeof funnelInput> = {},
) {
  const funnel = funnelSchema.parse({ ...funnelInput, ...overrides })
  return renderToStaticMarkup(
    <I18nProvider locale={locale} messages={locale === 'en' ? en : he}>
      <FunnelSection funnel={funnel} period={period} segment="b2b" />
    </I18nProvider>,
  )
}

describe('FunnelSection', () => {
  // Tracking notes compare the period start to fixed dates, so pin "today".
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 24, 12, 0, 0))
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  it.each(['en', 'he'] as const)('renders every label from the %s messages', (locale) => {
    expect(render(locale)).not.toMatch(/dashboard\.funnel\./)
  })

  it('renders the sections, wall outcomes and caveats', () => {
    const html = render('en')
    expect(html).toContain('Real visitors')
    expect(html).toContain('incl. 20 likely bots')
    expect(html).toContain('Days active in first week')
    expect(html).toContain('Students whose first week is over (8)')
    expect(html).toContain('Guy Koren')
    expect(html).toContain('Continued without help')
    expect(html).toContain('AI quota (daily limit)')
    expect(html).toContain('Paid after it')
    expect(html).toContain('Wall, plan and checkout tracking started')
    expect(html).toContain('anonymous sessions')
    // AI quota has more students than Locked lesson, so it's listed first.
    expect(html.indexOf('AI quota (daily limit)')).toBeLessThan(
      html.indexOf('Locked lesson (practice/exam)'),
    )
  })

  it('drops the tracking note when the period starts after tracking began', () => {
    expect(render('en', 'day')).not.toContain('Wall, plan and checkout tracking started')
  })

  it('notes existing students dropped from the visitor steps, hidden at 0', () => {
    expect(render('en')).toContain('7 visits were existing students logging back in')
    expect(render('en', 'month', { existingStudentVisits: 0 })).not.toContain(
      'existing students logging back in',
    )
  })

  it('breaks down Google clicks that did not sign up once tracking covers the period', () => {
    const html = render('en', 'day')
    expect(html).toMatch(/Cancelled on Google<\/span><span class="tabular-nums shrink-0">4</)
    expect(html).toMatch(/Sign-in failed<\/span><span class="tabular-nums shrink-0">1</)
    expect(html).toContain('come back from Google')
    expect(html).not.toContain('Cancel / fail')
  })

  it('swaps the breakdown for a note when the period predates tracking', () => {
    const html = render('en', 'month')
    expect(html).toContain('Cancel / fail tracking started')
    expect(html).not.toContain('Cancelled on Google')
  })

  it('says cancel / fail is not tracked when Web has no start date', () => {
    const html = render('en', 'day', { googleOutcomesSince: null })
    expect(html).toContain('Cancel / fail not tracked yet')
    expect(html).not.toContain('Cancelled on Google')
  })
})
