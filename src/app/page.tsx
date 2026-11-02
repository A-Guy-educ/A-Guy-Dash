import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { NotAuthorizedPanel } from '@/components/dashboard/NotAuthorizedPanel'
import { getLoginUrl, parseDashboardMetrics, requestDashboardMetrics } from '@/server/aguy-web'
import { VALID_PERIODS, VALID_SEGMENTS, type Period, type Segment } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

function requestedPeriod(value: string | string[] | undefined): Period {
  const period = Array.isArray(value) ? value[0] : value
  return VALID_PERIODS.includes(period as Period) ? (period as Period) : 'month'
}

function requestedSegment(value: string | string[] | undefined): Segment {
  const segment = Array.isArray(value) ? value[0] : value
  return VALID_SEGMENTS.includes(segment as Segment) ? (segment as Segment) : 'all'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[]; segment?: string | string[] }>
}) {
  const requestHeaders = await headers()
  const { period, segment } = await searchParams
  const response = await requestDashboardMetrics(
    requestHeaders.get('cookie'),
    requestedPeriod(period),
    { segment: requestedSegment(segment) },
  )

  if (response.status === 401) redirect(getLoginUrl())
  if (response.status === 403) return <NotAuthorizedPanel />
  if (!response.ok) throw new Error('Dashboard metrics are unavailable')

  const metrics = await parseDashboardMetrics(response)

  return <DashboardShell initialData={metrics} />
}
