/**
 * User metrics — 22 fields grouped into four sub-blocks: registered totals,
 * active users, guest sessions + conversion, and returning behavior.
 *
 * The header period picker (day/week/month/year) filters which time-scoped
 * cards render in each block. The current-vs-prior TrendBadge only carries a
 * signal at day scale (Today vs Yesterday), so we don't render it on the
 * weekly / monthly cards where the "prior" delta compares to a distant
 * bucket. Year period drops the granular counts entirely and defers to the
 * MonthlySignupsSection sibling for the yearly view.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Sectioned user statistics filtered by the selected period
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'
import type { Period, UserMetrics } from '@/types/dashboard'
import { MetricCard } from './MetricCard'
import { SignupSourceBreakdownCard } from './SignupSourceBreakdownCard'
import { TrendBadge } from './TrendBadge'

interface Props {
  metrics: UserMetrics
  period: Period
}

export function UserMetricsSection({ metrics, period }: Props) {
  const t = useTranslations('dashboard.users')
  const locale = useLocale()

  const returningHint = `${t('returningHintPrefix')} ${metrics.returningUsersTotal.toLocaleString(locale)} ${t('returningHintSuffix')}`

  // "Year" period has no dedicated fields on the response today — the
  // registered/active granular cards would misrepresent the yearly window,
  // so we hide them and lean on MonthlySignupsSection (rendered as a
  // sibling by DashboardShell) for the 12-month roll-up.
  const showRegisteredGranular = period !== 'year'
  const showActiveSection = period !== 'year'

  return (
    <section className="space-y-6">
      <h2 className="text-heading-lg font-semibold">{t('section')}</h2>

      {/* Registered totals — Total anchors every period. Period-scoped
          cards vary; year drops them entirely. */}
      <div className="grid gap-content-gap grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <MetricCard label={t('totalUsers')} value={metrics.totalUsers} />

        {showRegisteredGranular && period === 'day' && (
          <>
            <MetricCard
              label={t('registeredToday')}
              value={metrics.registeredToday}
              trend={
                <TrendBadge
                  current={metrics.registeredToday}
                  prior={metrics.registeredYesterday}
                  suffix={t('vsPrior')}
                />
              }
            />
            <MetricCard label={t('registeredYesterday')} value={metrics.registeredYesterday} />
          </>
        )}

        {showRegisteredGranular && period === 'week' && (
          <>
            <MetricCard
              label={t('thisWeek')}
              value={metrics.registeredThisWeek}
              trend={
                <TrendBadge
                  current={metrics.registeredThisWeek}
                  prior={metrics.registeredLastWeek}
                  suffix={t('vsPrior')}
                />
              }
            />
            <MetricCard label={t('lastWeek')} value={metrics.registeredLastWeek} />
          </>
        )}

        {showRegisteredGranular && period === 'month' && (
          <>
            <MetricCard
              label={t('thisMonth')}
              value={metrics.registeredThisMonth}
              trend={
                <TrendBadge
                  current={metrics.registeredThisMonth}
                  prior={metrics.registeredLastMonth}
                  suffix={t('vsPrior')}
                />
              }
            />
            <MetricCard label={t('lastMonth')} value={metrics.registeredLastMonth} />
          </>
        )}
      </div>

      {/* Signup source attribution — aggregate for the period, always shown. */}
      <SignupSourceBreakdownCard breakdown={metrics.signupSourceBreakdown} />

      {showActiveSection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-md">{t('activeSection')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-content-gap grid-cols-2 md:grid-cols-4">
              {period === 'day' && (
                <>
                  <MetricCard label={t('activeToday')} value={metrics.activeUsersToday} />
                  <MetricCard label={t('activeYesterday')} value={metrics.activeUsersYesterday} />
                </>
              )}
              {period === 'week' && (
                <MetricCard label={t('activeLastWeek')} value={metrics.activeUsersLastWeek} />
              )}
              {period === 'month' && (
                <MetricCard label={t('activeLastMonth')} value={metrics.activeUsersLastMonth} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guests + returning */}
      <div className="grid gap-content-gap grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-md">{t('guestSection')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-content-gap grid-cols-2 md:grid-cols-3">
              <MetricCard label={t('guestTotal')} value={metrics.totalGuestSessions} />
              {period === 'day' && (
                <MetricCard label={t('guestToday')} value={metrics.guestSessionsToday} />
              )}
              {period === 'week' && (
                <MetricCard label={t('guestLastWeek')} value={metrics.guestSessionsLastWeek} />
              )}
              {period === 'month' && (
                <MetricCard label={t('guestLastMonth')} value={metrics.guestSessionsLastMonth} />
              )}
              <MetricCard label={t('converted')} value={metrics.guestToRegisteredCount} />
              <MetricCard
                label={t('conversion')}
                value={metrics.guestToRegisteredPercentage}
                suffix="%"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-heading-md">{t('returningSection')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-content-gap grid-cols-2 md:grid-cols-3">
              <MetricCard
                label={t('returningInPeriod')}
                value={metrics.returningUsers}
                hint={returningHint}
              />
              <MetricCard
                label={t('returnedOnce')}
                value={metrics.returnedOnceCount}
                hint={`${metrics.returnedOncePercentage}%`}
              />
              <MetricCard
                label={t('returnedMultiple')}
                value={metrics.returnedMultipleCount}
                hint={`${metrics.returnedMultiplePercentage}%`}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
