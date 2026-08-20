import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requestDashboardMetrics } from '@/server/aguy-web'
import { dashboardMetricsSchema } from '@/types/dashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const periodSchema = z.enum(['week', 'month', 'year'])

function errorForStatus(status: number): string {
  if (status === 400) return 'Invalid period'
  if (status === 401) return 'Unauthorized'
  if (status === 403) return 'Forbidden'
  return 'Failed to load dashboard metrics'
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID()
  const period = periodSchema.safeParse(request.nextUrl.searchParams.get('period') ?? 'month')

  if (!period.success) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  try {
    const upstream = await requestDashboardMetrics(request.headers.get('cookie'), period.data, {
      requestId,
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: errorForStatus(upstream.status) },
        {
          status: upstream.status,
          headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
        },
      )
    }

    const parsed = dashboardMetricsSchema.safeParse(await upstream.json())
    if (!parsed.success) {
      console.error('Dashboard metrics response validation failed', { requestId })
      return NextResponse.json(
        { error: 'Failed to load dashboard metrics' },
        { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
      )
    }

    return NextResponse.json(parsed.data, {
      headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
    })
  } catch (error) {
    console.error('Dashboard metrics proxy failed', { error, requestId })
    return NextResponse.json(
      { error: 'Failed to load dashboard metrics' },
      { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
    )
  }
}
