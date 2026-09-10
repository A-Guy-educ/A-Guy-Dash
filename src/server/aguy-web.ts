import 'server-only'

import { createAguyApiClient } from '@a-guy/api-client'
import { z } from 'zod'

import {
  dashboardMetricsSchema,
  type DashboardMetricsResponse,
  type Period,
} from '@/types/dashboard'

const DEFAULT_WEB_ORIGIN = 'https://www.aguy.co.il'
const DEFAULT_API_ORIGIN = 'https://api.aguy.co.il'
const DEFAULT_DASHBOARD_ORIGIN = 'https://dash.aguy.co.il'
const DEFAULT_TEACHER_ORIGIN = 'https://teacher.aguy.co.il'
const DEV_TEACHER_ORIGIN = 'https://teacher.dev.aguy.co.il'

function configuredOrigin(value: string | undefined, fallback: string): URL {
  const url = new URL(value || fallback)

  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error(`Production origin must use HTTPS: ${url.origin}`)
  }

  return url
}

export function getWebOrigin(): URL {
  return configuredOrigin(process.env.AGUY_WEB_URL, DEFAULT_WEB_ORIGIN)
}

export function getApiOrigin(): URL {
  return configuredOrigin(process.env.AGUY_API_URL, DEFAULT_API_ORIGIN)
}

export function getDashboardOrigin(): URL {
  return configuredOrigin(process.env.DASHBOARD_PUBLIC_URL, DEFAULT_DASHBOARD_ORIGIN)
}

export function getTeacherOrigin(): URL {
  if (process.env.AGUY_TEACHER_URL) {
    return configuredOrigin(process.env.AGUY_TEACHER_URL, DEFAULT_TEACHER_ORIGIN)
  }

  return getDashboardOrigin().hostname.endsWith('.dev.aguy.co.il')
    ? new URL(DEV_TEACHER_ORIGIN)
    : new URL(DEFAULT_TEACHER_ORIGIN)
}

export function getLoginUrl(): string {
  const loginUrl = new URL('/login', getWebOrigin())
  loginUrl.searchParams.set('returnTo', `${getDashboardOrigin().origin}/`)
  return loginUrl.toString()
}

export async function requestDashboardMetrics(
  cookieHeader: string | null,
  period: Period,
  options: { fetcher?: typeof fetch; requestId?: string } = {},
): Promise<Response> {
  const client = createAguyApiClient({
    baseUrl: getApiOrigin().origin,
    cookie: cookieHeader,
    fetch: options.fetcher,
  })

  return client.requestRaw(`/api/dashboard-metrics?period=${period}`, {
    headers: options.requestId ? { 'x-request-id': options.requestId } : undefined,
  })
}

/**
 * Params forwarded to Web's `/api/dashboard-metrics` to shape the
 * `productHealth` slice. All optional — Web defaults to range=30d, All
 * Courses, daily. See A-Guy-Web PR #1187 for the accepted values.
 */
export interface ProductHealthQuery {
  range?: string
  start?: string
  end?: string
  courseId?: string
  granularity?: string
}

export async function requestProductHealth(
  cookieHeader: string | null,
  query: ProductHealthQuery,
  options: { fetcher?: typeof fetch; requestId?: string } = {},
): Promise<Response> {
  const client = createAguyApiClient({
    baseUrl: getApiOrigin().origin,
    cookie: cookieHeader,
    fetch: options.fetcher,
  })

  const params = new URLSearchParams()
  if (query.range) params.set('range', query.range)
  if (query.start) params.set('start', query.start)
  if (query.end) params.set('end', query.end)
  if (query.courseId) params.set('courseId', query.courseId)
  if (query.granularity) params.set('granularity', query.granularity)

  const qs = params.toString()
  const path = qs ? `/api/dashboard-metrics?${qs}` : `/api/dashboard-metrics`
  return client.requestRaw(path, {
    headers: options.requestId ? { 'x-request-id': options.requestId } : undefined,
  })
}

export async function parseDashboardMetrics(response: Response): Promise<DashboardMetricsResponse> {
  const json: unknown = await response.json()
  return dashboardMetricsSchema.parse(json)
}

export async function requestLogout(
  cookieHeader: string | null,
  options: { fetcher?: typeof fetch; requestId?: string } = {},
): Promise<Response> {
  const client = createAguyApiClient({
    baseUrl: getApiOrigin().origin,
    cookie: cookieHeader,
    fetch: options.fetcher,
  })

  return client.requestRaw('/api/auth/logout', {
    method: 'POST',
    headers: options.requestId ? { 'x-request-id': options.requestId } : undefined,
  })
}

export function isDashboardOrigin(origin: string | null): boolean {
  if (!origin) return false
  return (
    z.string().url().safeParse(origin).success &&
    new URL(origin).origin === getDashboardOrigin().origin
  )
}
