/**
 * KPI card for the Product Health tab. Renders the current-period rate to
 * one decimal, the supporting absolute numerator/denominator (v0.4 §C), a
 * pp-delta badge vs prior period, and a formula-on-name-hover tooltip.
 *
 * Δ colour is metric-aware: a drop in Inactive/Churn is green, a drop in
 * the other rates is red (baseline §3). `invertDelta` flips the sign-to-
 * colour mapping so we can keep a single presentational component.
 *
 * When `value` is null we render "N/A" per baseline §6 (partial data).
 * Loading is a separate skeleton state owned by the parent.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Percentage KPI card with absolute counts, pp delta, formula tooltip
 */

'use client'

import { cn } from '@/utils/ui'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'

import { FormulaTooltip } from './FormulaTooltip'

interface KpiCardProps {
  label: string
  value: number | null
  numerator: number | null
  denominator: number | null
  deltaPp: number | null
  formula: string
  absoluteLabelTemplate: string
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

function formatCount(n: number, locale: string): string {
  return n.toLocaleString(locale)
}

// Fill "{numerator} X out of {denominator} Y" style placeholders. Kept inline
// because the message util (see components/i18n.tsx) has no interpolation.
function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`)
}

export function KpiCard({
  label,
  value,
  numerator,
  denominator,
  deltaPp,
  formula,
  absoluteLabelTemplate,
  invertDelta,
}: KpiCardProps) {
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

  const hasAbs = numerator !== null && denominator !== null
  const numStr = numerator !== null ? formatCount(numerator, locale) : '—'
  const denStr = denominator !== null ? formatCount(denominator, locale) : '—'
  const absoluteLabel = hasAbs
    ? interpolate(absoluteLabelTemplate, { numerator: numStr, denominator: denStr })
    : null

  return (
    <Card className="h-full">
      <CardContent className="pt-5 pb-5">
        <p className="text-body-xs text-muted-foreground uppercase tracking-wide mb-2">
          <FormulaTooltip content={formula}>{label}</FormulaTooltip>
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-heading-xl font-bold leading-tight">
            {value === null ? na : formatRate(value, locale)}
          </p>
          {hasAbs && (
            <p className="text-body-sm text-muted-foreground">
              · {numStr} / {denStr}
            </p>
          )}
        </div>
        {absoluteLabel && (
          <p className="mt-1 text-body-xs text-muted-foreground">{absoluteLabel}</p>
        )}
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
