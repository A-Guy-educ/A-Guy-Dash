/**
 * Small inline SVG line chart for a Product Health KPI trend. One line per
 * chart per baseline §4 (no bar / column). Null buckets create real gaps
 * rather than dropping to zero (baseline §4 "never default to 0").
 *
 * Uses SVG only — deliberately avoiding a chart library because these charts
 * are the only recurrence today, and Recharts / Chart.js would nearly double
 * the client bundle for what is essentially a polyline.
 *
 * Hover is JS-driven per spec v0.4 §E: the previous implementation used a
 * native SVG `<title>`, which on Windows/Firefox re-fires unreliably (the
 * "works only once" bug). We now track `hoverIndex` in local state and
 * render an absolutely-positioned tooltip inside a wrapping relative div.
 *   - `pointer-events` on the SVG picks up move / leave / enter cleanly
 *   - `nearestIndex(clientX)` snaps to the closest bucket on every move
 *   - `hoverIndex` resets to null on data-change via useEffect, so switching
 *     the range filter or the KPI wipes stale state instead of freezing it
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary SVG polyline chart for a Product Health KPI trend with JS tooltip
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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
  hasValue: boolean
}

function formatBucketRange(bucket: ProductHealthTrendBucket, locale: string): string {
  const start = new Date(bucket.bucketStart).toLocaleDateString(locale)
  const end = new Date(bucket.bucketEnd).toLocaleDateString(locale)
  return start === end ? start : `${start} – ${end}`
}

export function TrendLineChart({ data, ariaLabel }: TrendLineChartProps) {
  const t = useTranslations('dashboard.productHealth')
  const locale = useLocale()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

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
      return {
        x: PAD_X + i * xStep,
        y,
        bucket,
        hasValue: bucket.value !== null && !Number.isNaN(y),
      }
    })

    // Split into contiguous non-null runs so the polyline shows real gaps
    // where data is missing instead of connecting across the hole.
    const segs: Point[][] = []
    let current: Point[] = []
    for (const p of ps) {
      if (!p.hasValue) {
        if (current.length > 0) segs.push(current)
        current = []
      } else {
        current.push(p)
      }
    }
    if (current.length > 0) segs.push(current)

    return { points: ps, segments: segs, hasData: ps.some((p) => p.hasValue) }
  }, [data])

  // Wipe hover state whenever the underlying data changes (KPI switch, range
  // change, granularity flip). Without this the tooltip can freeze pointing
  // at an index that no longer exists in the new series.
  useEffect(() => {
    setHoverIndex(null)
  }, [data])

  function nearestIndex(clientX: number): number | null {
    const svg = svgRef.current
    if (!svg || points.length === 0) return null
    const rect = svg.getBoundingClientRect()
    // Map client-space X into the fixed 0..WIDTH viewBox so the snap-to-point
    // math works regardless of the SVG's rendered CSS width.
    const relX = ((clientX - rect.left) / rect.width) * WIDTH
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < points.length; i += 1) {
      const d = Math.abs(points[i].x - relX)
      if (d < bestDist) {
        best = i
        bestDist = d
      }
    }
    return points[best].hasValue ? best : null
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const idx = nearestIndex(e.clientX)
    if (idx !== hoverIndex) setHoverIndex(idx)
  }

  if (!hasData) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-md border border-dashed border-border">
        <p className="text-body-xs text-muted-foreground">{t('trendEmpty')}</p>
      </div>
    )
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  // Tooltip position uses percent-based coords so it tracks the point even
  // when the SVG is stretched by its container.
  const tooltipLeftPct = hovered ? (hovered.x / WIDTH) * 100 : 0
  const tooltipTopPct = hovered ? (hovered.y / HEIGHT) * 100 : 0

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="w-full h-[120px]"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
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
          p.hasValue ? (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? 4 : 2.5}
              className="fill-primary"
            />
          ) : null,
        )}
      </svg>
      {hovered && hovered.bucket.value !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-body-xs text-popover-foreground shadow-md whitespace-pre-line"
          style={{ left: `${tooltipLeftPct}%`, top: `calc(${tooltipTopPct}% - 6px)` }}
        >
          {`${formatBucketRange(hovered.bucket, locale)}\n${t('valueLabel')}: ${hovered.bucket.value.toFixed(1)}%\n${t('numeratorLabel')}: ${hovered.bucket.numerator ?? '—'}\n${t('denominatorLabel')}: ${hovered.bucket.denominator ?? '—'}`}
        </div>
      )}
    </div>
  )
}
