/**
 * KPI card for the Product Health tab. Renders the current-period rate to
 * one decimal, a delta vs prior period in percentage points, and an
 * optional definition tooltip.
 *
 * Δ colour is metric-aware: a drop in Inactive/Churn is green, a drop in
 * the other four is red (spec §3). `invertDelta` flips the sign-to-colour
 * mapping so we can keep a single presentational component.
 *
 * When `value` is null we render "N/A" per spec §6 (partial data). Loading
 * is a separate skeleton state owned by the parent.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Percentage KPI card with pp delta badge and metric-aware colour
 */

'use client'

import { cn } from '@/utils/ui'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'

interface KpiCardProps {
  label: string
  value: number | null
  deltaPp: number | null
  tooltip?: string
  invertDelta?: boolean
}

function formatRate(value: number, locale: string): string {
  return `${value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function formatDelta(deltaPp: number, locale: string): string {
  const abs = Math.abs(deltaPp).toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const sign = deltaPp > 0 ? '+' : deltaPp < 0 ? '−' : '±'
  return `${sign}${abs} pp`
}

export function KpiCard({ label, value, deltaPp, tooltip, invertDelta }: KpiCardProps) {
  const t = useTranslations('dashboard.productHealth')
  const locale = useLocale()
  const na = t('na')

  // Metric-aware colour: for Inactive/Churn a drop is a win, so the sign
  // that reads as "good" is flipped. Zero delta = neutral for everyone.
  let deltaClass = 'bg-muted text-muted-foreground'
  if (deltaPp !== null && deltaPp !== 0) {
    const goodDirection = invertDelta ? deltaPp < 0 : deltaPp > 0
    deltaClass = goodDirection ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
  }

  return (
    <Card className="h-full">
      <CardContent className="pt-5 pb-5">
        <p
          className="text-body-xs text-muted-foreground uppercase tracking-wide mb-2"
          title={tooltip}
        >
          {label}
        </p>
        <p className="text-heading-xl font-bold leading-tight">
          {value === null ? na : formatRate(value, locale)}
        </p>
        {deltaPp !== null && (
          <div className="mt-2">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-body-xs font-semibold',
                deltaClass,
              )}
            >
              {formatDelta(deltaPp, locale)}
              <span className="ml-1 font-normal text-muted-foreground">{t('vsPrevious')}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
