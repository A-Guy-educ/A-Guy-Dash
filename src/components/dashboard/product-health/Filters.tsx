/**
 * Filter controls for the Product Health tab:
 *   - Date range: Last 7 / 30 / 90 Days / Custom (custom = start+end inputs)
 *   - Course: All + upstream-provided course list
 *   - Granularity: Daily / Weekly / Monthly (trend charts only)
 *
 * All three are colocated so the header can render them as a single flex row
 * without each control owning shell/spacing conventions of its own.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Product Health tab filter row — range, course, granularity
 */

'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/components/i18n'
import type {
  ProductHealthCourseOption,
  ProductHealthDateRange,
  ProductHealthGranularity,
} from '@/types/dashboard'

const RANGE_OPTIONS: readonly ProductHealthDateRange[] = ['7d', '30d', '90d', 'custom']
const GRANULARITY_OPTIONS: readonly ProductHealthGranularity[] = ['daily', 'weekly', 'monthly']

interface DateRangeSelectorProps {
  value: ProductHealthDateRange
  onChange: (value: ProductHealthDateRange) => void
  customStart: string
  customEnd: string
  onCustomStartChange: (value: string) => void
  onCustomEndChange: (value: string) => void
  disabled?: boolean
}

export function DateRangeSelector({
  value,
  onChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  disabled,
}: DateRangeSelectorProps) {
  const t = useTranslations('dashboard.productHealth.range')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-border bg-background p-1 gap-1">
        {RANGE_OPTIONS.map((option) => (
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
      {value === 'custom' && (
        <div className="inline-flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            disabled={disabled}
            aria-label={t('customStart')}
            className="rounded-md border border-border bg-background px-2 py-1 text-body-sm"
          />
          <span className="text-body-sm text-muted-foreground">–</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            disabled={disabled}
            aria-label={t('customEnd')}
            className="rounded-md border border-border bg-background px-2 py-1 text-body-sm"
          />
        </div>
      )}
    </div>
  )
}

interface CourseFilterProps {
  value: string | null
  onChange: (value: string | null) => void
  options: ProductHealthCourseOption[]
  disabled?: boolean
}

export function CourseFilter({ value, onChange, options, disabled }: CourseFilterProps) {
  const t = useTranslations('dashboard.productHealth')

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      disabled={disabled}
      aria-label={t('courseFilter')}
      className="rounded-md border border-border bg-background px-2 py-1 text-body-sm"
    >
      <option value="">{t('allCourses')}</option>
      {options.map((course) => (
        <option key={course.id} value={course.id}>
          {course.title}
        </option>
      ))}
    </select>
  )
}

interface GranularityToggleProps {
  value: ProductHealthGranularity
  onChange: (value: ProductHealthGranularity) => void
  disabled?: boolean
}

export function GranularityToggle({ value, onChange, disabled }: GranularityToggleProps) {
  const t = useTranslations('dashboard.productHealth.granularity')

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background p-1 gap-1">
      {GRANULARITY_OPTIONS.map((option) => (
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
