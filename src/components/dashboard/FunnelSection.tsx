/**
 * Funnel tab (Web PRs #1631, #1639, #1641, #1660, #1661). Read-only render of
 * `data.funnel`; follows the shell's period + segment.
 *
 * Sections, top to bottom:
 * 1. Visitors → signup bars (with why Google clicks didn't sign up under
 *    "Clicked Google") + visitors-by-landing table, then visitors by device
 * 2. New signups → first week bars (Alive / Did something / Came back) +
 *    days-active histogram over signups whose first week is over
 * 3. Signups by source / by landing page tables
 * 4. Students → payment bars (every active student, not only new signups)
 *    with two side stats
 * 5. Walls: stacked outcome bar per gate + per-gate table
 *
 * Caveats rendered inline: wall / plan / checkout events only exist from
 * `eventsTrackedSince` (note on sections 4–5 and the Paid column); Google
 * cancel / fail outcomes only exist from `googleOutcomesSince` (breakdown
 * replaced by a note when the period starts earlier); visitor steps are
 * anonymous and can't be segmented (note on section 1 under b2b / other).
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Visitor-to-paid funnel, first-week depth, and per-wall outcomes
 */

'use client'

import type React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'
import type {
  FunnelDeviceKey,
  FunnelMetrics,
  LandingType,
  Period,
  Segment,
  SignupFunnel,
  VisitorFunnel,
  WallGate,
  WallGateStats,
} from '@/types/dashboard'
import {
  devicesByHumans,
  formatRatio,
  gatesByStudents,
  googleDropOff,
  startsBeforeTracking,
  wallSegments,
} from './funnel-math'
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

const PAYMENT_STEPS = ['paywallShown', 'planSelected', 'checkoutStarted', 'paid'] as const

const SIGNUP_COLUMNS = [
  'signedUp',
  'activeFirstWeek',
  'engagedFirstWeek',
  'returnedFirstWeek',
  'paid',
] as const satisfies readonly (keyof SignupFunnel)[]

// Steps whose label carries a definition tooltip (`tooltips.<step>`).
const STEPS_WITH_TOOLTIP = new Set<string>([
  'activeFirstWeek',
  'engagedFirstWeek',
  'returnedFirstWeek',
  'planSelected',
])

const SOURCE_KEYS = ['google', 'guykoren', 'direct', 'other', 'unknown'] as const
const SIGNUP_LANDING_KEYS = ['lesson', 'course', 'start', 'home', 'other', 'unknown'] as const
const VISITOR_LANDING_KEYS = [
  'lesson',
  'course',
  'start',
  'home',
  'other',
] as const satisfies readonly LandingType[]

// Strongest emphasis on "paid", muted on "didn't pick a plan".
const WALL_SEGMENTS = [
  { key: 'paid', color: 'bg-success' },
  { key: 'planNoPay', color: 'bg-primary/60' },
  { key: 'noPlan', color: 'bg-muted-foreground/30' },
] as const

// Only the AI-quota wall has a "continue without upgrading" option.
const DISMISSABLE_GATES = new Set<WallGate>(['ai_quota'])

const GOOGLE_DROP_OFF_KEYS = ['cancelled', 'failed', 'noReturn'] as const

interface Props {
  funnel: FunnelMetrics
  period: Period
  segment: Segment
}

export function FunnelSection({ funnel, period, segment }: Props) {
  const t = useTranslations('dashboard.funnel')
  const locale = useLocale()
  const formatYmd = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString(locale)

  const trackingNote =
    startsBeforeTracking(period, funnel.eventsTrackedSince) && funnel.eventsTrackedSince
      ? t('trackingNote').replace('{date}', formatYmd(funnel.eventsTrackedSince))
      : null
  const likelyBots = Math.max(0, funnel.visitors.visitors - funnel.visitors.humans)
  const showAnonymousNote = segment === 'b2b' || segment === 'other'

  // Cancel / fail outcomes only exist from googleOutcomesSince, so the
  // breakdown is shown only when the whole period is covered; otherwise
  // this note stands in for it.
  const { googleOutcomesSince } = funnel
  const googleOutcomesNote =
    googleOutcomesSince === null
      ? t('googleOutcomes.notTracked')
      : startsBeforeTracking(period, googleOutcomesSince)
        ? t('googleOutcomes.trackingStarted').replace('{date}', formatYmd(googleOutcomesSince))
        : null
  const googleDetail = googleOutcomesNote ? (
    <Note>{googleOutcomesNote}</Note>
  ) : (
    <GoogleDropOffList visitors={funnel.visitors} />
  )

  const stepLabel = (step: string) =>
    STEPS_WITH_TOOLTIP.has(step) ? (
      <FormulaTooltip content={t(`tooltips.${step}`)}>{t(`steps.${step}`)}</FormulaTooltip>
    ) : (
      t(`steps.${step}`)
    )

  return (
    <section className="space-y-6">
      <h2 className="text-heading-lg font-semibold">{t('section')}</h2>

      {/* 1. Visitors → signup */}
      <div className="grid gap-content-gap grid-cols-1 lg:grid-cols-2">
        <FunnelCard
          title={t('visitorsTitle')}
          steps={VISITOR_STEPS.map((step) => ({
            key: step,
            label: stepLabel(step),
            value: funnel.visitors[step],
            detail:
              step === 'signupPromptShown' ? (
                <Note>{t('stepHints.signupPromptShown')}</Note>
              ) : step === 'googleClicked' ? (
                googleDetail
              ) : undefined,
          }))}
          base={funnel.visitors.humans}
          baseLabel={t('ofHumans')}
          emptyLabel={t('emptyState')}
          footer={
            <>
              <Note>{t('likelyBots').replace('{n}', likelyBots.toLocaleString(locale))}</Note>
              {funnel.existingStudentVisits > 0 && (
                <Note>
                  {t('existingStudentsNote').replace(
                    '{n}',
                    funnel.existingStudentVisits.toLocaleString(locale),
                  )}
                </Note>
              )}
              {showAnonymousNote && <Note>{t('anonymousNote')}</Note>}
            </>
          }
        />
        <VisitorsByLandingTable funnel={funnel} showAnonymousNote={showAnonymousNote} />
      </div>
      <VisitorsByDeviceTable
        byDevice={funnel.visitorsByDevice}
        googleOutcomesNote={googleOutcomesNote}
        showAnonymousNote={showAnonymousNote}
      />

      {/* 2. New signups → first week */}
      <div className="grid gap-content-gap grid-cols-1 lg:grid-cols-2">
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
          footer={<Note>{t('firstWeekNote')}</Note>}
        />
        {funnel.signups.weekCompleted > 0 && (
          <ActiveDaysCard
            days={funnel.firstWeekActiveDays}
            weekCompleted={funnel.signups.weekCompleted}
          />
        )}
      </div>

      {/* 3. Signups by source / landing page */}
      <BreakdownTable
        title={t('bySourceTitle')}
        rows={SOURCE_KEYS.map((key) => ({
          key,
          label: t(`sources.${key}`),
          row: funnel.bySource[key],
        }))}
        stepLabel={stepLabel}
        trackingNote={trackingNote}
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
      />

      {/* 4. Students → payment, 5. Walls chart */}
      <div className="grid gap-content-gap grid-cols-1 lg:grid-cols-2">
        <FunnelCard
          title={t('paymentsTitle')}
          steps={PAYMENT_STEPS.map((step) => ({
            key: step,
            label: stepLabel(step),
            value: funnel.payments[step],
          }))}
          base={funnel.payments.paywallShown}
          baseLabel={t('ofPaywall')}
          emptyLabel={t('emptyState')}
          footer={
            <>
              <dl className="grid grid-cols-2 gap-content-gap-xs text-body-sm">
                {(['paywallDismissed', 'pricingViewed'] as const).map((key) => (
                  <div key={key} className="rounded-md border border-border p-card-padding-sm">
                    <dt className="text-body-xs text-muted-foreground">{t(`sideStats.${key}`)}</dt>
                    <dd className="font-semibold tabular-nums">
                      {funnel.payments[key].toLocaleString(locale)}
                    </dd>
                  </div>
                ))}
              </dl>
              <Note>{t('paymentsScope')}</Note>
              {trackingNote && <Note>{trackingNote}</Note>}
            </>
          }
        />
        <WallsChartCard byGate={funnel.payments.byGate} trackingNote={trackingNote} />
      </div>

      <WallsTable byGate={funnel.payments.byGate} trackingNote={trackingNote} />
    </section>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-body-xs text-muted-foreground">{children}</p>
}

interface FunnelStep {
  key: string
  label: React.ReactNode
  value: number
  /** Rendered under the step's bar. */
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
  baseLabel: string
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
          <>
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
                    {step.detail && (
                      <div className="mt-1 border-s border-border ps-3">{step.detail}</div>
                    )}
                  </li>
                )
              })}
            </ul>
            <Note>% {baseLabel}</Note>
          </>
        )}
        {footer}
      </CardContent>
    </Card>
  )
}

/** Why Google clicks didn't sign up, nested under the "Clicked Google" bar. */
function GoogleDropOffList({ visitors }: { visitors: VisitorFunnel }) {
  const t = useTranslations('dashboard.funnel')
  const locale = useLocale()
  const parts = googleDropOff(visitors)

  return (
    <ul className="space-y-0.5 text-body-xs text-muted-foreground">
      {GOOGLE_DROP_OFF_KEYS.map((key) => (
        <li key={key} className="flex items-center justify-between gap-content-gap-xs">
          <span className="truncate">
            {key === 'noReturn' ? (
              <FormulaTooltip content={t('tooltips.noReturn')}>
                {t('googleOutcomes.noReturn')}
              </FormulaTooltip>
            ) : (
              t(`googleOutcomes.${key}`)
            )}
          </span>
          <span className="tabular-nums shrink-0">{parts[key].toLocaleString(locale)}</span>
        </li>
      ))}
    </ul>
  )
}

function VisitorsByLandingTable({
  funnel,
  showAnonymousNote,
}: {
  funnel: FunnelMetrics
  showAnonymousNote: boolean
}) {
  const t = useTranslations('dashboard.funnel')
  const locale = useLocale()
  const rows = VISITOR_LANDING_KEYS.filter((key) => funnel.visitorsByLandingType[key].visitors > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('visitorsByLandingTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {rows.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t('emptyState')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-body-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-start font-normal pb-2">{t('rowKey')}</th>
                  {VISITOR_STEPS.map((col) => (
                    <th key={col} className="text-end font-normal pb-2 ps-3">
                      {t(`steps.${col}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((key) => {
                  const row = funnel.visitorsByLandingType[key]
                  return (
                    <tr key={key} className="border-t border-border">
                      <td className="py-2">{t(`landingTypes.${key}`)}</td>
                      {VISITOR_STEPS.map((col) => (
                        <td key={col} className="py-2 ps-3 text-end tabular-nums">
                          {row[col].toLocaleString(locale)}
                          {col !== 'humans' && (
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
        )}
        {showAnonymousNote && <Note>{t('anonymousNote')}</Note>}
      </CardContent>
    </Card>
  )
}

/**
 * Visitor funnel per device (Web PR #1661). The cancel / fail / no-return
 * columns are dropped when the period predates googleOutcomesSince, same as
 * the breakdown under "Clicked Google".
 */
function VisitorsByDeviceTable({
  byDevice,
  googleOutcomesNote,
  showAnonymousNote,
}: {
  byDevice: Record<FunnelDeviceKey, VisitorFunnel>
  googleOutcomesNote: string | null
  showAnonymousNote: boolean
}) {
  const t = useTranslations('dashboard.funnel')
  const locale = useLocale()
  const rows = devicesByHumans(byDevice)
  const showOutcomes = googleOutcomesNote === null
  const n = (value: number) => value.toLocaleString(locale)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('visitorsByDeviceTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {rows.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t('emptyState')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-body-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-start font-normal pb-2">{t('rowKey')}</th>
                  {VISITOR_STEPS.map((col) => (
                    <th key={col} className="text-end font-normal pb-2 ps-3">
                      {t(`steps.${col}`)}
                    </th>
                  ))}
                  <th className="text-end font-normal pb-2 ps-3">{t('clickedToSignedUp')}</th>
                  {showOutcomes && (
                    <>
                      <th className="text-end font-normal pb-2 ps-3">
                        {t('googleOutcomes.cancelled')}
                      </th>
                      <th className="text-end font-normal pb-2 ps-3">
                        {t('googleOutcomes.failed')}
                      </th>
                      <th className="text-end font-normal pb-2 ps-3">
                        <FormulaTooltip content={t('tooltips.noReturn')}>
                          {t('googleOutcomes.noReturn')}
                        </FormulaTooltip>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((key) => {
                  const row = byDevice[key]
                  const dropOff = googleDropOff(row)
                  return (
                    <tr key={key} className="border-t border-border">
                      <td className="py-2">{t(`devices.${key}`)}</td>
                      {VISITOR_STEPS.map((col) => (
                        <td key={col} className="py-2 ps-3 text-end tabular-nums">
                          {n(row[col])}
                        </td>
                      ))}
                      <td className="py-2 ps-3 text-end tabular-nums font-semibold">
                        {formatPercent(percentOf(row.signedUp, row.googleClicked))}
                      </td>
                      {showOutcomes &&
                        GOOGLE_DROP_OFF_KEYS.map((part) => (
                          <td key={part} className="py-2 ps-3 text-end tabular-nums">
                            {n(dropOff[part])}
                          </td>
                        ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {googleOutcomesNote && rows.length > 0 && <Note>{googleOutcomesNote}</Note>}
        <Note>{t('deviceNote')}</Note>
        {showAnonymousNote && <Note>{t('anonymousNote')}</Note>}
      </CardContent>
    </Card>
  )
}

function ActiveDaysCard({ days, weekCompleted }: { days: number[]; weekCompleted: number }) {
  const t = useTranslations('dashboard.funnel')
  const locale = useLocale()
  const max = days.reduce((m, n) => Math.max(m, n), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('activeDaysTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
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
        <Note>{t('daysAxis')}</Note>
        <Note>
          {t('weekCompletedCaption').replace('{n}', weekCompleted.toLocaleString(locale))}
        </Note>
      </CardContent>
    </Card>
  )
}

function BreakdownTable({
  title,
  rows,
  stepLabel,
  trackingNote,
}: {
  title: string
  rows: { key: string; label: string; row: SignupFunnel }[]
  stepLabel: (step: string) => React.ReactNode
  trackingNote: string | null
}) {
  const t = useTranslations('dashboard.funnel')
  const locale = useLocale()
  const visible = rows.filter(({ row }) => row.signedUp > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {visible.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t('noRows')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-body-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-start font-normal pb-2">{t('rowKey')}</th>
                  {SIGNUP_COLUMNS.map((col) => (
                    <th key={col} className="text-end font-normal pb-2 ps-3">
                      {stepLabel(col)}
                      {trackingNote && col === 'paid' && <span aria-hidden> †</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(({ key, label, row }) => (
                  <tr key={key} className="border-t border-border">
                    <td className="py-2">{label}</td>
                    {SIGNUP_COLUMNS.map((col) => (
                      <td key={col} className="py-2 ps-3 text-end tabular-nums">
                        {row[col].toLocaleString(locale)}
                        {col !== 'signedUp' && (
                          <span className="ms-1 text-body-xs text-muted-foreground">
                            {formatPercent(percentOf(row[col], row.signedUp))}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {trackingNote && visible.length > 0 && <Note>† {trackingNote}</Note>}
      </CardContent>
    </Card>
  )
}

function WallsChartCard({
  byGate,
  trackingNote,
}: {
  byGate: Record<WallGate, WallGateStats>
  trackingNote: string | null
}) {
  const t = useTranslations('dashboard.funnel')
  const locale = useLocale()
  const gates = gatesByStudents(byGate)
  const max = byGate[gates[0] ?? 'ai_quota'].students

  if (max === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('wallsChartTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <ul className="space-y-3">
          {gates.map((gate) => {
            const row = byGate[gate]
            const parts = wallSegments(row)
            return (
              <li key={gate} className="space-y-1">
                <div className="flex items-center justify-between text-body-sm gap-content-gap-xs">
                  <span className="truncate">{t(`gates.${gate}`)}</span>
                  <span className="font-semibold tabular-nums shrink-0">
                    {row.students.toLocaleString(locale)}
                  </span>
                </div>
                {/* Bar length = students, relative to the largest wall. */}
                <div className="h-3 rounded-sm bg-muted">
                  <div
                    className="flex h-full overflow-hidden rounded-sm"
                    style={{ width: `${(row.students / max) * 100}%` }}
                  >
                    {WALL_SEGMENTS.map(({ key, color }) => {
                      const value = parts[key]
                      if (value === 0) return null
                      return (
                        <div
                          key={key}
                          className={color}
                          style={{ width: `${percentOf(value, row.students) ?? 0}%` }}
                        >
                          <FormulaTooltip
                            plain
                            className="block h-full"
                            content={`${t(`wallSegments.${key}`)}: ${value.toLocaleString(locale)} (${formatPercent(percentOf(value, row.students))} ${t('wallSegments.ofWall')})`}
                          >
                            <span className="sr-only">{t(`wallSegments.${key}`)}</span>
                          </FormulaTooltip>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body-xs text-muted-foreground">
          {WALL_SEGMENTS.map(({ key, color }) => (
            <li key={key} className="flex items-center gap-1.5">
              <span className={`${color} inline-block h-2 w-2 rounded-sm`} aria-hidden />
              {t(`wallSegments.${key}`)}
            </li>
          ))}
        </ul>
        {trackingNote && <Note>{trackingNote}</Note>}
      </CardContent>
    </Card>
  )
}

function WallsTable({
  byGate,
  trackingNote,
}: {
  byGate: Record<WallGate, WallGateStats>
  trackingNote: string | null
}) {
  const t = useTranslations('dashboard.funnel')
  const locale = useLocale()
  const gates = gatesByStudents(byGate)
  const afterIt = (key: 'decidedPlan' | 'decidedPaid') => (
    <FormulaTooltip content={t('tooltips.afterIt')}>{t(`wallColumns.${key}`)}</FormulaTooltip>
  )
  const n = (value: number) => value.toLocaleString(locale)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('wallsTableTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="text-body-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-start font-normal pb-2">{t('wallColumns.gate')}</th>
                <th className="text-end font-normal pb-2 ps-3">{t('wallColumns.students')}</th>
                <th className="text-end font-normal pb-2 ps-3">{t('wallColumns.hits')}</th>
                <th className="text-end font-normal pb-2 ps-3">
                  {t('wallColumns.hitsPerStudent')}
                </th>
                <th className="text-end font-normal pb-2 ps-3">{t('wallColumns.repeat')}</th>
                <th className="text-end font-normal pb-2 ps-3">{t('wallColumns.dismissed')}</th>
                <th className="text-end font-normal pb-2 ps-3">{afterIt('decidedPlan')}</th>
                <th className="text-end font-normal pb-2 ps-3">{afterIt('decidedPaid')}</th>
                <th className="text-end font-normal pb-2 ps-3">{t('wallColumns.paidPerHit')}</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((gate) => {
                const row = byGate[gate]
                return (
                  <tr key={gate} className="border-t border-border">
                    <td className="py-2">{t(`gates.${gate}`)}</td>
                    <td className="py-2 ps-3 text-end tabular-nums">{n(row.students)}</td>
                    <td className="py-2 ps-3 text-end tabular-nums">{n(row.hits)}</td>
                    <td className="py-2 ps-3 text-end tabular-nums">
                      {formatRatio(row.hits, row.students)}
                    </td>
                    <td className="py-2 ps-3 text-end tabular-nums">
                      {n(row.repeatStudents)}
                      <span className="ms-1 text-body-xs text-muted-foreground">
                        {formatPercent(percentOf(row.repeatStudents, row.students))}
                      </span>
                    </td>
                    <td className="py-2 ps-3 text-end tabular-nums">
                      {DISMISSABLE_GATES.has(gate) ? n(row.dismissedStudents) : '—'}
                    </td>
                    <td className="py-2 ps-3 text-end tabular-nums">{n(row.decidedPlan)}</td>
                    <td className="py-2 ps-3 text-end tabular-nums">{n(row.decidedPaid)}</td>
                    <td className="py-2 ps-3 text-end tabular-nums font-semibold">
                      {formatPercent(percentOf(row.decidedPaid, row.students))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {trackingNote && <Note>{trackingNote}</Note>}
      </CardContent>
    </Card>
  )
}
