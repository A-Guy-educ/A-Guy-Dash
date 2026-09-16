/**
 * Count KPI card for Total New Registered Users (spec v0.4 §C). Distinct
 * from KpiCard: no numerator/denominator, big value is a whole count, and
 * the delta is an absolute count difference rather than a pp change.
 *
 * A positive delta always reads as "good" for this metric — there is no
 * inversion knob because a drop in new registrations is unambiguously a
 * regression.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Count KPI card with absolute delta and formula tooltip
 */

'use client'

import { cn } from '@/utils/ui'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'

import { FormulaTooltip } from './FormulaTooltip'

interface CountKpiCardProps {
  label: string
  value: number | null
  deltaAbs: number | null
  formula: string
  sublabel: string
}

function formatCount(n: number, locale: string): string {
  return n.toLocaleString(locale)
}

function formatDelta(deltaAbs: number, locale: string): string {
  const abs = Math.abs(deltaAbs).toLocaleString(locale)
  const sign = deltaAbs > 0 ? '+' : deltaAbs < 0 ? '−' : '±'
  return `${sign}${abs}`
}

export function CountKpiCard({ label, value, deltaAbs, formula, sublabel }: CountKpiCardProps) {
  const t = useTranslations('dashboard.productHealth')
  const locale = useLocale()
  const na = t('na')

  let deltaClass = 'bg-muted text-muted-foreground'
  if (deltaAbs !== null && deltaAbs !== 0) {
    deltaClass = deltaAbs > 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
  }

  return (
    <Card className="h-full">
      <CardContent className="pt-5 pb-5">
        <p className="text-body-xs text-muted-foreground uppercase tracking-wide mb-2">
          <FormulaTooltip content={formula}>{label}</FormulaTooltip>
        </p>
        <p className="text-heading-xl font-bold leading-tight">
          {value === null ? na : formatCount(value, locale)}
        </p>
        <p className="mt-1 text-body-xs text-muted-foreground">{sublabel}</p>
        {deltaAbs !== null && (
          <div className="mt-2">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-body-xs font-semibold',
                deltaClass,
              )}
            >
              {formatDelta(deltaAbs, locale)}
              <span className="ml-1 font-normal text-muted-foreground">{t('vsPrevious')}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
