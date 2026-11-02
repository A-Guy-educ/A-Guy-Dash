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

  it('rejects an invalid segment before calling A-Guy-Web', async () => {
    const { GET } = await import('./route')
    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/dashboard-metrics?period=month&segment=b2x'),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid segment' })
    expect(requestDashboardMetrics).not.toHaveBeenCalled()
  })

  it('forwards the segment and passes b2bMetrics through', async () => {
    const b2bMetrics = {
      schools: 2,
      classes: 3,
      students: 40,
      teachers: 4,
      activeStudentsInPeriod: 25,
      perSchool: [
        { schoolId: 's1', schoolName: 'A', classes: 2, students: 30, activeStudentsInPeriod: 20 },
      ],
    }
    requestDashboardMetrics.mockResolvedValue(
      Response.json({ ...dashboardFixture(), segment: 'b2b', b2bMetrics }),
    )
    const { GET } = await import('./route')

    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/dashboard-metrics?period=month&segment=b2b'),
    )

    expect(response.status).toBe(200)
    expect(requestDashboardMetrics).toHaveBeenCalledWith(
      null,
      'month',
      expect.objectContaining({ segment: 'b2b' }),
    )
    const body = (await response.json()) as { segment: string; b2bMetrics: unknown }
    expect(body.segment).toBe('b2b')
    expect(body.b2bMetrics).toEqual(b2bMetrics)
  })

  it('forwards day upstream verbatim', async () => {
    requestDashboardMetrics.mockResolvedValue(
      Response.json({ ...dashboardFixture(), period: 'day' }),
    )
    const { GET } = await import('./route')

    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/dashboard-metrics?period=day'),
    )

    expect(response.status).toBe(200)
    expect(requestDashboardMetrics).toHaveBeenCalledWith(
      null,
      'day',
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
