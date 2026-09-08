/**
 * Signup attribution breakdown for the selected period. Renders a horizontal
 * stacked bar with a labeled legend below. Buckets sum to
 * `registeredThisPeriod` (both anchor on user.createdAt); `unknown` catches
 * pre-feature legacy users where signupSource was never captured.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Stacked bar + legend of google / guykoren / direct / other / unknown signups
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'
import type { SignupSourceBreakdown } from '@/types/dashboard'

interface Props {
  breakdown: SignupSourceBreakdown
}

// Legend order per spec: google → guykoren → direct → other → unknown.
const BUCKET_ORDER = ['google', 'guykoren', 'direct', 'other', 'unknown'] as const

type BucketKey = (typeof BUCKET_ORDER)[number]

// Each bucket maps to a semantic design-system token; no arbitrary colors.
const BUCKET_COLOR: Record<BucketKey, string> = {
  google: 'bg-primary',
  guykoren: 'bg-success',
  direct: 'bg-accent',
  other: 'bg-warning',
  unknown: 'bg-muted-foreground',
}

export function SignupSourceBreakdownCard({ breakdown }: Props) {
  const t = useTranslations('dashboard.signupSources')
  const locale = useLocale()
  const total = BUCKET_ORDER.reduce((sum, key) => sum + breakdown[key], 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('section')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {total === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t('emptyState')}</p>
        ) : (
          <div className="space-y-4">
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={t('barAriaLabel')}
            >
              {BUCKET_ORDER.map((key) => {
                const count = breakdown[key]
                if (count === 0) return null
                const pct = (count / total) * 100
                return (
                  <div
                    key={key}
                    className={BUCKET_COLOR[key]}
                    style={{ width: `${pct}%` }}
                    title={`${t(`labels.${key}`)}: ${count.toLocaleString(locale)} (${pct.toFixed(1)}%)`}
                  />
                )
              })}
            </div>

            <ul className="grid grid-cols-2 md:grid-cols-3 gap-content-gap-sm">
              {BUCKET_ORDER.map((key) => {
                const count = breakdown[key]
                const pct = total > 0 ? (count / total) * 100 : 0
                return (
                  <li key={key} className="flex items-center gap-2 min-w-0">
                    <span
                      className={`${BUCKET_COLOR[key]} inline-block h-3 w-3 shrink-0 rounded-sm`}
                      aria-hidden="true"
                    />
                    <span className="text-body-sm text-foreground truncate">
                      {t(`labels.${key}`)}
                    </span>
                    <span className="text-body-sm text-muted-foreground tabular-nums ms-auto">
                      {count.toLocaleString(locale)}
                      <span className="ms-1 text-body-xs">({pct.toFixed(1)}%)</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
