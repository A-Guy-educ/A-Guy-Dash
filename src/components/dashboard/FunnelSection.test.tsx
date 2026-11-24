import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/components/i18n'
import en from '@/messages/en.json'
import he from '@/messages/he.json'
import { funnelSchema } from '@/types/dashboard'

import { FunnelSection } from './FunnelSection'

vi.stubGlobal('React', React)

const funnel = funnelSchema.parse({
  eventsTrackedSince: '2026-11-18',
  visitors: { visitors: 120, humans: 100, signupPromptShown: 60, googleClicked: 30, signedUp: 20 },
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
})

function render(locale: 'en' | 'he', period: 'day' | 'month' = 'month') {
  return renderToStaticMarkup(
    <I18nProvider locale={locale} messages={locale === 'en' ? en : he}>
      <FunnelSection funnel={funnel} period={period} segment="b2b" />
    </I18nProvider>,
  )
}

describe('FunnelSection', () => {
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
})
