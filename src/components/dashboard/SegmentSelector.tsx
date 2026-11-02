/**
 * Segmented All / B2C / B2B picker for the Users tab. Same visual as
 * PeriodSelector so the two read as one control family.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary All/B2C/B2B user-segment picker for the Users tab
 */

'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/components/i18n'
import { VALID_SEGMENTS, type Segment } from '@/types/dashboard'

interface SegmentSelectorProps {
  value: Segment
  onChange: (segment: Segment) => void
  disabled?: boolean
}

export function SegmentSelector({ value, onChange, disabled }: SegmentSelectorProps) {
  const t = useTranslations('dashboard.segment')

  return (
    <div
      role="group"
      aria-label={t('label')}
      className="inline-flex items-center rounded-md border border-border bg-background p-1 gap-1"
    >
      {VALID_SEGMENTS.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={value === option ? 'default' : 'ghost'}
          onClick={() => onChange(option)}
          disabled={disabled}
          aria-pressed={value === option}
        >
          {t(option)}
        </Button>
      ))}
    </div>
  )
}
