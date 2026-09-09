/**
 * Small inline SVG line chart for a Product Health KPI trend. One line per
 * chart per spec §4 (no bar / column). Null buckets create real gaps rather
 * than dropping to zero (spec §4 "never default to 0").
 *
 * Uses SVG only — deliberately avoiding a chart library because these five
 * charts are the only recurrence today, and Recharts / Chart.js would nearly
 * double the client bundle for what is essentially a polyline.
 *
 * Hover surfaces the bucket range + KPI value + numerator + denominator
 * via a native <title> so it works without JS state.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary SVG polyline chart for a single Product Health KPI trend
 */

'use client'

import { useMemo } from 'react'

import { useLocale, useTranslations } from '@/components/i18n'
import type { ProductHealthTrendBucket } from '@/types/dashboard'

interface TrendLineChartProps {
  data: ProductHealthTrendBucket[]
  ariaLabel: string
}

const WIDTH = 400
const HEIGHT = 120
const PAD_X = 8
const PAD_Y = 12

interface Point {
  x: number
  y: number
  bucket: ProductHealthTrendBucket
}

function formatBucketRange(bucket: ProductHealthTrendBucket, locale: string): string {
  const start = new Date(bucket.bucketStart).toLocaleDateString(locale)
  const end = new Date(bucket.bucketEnd).toLocaleDateString(locale)
  return start === end ? start : `${start} – ${end}`
}

export function TrendLineChart({ data, ariaLabel }: TrendLineChartProps) {
  const t = useTranslations('dashboard.productHealth')
  const locale = useLocale()

  const { points, segments, hasData } = useMemo(() => {
    if (data.length === 0) {
      return { points: [] as Point[], segments: [] as Point[][], hasData: false }
    }
    // Fixed 0-100 range: KPIs are percentages so the chart y-axis stays
    // comparable across metrics. Auto-scaling would exaggerate a 55→57
    // wobble into looking like a huge jump.
    const yMin = 0
    const yMax = 100
    const xStep = data.length > 1 ? (WIDTH - PAD_X * 2) / (data.length - 1) : 0

    const ps: Point[] = data.map((bucket, i) => {
      const value = bucket.value ?? NaN
      const y = HEIGHT - PAD_Y - ((value - yMin) / (yMax - yMin)) * (HEIGHT - PAD_Y * 2)
      return { x: PAD_X + i * xStep, y, bucket }
    })

    // Split into contiguous non-null runs so the polyline shows real gaps
    // where data is missing instead of connecting across the hole.
    const segs: Point[][] = []
    let current: Point[] = []
    for (const p of ps) {
      if (p.bucket.value === null || Number.isNaN(p.y)) {
        if (current.length > 0) segs.push(current)
        current = []
      } else {
        current.push(p)
      }
    }
    if (current.length > 0) segs.push(current)

    return { points: ps, segments: segs, hasData: ps.some((p) => p.bucket.value !== null) }
  }, [data])

  if (!hasData) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-md border border-dashed border-border">
        <p className="text-body-xs text-muted-foreground">{t('trendEmpty')}</p>
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={ariaLabel}
      className="w-full h-[120px]"
      preserveAspectRatio="none"
    >
      {[25, 50, 75].map((y) => (
        <line
          key={y}
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={HEIGHT - PAD_Y - (y / 100) * (HEIGHT - PAD_Y * 2)}
          y2={HEIGHT - PAD_Y - (y / 100) * (HEIGHT - PAD_Y * 2)}
          className="stroke-border"
          strokeWidth={0.5}
          strokeDasharray="2 3"
        />
      ))}
      {segments.map((seg, i) => (
        <polyline
          key={i}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      ))}
      {points.map((p, i) =>
        p.bucket.value === null ? null : (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} className="fill-primary">
            <title>
              {`${formatBucketRange(p.bucket, locale)}\n${t('valueLabel')}: ${p.bucket.value.toFixed(1)}%\n${t('numeratorLabel')}: ${p.bucket.numerator ?? '—'}\n${t('denominatorLabel')}: ${p.bucket.denominator ?? '—'}`}
            </title>
          </circle>
        ),
      )}
    </svg>
  )
}
