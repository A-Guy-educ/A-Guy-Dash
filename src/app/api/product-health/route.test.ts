import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dashboardFixture } from '@/test/dashboard-fixture'
import type { ProductHealth } from '@/types/dashboard'

const requestProductHealth = vi.fn()

vi.mock('@/server/aguy-web', () => ({ requestProductHealth }))

function productHealthFixture(): ProductHealth {
  return {
    periodStart: '2026-08-10',
    periodEnd: '2026-09-09',
    courseId: null,
    granularity: 'daily',
    metrics: {
      activeUserRate: {
        value: 64.2,
        numerator: 321,
        denominator: 500,
        comparisonValue: 61.0,
        deltaPp: 3.2,
        trend: [],
      },
      engagementRate: {
        value: 58.1,
        numerator: 186,
        denominator: 321,
        comparisonValue: 56.3,
        deltaPp: 1.8,
        trend: [],
      },
      retentionRate: {
        value: 42.5,
        numerator: 85,
        denominator: 200,
        comparisonValue: 38.4,
        deltaPp: 4.1,
        trend: [],
      },
      inactiveChurnRate: {
        value: 18.0,
        numerator: 36,
        denominator: 200,
        comparisonValue: 20.5,
        deltaPp: -2.5,
        trend: [],
      },
      lessonCompletionRate: {
        value: 37.4,
        numerator: 220,
        denominator: 588,
        comparisonValue: 32.4,
        deltaPp: 5.0,
        trend: [],
      },
    },
    availableCourses: [{ id: 'a'.repeat(24), title: 'Course A' }],
  }
}

describe('product-health proxy', () => {
  beforeEach(() => requestProductHealth.mockReset())

  it('rejects a malformed range', async () => {
    const { GET } = await import('./route')
    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/product-health?range=180d'),
    )

    expect(response.status).toBe(400)
    expect(requestProductHealth).not.toHaveBeenCalled()
  })

  it('rejects custom range without both start and end', async () => {
    const { GET } = await import('./route')
    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/product-health?range=custom&start=2026-01-01'),
    )

    expect(response.status).toBe(400)
    expect(requestProductHealth).not.toHaveBeenCalled()
  })

  it('rejects a non-hex courseId', async () => {
    const { GET } = await import('./route')
    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/product-health?courseId=not-a-real-id'),
    )

    expect(response.status).toBe(400)
    expect(requestProductHealth).not.toHaveBeenCalled()
  })

  it('forwards the parsed query and returns the productHealth slice', async () => {
    const ph = productHealthFixture()
    requestProductHealth.mockResolvedValue(
      Response.json({ ...dashboardFixture(), productHealth: ph }),
    )
    const { GET } = await import('./route')

    const response = await GET(
      new NextRequest('https://dash.aguy.co.il/api/product-health?range=7d&granularity=daily'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(requestProductHealth).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ range: '7d', granularity: 'daily' }),
      expect.objectContaining({ requestId: expect.any(String) }),
    )
    expect(await response.json()).toEqual(ph)
  })

  it('returns JSON null when Web omits the productHealth field (flag off)', async () => {
    requestProductHealth.mockResolvedValue(Response.json(dashboardFixture()))
    const { GET } = await import('./route')

    const response = await GET(new NextRequest('https://dash.aguy.co.il/api/product-health'))

    expect(response.status).toBe(200)
    expect(await response.json()).toBeNull()
  })

  it('preserves the upstream authorization result', async () => {
    requestProductHealth.mockResolvedValue(Response.json({ error: 'Forbidden' }, { status: 403 }))
    const { GET } = await import('./route')

    const response = await GET(new NextRequest('https://dash.aguy.co.il/api/product-health'))

    expect(response.status).toBe(403)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
