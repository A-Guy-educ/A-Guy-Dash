/**
 * Funnel tab (Web PR #1631) — visitor → signup → first week → payment.
 * Read-only render of `data.funnel`; follows the shell's period + segment.
 *
 * Three funnel cards (visitors, first week, payment) plus breakdown tables
 * by signup source and landing page. Caveats rendered inline:
 * - payment-side events only exist from `eventsTrackedSince`, so windows
 *   that open earlier get a note on the payment card and the
 *   paywall / pricing / checkout columns;
 * - "came back" needs a full week after signup, so it reads low on day/week;
 * - first-week depth (Web #1639): Alive → Did something → Came back bars,
 *   a days-active histogram and per-row avg days, all over signups whose
 *   first week is over (`weekCompleted`);
 * - visitor steps are anonymous and can't be segmented.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Visitor-to-paid funnel bars and per-source / per-landing tables
 */

'use client'

import type React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'
import type {
  FunnelMetrics,
  LandingType,
  Period,
  Segment,
  SignupFunnel,
  VisitorFunnel,
} from '@/types/dashboard'
import { avgActiveDays, formatAvgDays, startsBeforeTracking } from './funnel-math'
import { formatPercent, percentOf } from './guest-insights-math'
import { FormulaTooltip } from './product-health/FormulaTooltip'

const VISITOR_STEPS = [
  'humans',
  'signupPromptShown',
  'googleClicked',
  'signedUp',
] as const satisfies readonly (keyof VisitorFunnel)[]

const FIRST_WEEK_STEPS = [
  'signedUp',
  'activeFirstWeek',
  'engagedFirstWeek',
  'returnedFirstWeek',
] as const satisfies readonly (keyof SignupFunnel)[]

const PAYMENT_STEPS = ['paywallShown', 'pricingViewed', 'checkoutStarted', 'paid'] as const

// `avgDays` is derived per row (activeDaysFirstWeek / weekCompleted).
const SIGNUP_COLUMNS = [
  'signedUp',
  'activeFirstWeek',
  'engagedFirstWeek',
  'returnedFirstWeek',
  'avgDays',
  'paywallShown',
  'pricingViewed',
  'checkoutStarted',
  'paid',
] as const satisfies readonly (keyof SignupFunnel | 'avgDays')[]

// Tooltip text per first-week step; `returned` gets a day/week caveat.
const STEP_TOOLTIPS: Partial<Record<string, string>> = {
  activeFirstWeek: 'aliveTooltip',
  engagedFirstWeek: 'engagedTooltip',
  returnedFirstWeek: 'returnedTooltip',
}

// Columns backed by events that only exist from `eventsTrackedSince`.
const TRACKED_COLUMNS = new Set<string>(['paywallShown', 'pricingViewed', 'checkoutStarted'])

const VISITOR_COLUMNS = [
  'visitors',
  'humans',
  'signupPromptShown',
  'googleClicked',
  'signedUp',
] as const satisfies readonly (keyof VisitorFunnel)[]

const SOURCE_KEYS = ['google', 'guykoren', 'direct', 'other', 'unknown'] as const
const SIGNUP_LANDING_KEYS = ['lesson', 'course', 'start', 'home', 'other', 'unknown'] as const
const VISITOR_LANDING_KEYS = [
  'lesson',
  'course',
  'start',
  'home',
  'other',
] as const satisfies readonly LandingType[]

const GATES = ['lesson', 'exercise', 'ai_quota'] as const

interface Props {
  funnel: FunnelMetrics
  period: Period
  segment: Segment
}

export function FunnelSection({ funnel, period, segment }: Props) {
  const t = useTranslations('dashboard.funnel')
  const tSources = useTranslations('dashboard.signupSources.labels')
  const locale = useLocale()

  const beforeTracking = startsBeforeTracking(period, funnel.eventsTrackedSince)
  const trackingNote =
    beforeTracking && funnel.eventsTrackedSince
      ? t('trackingNote').replace(
          '{date}',
          new Date(`${funnel.eventsTrackedSince}T00:00:00`).toLocaleDateString(locale),
        )
      : null
  const returnedTooltip =
    period === 'day' || period === 'week'
      ? `${t('returnedTooltip')}\n${t('returnedTooltipShort')}`
      : t('returnedTooltip')
  const likelyBots = Math.max(0, funnel.visitors.visitors - funnel.visitors.humans)

  const stepLabel = (step: string) => {
    const tooltipKey = STEP_TOOLTIPS[step]
    if (!tooltipKey) return t(`steps.${step}`)
    const content = step === 'returnedFirstWeek' ? returnedTooltip : t(tooltipKey)
    return <FormulaTooltip content={content}>{t(`steps.${step}`)}</FormulaTooltip>
  }

  return (
    <section className="space-y-6">
      <h2 className="text-heading-lg font-semibold">{t('section')}</h2>

      <div className="grid gap-content-gap grid-cols-1 lg:grid-cols-3">
        <FunnelCard
          title={t('visitorsTitle')}
          steps={VISITOR_STEPS.map((step) => ({
            key: step,
            label: stepLabel(step),
            value: funnel.visitors[step],
          }))}
          base={funnel.visitors.humans}
          baseLabel={t('ofHumans')}
          emptyLabel={t('emptyState')}
          footer={
            <>
              <p className="text-body-xs text-muted-foreground">
                {t('likelyBots').replace('{n}', likelyBots.toLocaleString(locale))}
              </p>
              {segment !== 'all' && segment !== 'b2c' && (
                <p className="text-body-xs text-muted-foreground">{t('anonymousNote')}</p>
              )}
            </>
          }
        />

        <FunnelCard
          title={t('signupsTitle')}
          steps={FIRST_WEEK_STEPS.map((step) => ({
            key: step,
            label: stepLabel(step),
            value: funnel.signups[step],
          }))}
          base={funnel.signups.signedUp}
          baseLabel={t('ofSignedUp')}
          emptyLabel={t('emptyState')}
        />

        <FunnelCard
          title={t('paymentsTitle')}
          steps={PAYMENT_STEPS.map((step) => ({
            key: step,
            label: stepLabel(step),
            value: funnel.payments[step],
            detail:
              step === 'paywallShown' ? (
                <div className="text-body-xs text-muted-foreground">
                  <span>{t('gateNote')} </span>
                  {GATES.map((gate, i) => (
                    <span key={gate} className="tabular-nums">
                      {i > 0 && ' · '}
                      {t(`gates.${gate}`)}{' '}
                      {funnel.payments.paywallByGate[gate].toLocaleString(locale)}
                    </span>
                  ))}
                </div>
              ) : undefined,
          }))}
          base={funnel.payments.paywallShown}
          emptyLabel={t('emptyState')}
          footer={
            trackingNote && <p className="text-body-xs text-muted-foreground">{trackingNote}</p>
          }
        />
      </div>

      <ActiveDaysCard
        days={funnel.firstWeekActiveDays}
        avg={avgActiveDays(funnel.signups)}
        weekCompleted={funnel.signups.weekCompleted}
      />

      <BreakdownTable
        title={t('bySourceTitle')}
        rows={SOURCE_KEYS.map((key) => ({ key, label: tSources(key), row: funnel.bySource[key] }))}
        stepLabel={stepLabel}
        trackingNote={trackingNote}
        emptyLabel={t('noRows')}
        rowKeyLabel={t('rowKey')}
      />

      <BreakdownTable
        title={t('byLandingTitle')}
        rows={SIGNUP_LANDING_KEYS.map((key) => ({
          key,
          label: t(`landingTypes.${key}`),
          row: funnel.byLandingType[key],
        }))}
        stepLabel={stepLabel}
        trackingNote={trackingNote}
        emptyLabel={t('noRows')}
        rowKeyLabel={t('rowKey')}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">{t('visitorsByLandingTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-body-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-start font-normal pb-2">{t('rowKey')}</th>
                  {VISITOR_COLUMNS.map((col) => (
                    <th key={col} className="text-end font-normal pb-2 ps-3">
                      {t(`steps.${col}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VISITOR_LANDING_KEYS.map((key) => {
                  const row = funnel.visitorsByLandingType[key]
                  return (
                    <tr key={key} className="border-t border-border">
                      <td className="py-2">{t(`landingTypes.${key}`)}</td>
                      {VISITOR_COLUMNS.map((col) => (
                        <td key={col} className="py-2 ps-3 text-end tabular-nums">
                          {row[col].toLocaleString(locale)}
                          {col !== 'visitors' && col !== 'humans' && (
                            <span className="ms-1 text-body-xs text-muted-foreground">
                              {formatPercent(percentOf(row[col], row.humans))}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {segment !== 'all' && segment !== 'b2c' && (
            <p className="text-body-xs text-muted-foreground">{t('anonymousNote')}</p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

interface FunnelStep {
  key: string
  label: React.ReactNode
  value: number
  detail?: React.ReactNode
}

function FunnelCard({
  title,
  steps,
  base,
  baseLabel,
  emptyLabel,
  footer,
}: {
  title: string
  steps: FunnelStep[]
  base: number
  baseLabel?: string
  emptyLabel: string
  footer?: React.ReactNode
}) {
  const locale = useLocale()
  const last = steps[steps.length - 1]?.key

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {base === 0 ? (
          <p className="text-body-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-3">
            {steps.map((step) => {
              const pct = percentOf(step.value, base) ?? 0
              return (
                <li key={step.key} className="space-y-1">
                  <div className="flex items-center justify-between text-body-sm gap-content-gap-xs">
                    <span className="truncate">{step.label}</span>
                    <span className="tabular-nums shrink-0">
                      <span className="font-semibold">{step.value.toLocaleString(locale)}</span>
                      <span className="ms-1 text-body-xs text-muted-foreground">
                        ({pct.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${step.key === last ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                      aria-hidden
                    />
                  </div>
                  {step.detail}
                </li>
              )
            })}
          </ul>
        )}
        {baseLabel && base > 0 && (
          <p className="text-body-xs text-muted-foreground">% {baseLabel}</p>
        )}
        {footer}
      </CardContent>
    </Card>
  )
}

function ActiveDaysCard({
  days,
  avg,
  weekCompleted,
}: {
  days: number[]
  avg: number | null
  weekCompleted: number
}) {
  const t = useTranslations('dashboard.funnel')
  const locale = useLocale()
  const max = days.reduce((m, n) => Math.max(m, n), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between gap-content-gap flex-wrap">
        <CardTitle className="text-heading-md">{t('activeDaysTitle')}</CardTitle>
        <span className="text-body-sm text-muted-foreground">
          {t('avgDays').replace('{n}', formatAvgDays(avg))}
        </span>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {weekCompleted === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t('emptyState')}</p>
        ) : (
          <ul className="grid grid-cols-8 gap-content-gap-xs items-end h-40">
            {days.map((count, dayCount) => {
              const heightPct = max > 0 ? (count / max) * 100 : 0
              return (
                <li key={dayCount} className="flex flex-col items-center justify-end h-full">
                  <span className="text-body-xs font-semibold tabular-nums">
                    {count.toLocaleString(locale)}
                  </span>
                  <div
                    className="w-full bg-primary/80 hover:bg-primary rounded-sm transition-all"
                    style={{ height: `${heightPct}%`, minHeight: count > 0 ? 4 : 0 }}
                    title={`${dayCount}: ${count.toLocaleString(locale)}`}
                    aria-label={`${dayCount}: ${count}`}
                  />
                  <span className="mt-1 text-body-xs text-muted-foreground tabular-nums">
                    {dayCount}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <p className="text-body-xs text-muted-foreground">
          {t('daysAxis')} ·{' '}
          {t('weekCompletedCaption').replace('{n}', weekCompleted.toLocaleString(locale))}
        </p>
      </CardContent>
    </Card>
  )
}

function BreakdownTable({
  title,
  rows,
  stepLabel,
  trackingNote,
  emptyLabel,
  rowKeyLabel,
}: {
  title: string
  rows: { key: string; label: string; row: SignupFunnel }[]
  stepLabel: (step: string) => React.ReactNode
  trackingNote: string | null
  emptyLabel: string
  rowKeyLabel: string
}) {
  const locale = useLocale()
  const visible = rows.filter(({ row }) => row.signedUp > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {visible.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-body-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-start font-normal pb-2">{rowKeyLabel}</th>
                  {SIGNUP_COLUMNS.map((col) => (
                    <th key={col} className="text-end font-normal pb-2 ps-3">
                      {stepLabel(col)}
                      {trackingNote && TRACKED_COLUMNS.has(col) && <span aria-hidden> †</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(({ key, label, row }) => (
                  <tr key={key} className="border-t border-border">
                    <td className="py-2">{label}</td>
                    {SIGNUP_COLUMNS.map((col) =>
                      col === 'avgDays' ? (
                        <td key={col} className="py-2 ps-3 text-end tabular-nums">
                          {formatAvgDays(avgActiveDays(row))}
                        </td>
                      ) : (
                        <td key={col} className="py-2 ps-3 text-end tabular-nums">
                          {row[col].toLocaleString(locale)}
                          {col !== 'signedUp' && (
                            <span className="ms-1 text-body-xs text-muted-foreground">
                              {formatPercent(percentOf(row[col], row.signedUp))}
                            </span>
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {trackingNote && visible.length > 0 && (
          <p className="text-body-xs text-muted-foreground">† {trackingNote}</p>
        )}
      </CardContent>
    </Card>
  )
}
