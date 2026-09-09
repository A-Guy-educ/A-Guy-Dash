/**
 * Proxy for the Product Health slice of A-Guy-Web's `/api/dashboard-metrics`.
 *
 * Dash keeps the base metrics fetch (`/api/dashboard-metrics`) narrowly
 * period-scoped so the Users/Content/Tokens tabs don't refetch every time
 * the manager tweaks a Product Health filter. This dedicated route forwards
 * only the productHealth query params and returns just that slice, so the
 * ProductHealth tab can drive its own fetch cycle without disturbing the
 * shell.
 *
 * Response body is either the ProductHealth object or `null` when Web
 * omitted the field (feature flag off) — never a 4xx for a valid request.
 * The client uses `null` to render the "awaiting upstream" state.
 *
 * @fileType route
 * @domain dashboard
 * @ai-summary GET /api/product-health — proxies productHealth slice from Web
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requestProductHealth } from '@/server/aguy-web'
import { dashboardMetricsSchema } from '@/types/dashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ISO-date shape; Web re-validates so we only need enough to reject junk.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expected YYYY-MM-DD' })

const querySchema = z
  .object({
    range: z.enum(['7d', '30d', '90d', 'custom']).optional(),
    start: isoDate.optional(),
    end: isoDate.optional(),
    courseId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, { message: 'Expected 24-char hex Mongo ID' })
      .optional(),
    granularity: z.enum(['daily', 'weekly', 'monthly']).optional(),
  })
  .refine((v) => v.range !== 'custom' || (v.start && v.end), {
    message: 'Custom range requires both start and end',
    path: ['range'],
  })

function errorForStatus(status: number): string {
  if (status === 400) return 'Invalid product-health query'
  if (status === 401) return 'Unauthorized'
  if (status === 403) return 'Forbidden'
  return 'Failed to load product health metrics'
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID()

  const raw = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsedQuery = querySchema.safeParse(raw)
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.issues[0]?.message ?? 'Invalid query' },
      { status: 400, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
    )
  }

  try {
    const upstream = await requestProductHealth(request.headers.get('cookie'), parsedQuery.data, {
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
      console.error('Product health response validation failed', { requestId })
      return NextResponse.json(
        { error: 'Failed to load product health metrics' },
        { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
      )
    }

    // Web omits the field when PRODUCT_HEALTH_ENABLED is off — surface as
    // JSON null so the client toggles into its "awaiting upstream" state
    // without a 4xx that would light up the error banner.
    return NextResponse.json(parsed.data.productHealth ?? null, {
      headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId },
    })
  } catch (error) {
    console.error('Product health proxy failed', { error, requestId })
    return NextResponse.json(
      { error: 'Failed to load product health metrics' },
      { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
    )
  }
}
