import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dashboardFixture } from '@/test/dashboard-fixture'

const requestDashboardMetrics = vi.fn()

vi.mock('@/server/aguy-web', () => ({ requestDashboardMetrics }))

describe('dashboard metrics proxy', () => {
  beforeEach(() => requestDashboardMetrics.mockReset())

  it('rejects an invalid period before calling A-Guy-Web', async () => {
    const { GET } = await import('./route')
    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/dashboard-metrics?period=hour'),
    )

    expect(response.status).toBe(400)
    expect(requestDashboardMetrics).not.toHaveBeenCalled()
  })

  it('forwards day as month upstream and echoes day back to the client', async () => {
    requestDashboardMetrics.mockResolvedValue(Response.json(dashboardFixture()))
    const { GET } = await import('./route')

    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/dashboard-metrics?period=day'),
    )

    expect(response.status).toBe(200)
    expect(requestDashboardMetrics).toHaveBeenCalledWith(
      null,
      'month',
      expect.objectContaining({ requestId: expect.any(String) }),
    )
    const body = (await response.json()) as { period: string }
    expect(body.period).toBe('day')
  })

  it('preserves the upstream authorization result', async () => {
    requestDashboardMetrics.mockResolvedValue(
      Response.json({ error: 'Forbidden' }, { status: 403 }),
    )
    const { GET } = await import('./route')
    const request = new NextRequest('https://dash.aguy.co.il/api/dashboard-metrics?period=month', {
      headers: { cookie: 'payload-token=secret' },
    })

    const response = await GET(request)

    expect(response.status).toBe(403)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(requestDashboardMetrics).toHaveBeenCalledWith(
      'payload-token=secret',
      'month',
      expect.objectContaining({ requestId: expect.any(String) }),
    )
  })

  it('returns a validated successful metrics response', async () => {
    requestDashboardMetrics.mockResolvedValue(Response.json(dashboardFixture()))
    const { GET } = await import('./route')

    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/dashboard-metrics?period=month'),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(dashboardFixture())
  })

  it('rejects a malformed upstream success response', async () => {
    requestDashboardMetrics.mockResolvedValue(Response.json({ period: 'month' }))
    const { GET } = await import('./route')

    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/dashboard-metrics?period=month'),
    )

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'Failed to load dashboard metrics' })
  })
})
