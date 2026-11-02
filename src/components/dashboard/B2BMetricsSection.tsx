/**
 * School adoption (B2B) block for the Users tab — totals for schools,
 * classes, rostered students and teachers, plus a per-school breakdown.
 * Sourced from Web's `b2bMetrics` (PR #1540), which is only returned for
 * `segment=b2b`; absent block renders an empty state.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary B2B school/class/student totals and top-20 per-school list
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'
import type { B2BMetrics } from '@/types/dashboard'
import { formatPercent, percentOf } from './guest-insights-math'
import { MetricCard } from './MetricCard'

interface Props {
  metrics: B2BMetrics | undefined
}

export function B2BMetricsSection({ metrics }: Props) {
  const t = useTranslations('dashboard.b2b')
  const locale = useLocale()

  if (!metrics) {
    return (
      <section className="space-y-4">
        <h2 className="text-heading-lg font-semibold">{t('section')}</h2>
        <p className="text-body-sm text-muted-foreground">{t('awaitingUpstream')}</p>
      </section>
    )
  }

  const maxStudents = metrics.perSchool.reduce((m, row) => Math.max(m, row.students), 0)

  return (
    <section className="space-y-6">
      <h2 className="text-heading-lg font-semibold">{t('section')}</h2>

      <div className="grid gap-content-gap grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <MetricCard label={t('schools')} value={metrics.schools} />
        <MetricCard label={t('classes')} value={metrics.classes} />
        <MetricCard label={t('students')} value={metrics.students} />
        <MetricCard label={t('teachers')} value={metrics.teachers} />
        <MetricCard
          label={t('activeStudents')}
          value={metrics.activeStudentsInPeriod}
          hint={formatPercent(percentOf(metrics.activeStudentsInPeriod, metrics.students))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">{t('perSchool')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {metrics.perSchool.length === 0 ? (
            <p className="text-body-sm text-muted-foreground py-section-xs">{t('noSchools')}</p>
          ) : (
            <ul className="space-y-2">
              {metrics.perSchool.map((row) => {
                const widthPct = maxStudents > 0 ? (row.students / maxStudents) * 100 : 0
                return (
                  <li key={row.schoolId} className="space-y-1">
                    <div className="flex items-center justify-between text-body-sm gap-content-gap-xs">
                      <span className="truncate max-w-[45%]" title={row.schoolName}>
                        {row.schoolName}
                      </span>
                      <span className="flex items-center gap-3 tabular-nums shrink-0">
                        <span className="text-body-xs text-muted-foreground">
                          {row.classes.toLocaleString(locale)} {t('classesSuffix')}
                        </span>
                        <span className="text-body-xs text-muted-foreground">
                          {row.activeStudentsInPeriod.toLocaleString(locale)} {t('activeSuffix')}
                        </span>
                        <span className="font-semibold">
                          {row.students.toLocaleString(locale)}{' '}
                          <span className="text-body-xs font-normal text-muted-foreground">
                            {t('studentsSuffix')}
                          </span>
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${widthPct}%` }}
                        aria-hidden
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
