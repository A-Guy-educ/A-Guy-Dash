import { afterEach, describe, expect, it, vi } from 'vitest'

import { getLoginUrl, isDashboardOrigin, requestDashboardMetrics, requestLogout } from './aguy-web'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('A-Guy-Web boundary', () => {
  it('builds the central SSO login with the Dash return URL', () => {
    vi.stubEnv('AGUY_WEB_URL', 'https://www.aguy.co.il')
    vi.stubEnv('DASHBOARD_PUBLIC_URL', 'https://dash.aguy.co.il')

    expect(getLoginUrl()).toBe(
      'https://www.aguy.co.il/login?returnTo=https%3A%2F%2Fdash.aguy.co.il%2F',
    )
  })

  it('forwards the shared cookie only to the A-Guy-Web metrics endpoint', async () => {
    vi.stubEnv('AGUY_WEB_URL', 'https://www.aguy.co.il')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))

    await requestDashboardMetrics('payload-token=secret', 'week', {
      fetcher,
      requestId: 'request-1',
    })

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toBe('https://www.aguy.co.il/api/dashboard-metrics?period=week')
    expect(new Headers(init?.headers).get('cookie')).toBe('payload-token=secret')
    expect(new Headers(init?.headers).get('x-request-id')).toBe('request-1')
  })

  it('does not invent a cookie for anonymous requests', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))

    await requestDashboardMetrics(null, 'month', { fetcher })

    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).has('cookie')).toBe(false)
  })

  it('forwards the cookie to shared logout', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))

    await requestLogout('payload-token=secret', { fetcher })

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toBe('https://www.aguy.co.il/api/auth/logout')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('cookie')).toBe('payload-token=secret')
  })

  it('accepts only the configured Dash origin for state-changing requests', () => {
    vi.stubEnv('DASHBOARD_PUBLIC_URL', 'https://dash.aguy.co.il')

    expect(isDashboardOrigin('https://dash.aguy.co.il')).toBe(true)
    expect(isDashboardOrigin('https://evil.example')).toBe(false)
    expect(isDashboardOrigin(null)).toBe(false)
  })
})
