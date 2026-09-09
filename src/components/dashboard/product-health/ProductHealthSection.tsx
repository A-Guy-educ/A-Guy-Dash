/**
 * Product Health tab (Spec v0.2, Tab 1). Renders the KPI Overview + KPI
 * Trends blocks for the five product-health rates.
 *
 * Data-flow contract: this component is a pure consumer of the optional
 * `productHealth` field on `DashboardMetricsResponse`. The upstream Web
 * endpoint owns definition (Δ pp, cohort windows, >60s dwell rule, etc.);
 * Dash never derives a rate from raw counts.
 *
 * Filter state (date range, course, granularity) is local. When Web ships
 * the aggregation, wire these values into a fetch call — until then they
 * only drive the visible controls so managers can preview the layout and
 * the boss can sign off on the definitional decisions in spec §9.
 *
 * @fileType component
 * @domain dashboard
 * @pattern container
 * @ai-summary Product Health tab — five KPI cards + five trend charts + filters
 */

'use client'

import { useMemo, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/components/i18n'
import type {
  ProductHealth,
  ProductHealthDateRange,
  ProductHealthGranularity,
  ProductHealthMetricKey,
} from '@/types/dashboard'
import { PRODUCT_HEALTH_METRIC_KEYS } from '@/types/dashboard'

import { CourseFilter, DateRangeSelector, GranularityToggle } from './Filters'
import { KpiCard } from './KpiCard'
import { TrendLineChart } from './TrendLineChart'

interface Props {
  productHealth: ProductHealth | undefined
}

// Only Inactive/Churn reads "positive" when it drops (spec §3). Kept as a Set
// so the KpiCard call-site is a one-liner.
const INVERTED_METRICS: ReadonlySet<ProductHealthMetricKey> = new Set(['inactiveChurnRate'])

// Auto-select granularity from range width (spec §4).
function autoGranularity(range: ProductHealthDateRange): ProductHealthGranularity {
  if (range === '7d') return 'daily'
  if (range === '30d') return 'daily'
  if (range === '90d') return 'weekly'
  return 'weekly' // custom defaults to weekly; user can override
}

export function ProductHealthSection({ productHealth }: Props) {
  const t = useTranslations('dashboard.productHealth')

  const [range, setRange] = useState<ProductHealthDateRange>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [granularity, setGranularity] = useState<ProductHealthGranularity>(autoGranularity('30d'))

  const handleRangeChange = (next: ProductHealthDateRange) => {
    setRange(next)
    // Keep user-picked granularity when they revisit the same range, but
    // auto-flip when the range changes so short windows don't render one
    // monthly point and long windows don't render 200 daily bars.
    setGranularity(autoGranularity(next))
  }

  const courses = productHealth?.availableCourses ?? []

  const kpiEntries = useMemo(
    () =>
      PRODUCT_HEALTH_METRIC_KEYS.map((key) => ({
        key,
        metric: productHealth?.metrics[key],
        label: t(`metrics.${key}.label`),
        tooltip: t(`metrics.${key}.tooltip`),
        invert: INVERTED_METRICS.has(key),
      })),
    [productHealth, t],
  )

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-content-gap">
        <h2 className="text-heading-lg font-semibold">{t('section')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelector
            value={range}
            onChange={handleRangeChange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
          <CourseFilter value={courseId} onChange={setCourseId} options={courses} />
        </div>
      </div>

      {!productHealth && (
        <div
          role="status"
          className="rounded-lg border border-dashed border-border p-card-padding-sm"
        >
          <p className="text-body-sm text-muted-foreground">{t('awaitingUpstream')}</p>
        </div>
      )}

      {/* KPI Overview — five rate cards. Column layout matches the spec
          wireframe (3 across, 2 in the second row on wide screens). */}
      <div>
        <h3 className="text-heading-md font-semibold mb-3">{t('overviewTitle')}</h3>
        <div className="grid gap-content-gap grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {kpiEntries.map(({ key, metric, label, tooltip, invert }) => (
            <KpiCard
              key={key}
              label={label}
              value={metric?.value ?? null}
              deltaPp={metric?.deltaPp ?? null}
              tooltip={tooltip}
              invertDelta={invert}
            />
          ))}
        </div>
      </div>

      {/* KPI Trends — one line chart per KPI + shared granularity toggle. */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-content-gap mb-3">
          <h3 className="text-heading-md font-semibold">{t('trendsTitle')}</h3>
          <GranularityToggle value={granularity} onChange={setGranularity} />
        </div>
        <div className="grid gap-content-gap grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {kpiEntries.map(({ key, metric, label }) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-heading-sm">{label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TrendLineChart data={metric?.trend ?? []} ariaLabel={label} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
