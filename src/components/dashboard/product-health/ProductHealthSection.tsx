/**
 * Product Health tab (Spec v0.2, Tab 1). Renders the KPI Overview + KPI
 * Trends blocks for the five product-health rates.
 *
 * Data flow: the initial payload comes from the shell's server-rendered
 * fetch (`data.productHealth`). Subsequent filter changes hit the
 * dedicated `/api/product-health` proxy so the Users/Tokens/Revenue tabs
 * don't refetch every time the manager tweaks a range or course.
 *
 * Fetch coalescing: the derived `queryKey` string drives a single effect;
 * building a new URLSearchParams-shaped record on every render would
 * invalidate a naive `useEffect([query])` on every keystroke of the
 * custom-range date inputs. Custom range is gated until both start and
 * end are filled to avoid firing off partial queries.
 *
 * @fileType component
 * @domain dashboard
 * @pattern container
 * @ai-summary Product Health tab — five KPI cards + five trend charts + filters + fetch
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
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
  return 'weekly'
}

interface Query {
  range: ProductHealthDateRange
  granularity: ProductHealthGranularity
  courseId: string | null
  start: string
  end: string
}

function buildQueryString(q: Query): string | null {
  // Custom needs both dates before we hit the wire.
  if (q.range === 'custom' && (!q.start || !q.end)) return null
  const params = new URLSearchParams()
  params.set('range', q.range)
  params.set('granularity', q.granularity)
  if (q.range === 'custom') {
    params.set('start', q.start)
    params.set('end', q.end)
  }
  if (q.courseId) params.set('courseId', q.courseId)
  return params.toString()
}

export function ProductHealthSection({ productHealth: initial }: Props) {
  const t = useTranslations('dashboard.productHealth')
  const tShell = useTranslations('dashboard')

  const [range, setRange] = useState<ProductHealthDateRange>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [granularity, setGranularity] = useState<ProductHealthGranularity>(autoGranularity('30d'))

  const [productHealth, setProductHealth] = useState<ProductHealth | undefined>(initial)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasError, setHasError] = useState(false)

  const query: Query = { range, granularity, courseId, start: customStart, end: customEnd }
  const queryKey = buildQueryString(query)

  const abortRef = useRef<AbortController | null>(null)
  const isInitialMount = useRef(true)

  const refetch = useCallback(async (qs: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsRefreshing(true)
    setHasError(false)
    try {
      const res = await fetch(`/api/product-health?${qs}`, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ProductHealth | null
      setProductHealth(json ?? undefined)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setHasError(true)
    } finally {
      if (abortRef.current === controller) setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Skip the very first render — the shell already server-rendered the
    // initial slice with matching defaults, so a mount-time fetch would
    // just repaint the same data.
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (queryKey) void refetch(queryKey)
  }, [queryKey, refetch])

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
        <div>
          <h2 className="text-heading-lg font-semibold">{t('section')}</h2>
          {isRefreshing && (
            <p className="text-body-xs text-muted-foreground italic mt-1">{tShell('refreshing')}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelector
            value={range}
            onChange={handleRangeChange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
            disabled={isRefreshing}
          />
          <CourseFilter
            value={courseId}
            onChange={setCourseId}
            options={courses}
            disabled={isRefreshing}
          />
        </div>
      </div>

      {hasError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-content-gap rounded-lg border border-error/40 bg-error/10 p-card-padding-sm"
        >
          <p className="text-body-sm text-foreground">{tShell('loadError')}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => queryKey && void refetch(queryKey)}
            disabled={isRefreshing || !queryKey}
          >
            {tShell('retry')}
          </Button>
        </div>
      )}

      {!productHealth && !hasError && (
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
          <GranularityToggle
            value={granularity}
            onChange={setGranularity}
            disabled={isRefreshing}
          />
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
