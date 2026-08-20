import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestLogout = vi.fn()

vi.mock('@/server/aguy-web', () => ({
  getWebOrigin: () => new URL('https://www.aguy.co.il'),
  isDashboardOrigin: (origin: string | null) => origin === 'https://dash.aguy.co.il',
  requestLogout,
}))

describe('shared logout proxy', () => {
  beforeEach(() => requestLogout.mockReset())

  it('rejects cross-origin logout requests', async () => {
    const { POST } = await import('./route')
    const response = await POST(
      new NextRequest('https://dash.aguy.co.il/api/logout', {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      }),
    )

    expect(response.status).toBe(403)
    expect(requestLogout).not.toHaveBeenCalled()
  })

  it('forwards the session and shared cookie-clear headers', async () => {
    const headers = new Headers()
    headers.append('Set-Cookie', 'payload-token=; Domain=.aguy.co.il; Max-Age=0; Path=/')
    requestLogout.mockResolvedValue(Response.json({ success: true }, { headers }))
    const { POST } = await import('./route')
    const response = await POST(
      new NextRequest('https://dash.aguy.co.il/api/logout', {
        method: 'POST',
        headers: {
          origin: 'https://dash.aguy.co.il',
          cookie: 'payload-token=secret',
        },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('set-cookie')).toContain('Domain=.aguy.co.il')
    expect(requestLogout).toHaveBeenCalledWith(
      'payload-token=secret',
      expect.objectContaining({ requestId: expect.any(String) }),
    )
  })
})
