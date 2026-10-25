/**
 * Guest insights (Web PR #1465) — four cards under the guest-sessions tile:
 * landing source, conversion by landing type, onboarding funnel, and bots.
 *
 * Numbers only cover guests created after #1465 deployed, so they're shown
 * on their own (with a "tracking since" note) rather than reconciled against
 * the `userMetrics` guest totals. Windows are fixed by Web (rolling 30d /
 * all-time) and ignore the header period picker.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Guest landing source, conversion, onboarding funnel and bot split
 */

'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'
import { LANDING_TYPES } from '@/types/dashboard'
import type { GuestInsights, LandingType, OnboardingFunnel } from '@/types/dashboard'

import { MetricCard } from './MetricCard'
import { formatPercent, funnelDropOff, percentOf } from './guest-insights-math'

/**
 * Date guest-insights tracking started in prod (Web #1465 deploy, YYYY-MM-DD).
 * Set once the manager promotes it; until then the note falls back to
 * generic "since the tracking release" copy.
 */
const GUEST_INSIGHTS_TRACKING_SINCE: string | null = null

const LANDING_COLOR: Record<LandingType, string> = {
  lesson: 'bg-primary',
  course: 'bg-success',
  start: 'bg-accent',
  home: 'bg-warning',
  other: 'bg-muted-foreground',
}

const FUNNEL_STEPS = [
  'started',
  'personaSelected',
  'gradeSelected',
  'signupPromptShown',
  'googleClicked',
  'completed',
] as const satisfies readonly (keyof OnboardingFunnel)[]

const BOT_CATEGORIES = ['search', 'socialPreview', 'aiCrawler', 'other'] as const

interface Props {
  insights: GuestInsights
}

export function GuestInsightsSection({ insights }: Props) {
  const t = useTranslations('dashboard.guestInsights')
  const locale = useLocale()

  const trackingNote = GUEST_INSIGHTS_TRACKING_SINCE
    ? `${t('trackingSince')} ${new Date(GUEST_INSIGHTS_TRACKING_SINCE).toLocaleDateString(locale)}`
    : t('trackingSinceRelease')

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-heading-md font-semibold">{t('section')}</h3>
        <p className="text-body-xs text-muted-foreground">{trackingNote}</p>
      </div>

      <div className="grid gap-content-gap grid-cols-1 lg:grid-cols-2">
        <LandingSourceCard insights={insights} />
        <ConversionByLandingCard insights={insights} />
        <OnboardingFunnelCard funnel={insights.onboardingFunnel} />
        <BotsCard bots={insights.bots} />
      </div>
    </section>
  )
}

function LandingSourceCard({ insights }: Props) {
  const t = useTranslations('dashboard.guestInsights')
  const locale = useLocale()
  const [range, setRange] = useState<'last30d' | 'allTime'>('last30d')

  const breakdown =
    range === 'last30d' ? insights.landingBreakdownLast30d : insights.landingBreakdown
  const total = LANDING_TYPES.reduce((sum, key) => sum + breakdown[key], 0)

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-heading-md">{t('landing.title')}</CardTitle>
        <div className="inline-flex items-center rounded-md border border-border bg-background p-1 gap-1">
          {(['last30d', 'allTime'] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={range === option ? 'default' : 'ghost'}
              onClick={() => setRange(option)}
              aria-pressed={range === option}
            >
              {t(`ranges.${option}`)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-5">
        {total === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t('emptyState')}</p>
        ) : (
          <>
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={t('landing.barAriaLabel')}
            >
              {LANDING_TYPES.map((key) => {
                const value = breakdown[key]
                if (value === 0) return null
                const pct = (value / total) * 100
                return (
                  <div
                    key={key}
                    className={LANDING_COLOR[key]}
                    style={{ width: `${pct}%` }}
                    title={`${t(`landingTypes.${key}`)}: ${value.toLocaleString(locale)} (${pct.toFixed(1)}%)`}
                  />
                )
              })}
            </div>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-content-gap-sm">
              {LANDING_TYPES.map((key) => (
                <li key={key} className="flex items-center gap-2 min-w-0">
                  <span
                    className={`${LANDING_COLOR[key]} inline-block h-3 w-3 shrink-0 rounded-sm`}
                    aria-hidden="true"
                  />
                  <span className="text-body-sm text-foreground truncate">
                    {t(`landingTypes.${key}`)}
                  </span>
                  <span className="text-body-sm text-muted-foreground tabular-nums ms-auto">
                    {breakdown[key].toLocaleString(locale)}
                    <span className="ms-1 text-body-xs">
                      ({formatPercent(percentOf(breakdown[key], total))})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="grid gap-content-gap grid-cols-1 md:grid-cols-2">
          <div className="space-y-2 min-w-0">
            <p className="text-body-xs text-muted-foreground uppercase tracking-wide">
              {t('landing.topPaths')}
            </p>
            {insights.topLandingPaths.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{t('emptyState')}</p>
            ) : (
              <ul className="space-y-1.5">
                {insights.topLandingPaths.map((row) => (
                  <li key={row.path} className="flex items-center gap-2 text-body-sm min-w-0">
                    <span
                      className={`${LANDING_COLOR[row.type]} inline-block h-2 w-2 shrink-0 rounded-full`}
                      title={t(`landingTypes.${row.type}`)}
                      aria-label={t(`landingTypes.${row.type}`)}
                    />
                    <span className="truncate font-mono text-body-xs" dir="ltr" title={row.path}>
                      {row.path}
                    </span>
                    <span className="tabular-nums font-semibold ms-auto">
                      {row.count.toLocaleString(locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2 min-w-0">
            <p className="text-body-xs text-muted-foreground uppercase tracking-wide">
              {t('landing.topReferrers')}
            </p>
            {insights.topReferrers.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{t('landing.noReferrers')}</p>
            ) : (
              <ul className="space-y-1.5">
                {insights.topReferrers.map((row) => (
                  <li key={row.host} className="flex items-center gap-2 text-body-sm min-w-0">
                    <span className="truncate" dir="ltr" title={row.host}>
                      {row.host}
                    </span>
                    <span className="tabular-nums font-semibold ms-auto">
                      {row.count.toLocaleString(locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="text-body-xs text-muted-foreground">{t('landing.listsWindow')}</p>
      </CardContent>
    </Card>
  )
}

function ConversionByLandingCard({ insights }: Props) {
  const t = useTranslations('dashboard.guestInsights')
  const locale = useLocale()
  const rows = insights.conversionByLandingType

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('conversion.title')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-body-xs text-muted-foreground uppercase tracking-wide">
              <th className="text-start font-normal pb-2">{t('conversion.landing')}</th>
              <th className="text-end font-normal pb-2">{t('conversion.guests')}</th>
              <th className="text-end font-normal pb-2">{t('conversion.converted')}</th>
              <th className="text-end font-normal pb-2">{t('conversion.rate')}</th>
            </tr>
          </thead>
          <tbody>
            {LANDING_TYPES.map((key) => (
              <tr key={key} className="border-t border-border">
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className={`${LANDING_COLOR[key]} inline-block h-2 w-2 shrink-0 rounded-full`}
                      aria-hidden="true"
                    />
                    {t(`landingTypes.${key}`)}
                  </span>
                </td>
                <td className="py-2 text-end tabular-nums">
                  {rows[key].guests.toLocaleString(locale)}
                </td>
                <td className="py-2 text-end tabular-nums">
                  {rows[key].converted.toLocaleString(locale)}
                </td>
                <td className="py-2 text-end tabular-nums font-semibold">
                  {formatPercent(percentOf(rows[key].converted, rows[key].guests))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-body-xs text-muted-foreground mt-3">{t('conversion.window')}</p>
      </CardContent>
    </Card>
  )
}

function OnboardingFunnelCard({ funnel }: { funnel: OnboardingFunnel }) {
  const t = useTranslations('dashboard.guestInsights')
  const locale = useLocale()
  const { reachedSignupButLeft, clickedGoogleButLeft } = funnelDropOff(funnel)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('funnel.title')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-5">
        <div className="grid gap-content-gap grid-cols-2">
          <MetricCard
            label={t('funnel.reachedSignupButLeft')}
            value={reachedSignupButLeft}
            hint={`${formatPercent(percentOf(reachedSignupButLeft, funnel.signupPromptShown))} ${t('funnel.ofPromptShown')}`}
          />
          <MetricCard
            label={t('funnel.clickedGoogleButLeft')}
            value={clickedGoogleButLeft}
            hint={`${formatPercent(percentOf(clickedGoogleButLeft, funnel.googleClicked))} ${t('funnel.ofGoogleClicked')}`}
          />
        </div>

        {funnel.started === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t('emptyState')}</p>
        ) : (
          <ul className="space-y-2">
            {FUNNEL_STEPS.map((step) => {
              const pct = percentOf(funnel[step], funnel.started) ?? 0
              return (
                <li key={step} className="space-y-1">
                  <div className="flex items-center justify-between text-body-sm gap-content-gap-xs">
                    <span className="truncate">{t(`funnel.steps.${step}`)}</span>
                    <span className="tabular-nums shrink-0">
                      <span className="font-semibold">{funnel[step].toLocaleString(locale)}</span>
                      <span className="ms-1 text-body-xs text-muted-foreground">
                        ({pct.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${step === 'completed' ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                      aria-hidden
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="text-body-xs text-muted-foreground">{t('funnel.note')}</p>
      </CardContent>
    </Card>
  )
}

function BotsCard({ bots }: { bots: GuestInsights['bots'] }) {
  const t = useTranslations('dashboard.guestInsights')
  const locale = useLocale()
  const uaTotal = BOT_CATEGORIES.reduce((sum, key) => sum + bots.uaBotHitsLast30d[key], 0)
  const sessionTotal = bots.jsConfirmedLast30d + bots.unconfirmedLast30d

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('bots.title')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-body-xs text-muted-foreground uppercase tracking-wide">
              {t('bots.uaHits')}
            </p>
            <span className="text-body-sm font-semibold tabular-nums">
              {uaTotal.toLocaleString(locale)}
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-content-gap-sm">
            {BOT_CATEGORIES.map((key) => (
              <li key={key} className="flex items-center gap-2 text-body-sm min-w-0">
                <span className="truncate">{t(`bots.categories.${key}`)}</span>
                <span className="tabular-nums text-muted-foreground ms-auto">
                  {bots.uaBotHitsLast30d[key].toLocaleString(locale)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-body-xs text-muted-foreground">{t('bots.uaHitsNote')}</p>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-body-xs text-muted-foreground uppercase tracking-wide">
              {t('bots.guestSessions')}
            </p>
            <span className="text-body-sm font-semibold tabular-nums">
              {bots.guestSessionsLast30d.toLocaleString(locale)}
            </span>
          </div>
          {sessionTotal > 0 && (
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={t('bots.splitAriaLabel')}
            >
              <div
                className="bg-success"
                style={{ width: `${(bots.jsConfirmedLast30d / sessionTotal) * 100}%` }}
              />
              <div
                className="bg-warning"
                style={{ width: `${(bots.unconfirmedLast30d / sessionTotal) * 100}%` }}
              />
            </div>
          )}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-content-gap-sm">
            <li className="flex items-center gap-2 text-body-sm min-w-0">
              <span className="bg-success inline-block h-3 w-3 shrink-0 rounded-sm" aria-hidden />
              <span className="truncate">{t('bots.jsConfirmed')}</span>
              <span className="tabular-nums text-muted-foreground ms-auto">
                {bots.jsConfirmedLast30d.toLocaleString(locale)}
                <span className="ms-1 text-body-xs">
                  ({formatPercent(percentOf(bots.jsConfirmedLast30d, sessionTotal))})
                </span>
              </span>
            </li>
            <li className="flex items-center gap-2 text-body-sm min-w-0">
              <span className="bg-warning inline-block h-3 w-3 shrink-0 rounded-sm" aria-hidden />
              <span className="truncate">{t('bots.unconfirmed')}</span>
              <span className="tabular-nums text-muted-foreground ms-auto">
                {bots.unconfirmedLast30d.toLocaleString(locale)}
                <span className="ms-1 text-body-xs">
                  ({formatPercent(percentOf(bots.unconfirmedLast30d, sessionTotal))})
                </span>
              </span>
            </li>
          </ul>
          <p className="text-body-xs text-muted-foreground">{t('bots.sessionsNote')}</p>
        </div>
      </CardContent>
    </Card>
  )
}
