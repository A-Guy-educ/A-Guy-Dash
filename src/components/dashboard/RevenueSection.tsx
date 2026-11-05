/**
 * Revenue — totals by currency, B2C / B2B payers, payment outcomes with
 * failure reasons, top 5 products by revenue in the selected period.
 * Amounts arrive in agorot (1 shekel = 100 agorot); display converts to
 * major units with a locale-aware formatter.
 *
 * `payments`, `failureReasons` and `segments` are optional until Web ships
 * them; without them the older transactions / success-rate row renders.
 *
 * @fileType component
 * @domain dashboard
 * @pattern presentational
 * @ai-summary Revenue widgets: per-currency, payers split, payment outcomes, top products
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale, useTranslations } from '@/components/i18n'
import type {
  FailureReason,
  PaymentOutcomes,
  RevenueMetrics,
  RevenueSegments,
} from '@/types/dashboard'
import { MetricCard } from './MetricCard'

interface Props {
  revenue: RevenueMetrics
}

type Formatter = (agorot: number, currency: string) => string
type Translate = (key: string) => string

const CURRENCY_SYMBOL: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
}

function makeCurrencyFormatter(locale: string): Formatter {
  return (agorot: number, currency: string): string => {
    const major = agorot / 100
    const symbol = CURRENCY_SYMBOL[currency] ?? currency
    return `${symbol}${major.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
}

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`)
}

export function RevenueSection({ revenue }: Props) {
  const t = useTranslations('dashboard.revenue')
  const locale = useLocale()
  const formatMajor = makeCurrencyFormatter(locale)

  const currencies = Object.entries(revenue.totalRevenueAgorot).filter(([, amount]) => amount > 0)
  const totalRow =
    currencies.length > 0 ? currencies : Object.entries(revenue.totalRevenueAgorot).slice(0, 1)

  return (
    <section className="space-y-6">
      <h2 className="text-heading-lg font-semibold">{t('section')}</h2>

      {/* Totals by currency */}
      <div className="grid gap-content-gap grid-cols-1 md:grid-cols-3">
        {totalRow.map(([currency, amount]) => (
          <MetricCard
            key={currency}
            label={`${t('revenueCurrencyPrefix')} (${currency})`}
            value={formatMajor(amount, currency)}
          />
        ))}
      </div>

      {revenue.segments && (
        <PayersRow segments={revenue.segments} t={t} locale={locale} formatMajor={formatMajor} />
      )}

      {revenue.payments ? (
        <PaymentsRow
          payments={revenue.payments}
          successRate={revenue.successRate}
          refundedAgorot={revenue.refundedAgorot}
          t={t}
          locale={locale}
          formatMajor={formatMajor}
        />
      ) : (
        <div className="grid gap-content-gap grid-cols-2 md:grid-cols-4">
          <MetricCard label={t('transactions')} value={revenue.transactionCount} />
          <MetricCard label={t('successRate')} value={revenue.successRate} suffix="%" />
          <MetricCard label={t('refundedIls')} value={formatMajor(revenue.refundedAgorot, 'ILS')} />
          <MetricCard label={t('failedIls')} value={formatMajor(revenue.failedAgorot, 'ILS')} />
        </div>
      )}

      {revenue.failureReasons && (
        <FailureReasonsCard
          reasons={revenue.failureReasons}
          t={t}
          locale={locale}
          formatMajor={formatMajor}
        />
      )}

      {/* Top products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">{t('topProducts')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {revenue.topProducts.length === 0 ? (
            <p className="text-body-sm text-muted-foreground py-section-xs">
              {t('noTransactions')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {revenue.topProducts.map((product) => {
                const isDeleted = product.productName.startsWith('__DELETED__:')
                const displayName = isDeleted
                  ? `${t('deletedProductPrefix')} (${product.productName.replace('__DELETED__:', '')})`
                  : product.productName
                return (
                  <li key={product.productName} className="flex items-center justify-between py-3">
                    <span
                      className={isDeleted ? 'text-muted-foreground italic' : 'text-foreground'}
                    >
                      {displayName}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatMajor(product.agorot, 'ILS')}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

interface RowProps {
  t: Translate
  locale: string
  formatMajor: Formatter
}

function PayersRow({ segments, t, locale, formatMajor }: RowProps & { segments: RevenueSegments }) {
  const { b2c, b2b } = segments
  const schoolHint = interpolate(t('schoolRevenueHint'), {
    price: formatMajor(b2b.seatPriceAgorot, 'ILS'),
    students: b2b.students.toLocaleString(locale),
  })

  return (
    <div className="space-y-3">
      <h3 className="text-heading-md font-semibold">{t('payers')}</h3>
      <div className="grid gap-content-gap grid-cols-2 md:grid-cols-4">
        <MetricCard label={t('b2cPayers')} value={b2c.payers} hint={t('b2cPayersHint')} />
        <MetricCard label={t('b2cRevenue')} value={formatMajor(b2c.revenueAgorot, 'ILS')} />
        <MetricCard label={t('b2bPayers')} value={b2b.students} hint={t('b2bPayersHint')} />
        <MetricCard
          label={t('schoolRevenue')}
          value={formatMajor(b2b.estimatedRevenueAgorot, 'ILS')}
          hint={schoolHint}
        />
      </div>
    </div>
  )
}

function PaymentsRow({
  payments,
  successRate,
  refundedAgorot,
  t,
  locale,
  formatMajor,
}: RowProps & { payments: PaymentOutcomes; successRate: number; refundedAgorot: number }) {
  const { firstPurchase, renewal } = payments
  const splitHint = (first: number, renewals: number) =>
    interpolate(t('splitHint'), {
      first: first.toLocaleString(locale),
      renewals: renewals.toLocaleString(locale),
    })

  return (
    <div className="space-y-3">
      <h3 className="text-heading-md font-semibold">{t('payments')}</h3>
      <div className="grid gap-content-gap grid-cols-2 md:grid-cols-4">
        <MetricCard
          label={t('succeededPayments')}
          value={firstPurchase.succeeded + renewal.succeeded}
          hint={splitHint(firstPurchase.succeeded, renewal.succeeded)}
        />
        <MetricCard
          label={t('failedPayments')}
          value={firstPurchase.failed + renewal.failed}
          hint={splitHint(firstPurchase.failed, renewal.failed)}
        />
        <MetricCard
          label={t('successRate')}
          value={successRate}
          suffix="%"
          hint={t('successRateHint')}
        />
        <MetricCard label={t('refundedIls')} value={formatMajor(refundedAgorot, 'ILS')} />
      </div>
    </div>
  )
}

function FailureReasonsCard({
  reasons,
  t,
  locale,
  formatMajor,
}: RowProps & { reasons: FailureReason[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-md">{t('failureReasons')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {reasons.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-section-xs">{t('noFailures')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {reasons.map((reason) => (
              <li
                key={`${reason.provider}:${reason.code}`}
                className="flex items-center justify-between gap-content-gap py-3"
              >
                <span className="text-foreground">
                  {reason.code === 'unknown'
                    ? `${reason.provider} · ${t('unknownReason')}`
                    : `${reason.provider} · ${t('responseCode')} ${reason.code}`}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {reason.count.toLocaleString(locale)}
                  </span>
                  {' · '}
                  {formatMajor(reason.agorot, 'ILS')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
