/**
 * Client-side dashboard shell.
 *
 * Server hands us the initial metrics for the default period; a client-side
 * refetch fires when the manager changes the period. The refetch guard
 * compares the requested period against `data.period` (the currently-loaded
 * payload), not the server's initial period — otherwise going Week → Month
 * silently no-ops because it matches the initial default and the shell
 * keeps rendering week data under a "Month" header.
 *
 * A failed refetch surfaces as an inline banner with an explicit Retry
 * action so a transient upstream failure doesn't leave the manager stuck
 * on stale data with no recovery path.
 *
 * Layout: sections are grouped into topic tabs (users, content, engagement,
 * revenue) rather than a single scrolling stack. Users tab pairs the
 * period buckets with the monthly signups chart since both are user-time
 * views of the same underlying data.
 *
 * One segment switch (All / B2C / B2B / Other, Web #1540 + #1621) sits
 * above the tabs and drives every tab. It's mirrored into `?segment=` so a
 * view can be shared. Layout is keyed off `data.segment` (what Web actually
 * returned), not the requested segment, so an older Web that ignores the
 * param never renders platform numbers under a segmented layout. Tabs Web
 * doesn't scope yet (Revenue, Product Health) carry a muted note while a
 * segment is active; Content always says it's segment-independent.
 *
 * @fileType component
 * @domain dashboard
 * @pattern container
 * @ai-summary Period state + refetch + tab layout for /dashboard sections
 */

'use client'

import type React from 'react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from '@/components/i18n'
import type { DashboardMetricsResponse, Period, Segment } from '@/types/dashboard'

import { B2BMetricsSection } from './B2BMetricsSection'
import { ContentCountsSection } from './ContentCountsSection'
import { EngagementSection } from './EngagementSection'
import { FunnelSection } from './FunnelSection'
import { GuestInsightsSection } from './GuestInsightsSection'
import { MonthlySignupsSection } from './MonthlySignupsSection'
import { PeriodSelector } from './PeriodSelector'
import { ProductHealthSection } from './product-health/ProductHealthSection'
import { RevenueSection } from './RevenueSection'
import { SegmentSelector } from './SegmentSelector'
import { TokensSection } from './TokensSection'
import { UserMetricsSection } from './UserMetricsSection'

interface Props {
  initialData: DashboardMetricsResponse
}

// The Product Health tab has its own Date Range / Course / Granularity
// controls (spec §5) and deliberately ignores the shell-level period
// picker. Rendering the picker while on that tab is misleading — it
// looks like it should do something but doesn't. So we hide the picker
// and the "Period: X" sub-line whenever this tab is active and let the
// tab-owned filters carry the whole story.
const TABS_WITHOUT_PERIOD = new Set(['productHealth'])

// Anonymous visitors can't be classified, so guest views only make sense
// when the cohort includes unclassified consumers.
const SEGMENTS_WITH_GUESTS = new Set<Segment>(['all', 'b2c'])

function ScopeNote({ children }: { children: React.ReactNode }) {
  return <p className="text-body-sm text-muted-foreground">{children}</p>
}

export function DashboardShell({ initialData }: Props) {
  const t = useTranslations('dashboard')
  const [period, setPeriod] = useState<Period>(initialData.period)
  const [segment, setSegment] = useState<Segment>(initialData.segment)
  const [data, setData] = useState<DashboardMetricsResponse>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [activeTab, setActiveTab] = useState('productHealth')

  const showPeriodPicker = !TABS_WITHOUT_PERIOD.has(activeTab)
  const showGuests = SEGMENTS_WITH_GUESTS.has(data.segment)
  const isSegmented = data.segment !== 'all'

  const fetchMetrics = useCallback(async (nextPeriod: Period, nextSegment: Segment) => {
    setIsRefreshing(true)
    setHasError(false)
    try {
      const res = await fetch(
        `/api/dashboard-metrics?period=${nextPeriod}&segment=${nextSegment}`,
        {
          credentials: 'include',
          cache: 'no-store',
        },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as DashboardMetricsResponse
      setData(json)
    } catch {
      setHasError(true)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Guard against the currently-loaded payload's period, not the server's
    // initial period — otherwise Week → Month early-returns because Month
    // matches the initial default while `data` still holds Week.
    if (period === data.period && segment === data.segment) return
    void fetchMetrics(period, segment)
  }, [period, segment, data.period, data.segment, fetchMetrics])

  useEffect(() => {
    // Mirror the switch into the URL (replace, not push — flipping
    // segments shouldn't pile up history entries). `all` is the default,
    // so it's dropped to keep the plain URL clean.
    const url = new URL(window.location.href)
    if (segment === 'all') url.searchParams.delete('segment')
    else url.searchParams.set('segment', segment)
    if (url.href !== window.location.href) window.history.replaceState(null, '', url)
  }, [segment])

  return (
    <div className="mx-auto max-w-7xl px-4 py-section-md space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-content-gap">
        <div>
          <h1 className="text-heading-2xl font-bold">{t('title')}</h1>
          {showPeriodPicker && (
            <p className="text-body-sm text-muted-foreground mt-1">
              {t('periodLabel')}: {t(`period.${data.period}`)}
              {isRefreshing && <span className="ml-2 italic">{t('refreshing')}</span>}
            </p>
          )}
        </div>
        {showPeriodPicker && (
          <PeriodSelector value={period} onChange={setPeriod} disabled={isRefreshing} />
        )}
      </header>

      <div className="space-y-2">
        <SegmentSelector value={segment} onChange={setSegment} disabled={isRefreshing} />
        <ScopeNote>{t('segmentGuestNote')}</ScopeNote>
      </div>

      {hasError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-content-gap rounded-lg border border-error/40 bg-error/10 p-card-padding-sm"
        >
          <p className="text-body-sm text-foreground">{t('loadError')}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void fetchMetrics(period, segment)}
            disabled={isRefreshing}
          >
            {t('retry')}
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="productHealth">{t('tabs.productHealth')}</TabsTrigger>
          <TabsTrigger value="users">{t('tabs.users')}</TabsTrigger>
          <TabsTrigger value="funnel">{t('tabs.funnel')}</TabsTrigger>
          <TabsTrigger value="content">{t('tabs.content')}</TabsTrigger>
          <TabsTrigger value="engagement">{t('tabs.engagement')}</TabsTrigger>
          <TabsTrigger value="tokens">{t('tabs.tokens')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('tabs.revenue')}</TabsTrigger>
        </TabsList>

        <TabsContent value="productHealth" className="space-y-4">
          {isSegmented && <ScopeNote>{t('segmentNotSplit')}</ScopeNote>}
          <ProductHealthSection productHealth={data.productHealth} />
        </TabsContent>

        <TabsContent value="users" className="space-y-8">
          {data.segment === 'b2b' && <B2BMetricsSection metrics={data.b2bMetrics} />}
          <UserMetricsSection
            metrics={data.userMetrics}
            period={data.period}
            showGuests={showGuests}
          />
          {showGuests && <GuestInsightsSection insights={data.guestInsights} />}
          <MonthlySignupsSection months={data.monthlySignups} />
        </TabsContent>

        <TabsContent value="funnel">
          <FunnelSection funnel={data.funnel} period={data.period} segment={data.segment} />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <ScopeNote>{t('segmentSameForAll')}</ScopeNote>
          <ContentCountsSection counts={data.contentCounts} />
        </TabsContent>

        <TabsContent value="engagement">
          <EngagementSection engagement={data.engagement} />
        </TabsContent>

        <TabsContent value="tokens">
          <TokensSection tokens={data.tokenMetrics} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {isSegmented && <ScopeNote>{t('segmentNotSplit')}</ScopeNote>}
          <RevenueSection revenue={data.revenueMetrics} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
