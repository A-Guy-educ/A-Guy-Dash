import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}))

vi.stubGlobal('React', React)

describe('root layout', () => {
  it('sets a visible theme before client JavaScript runs', async () => {
    const { default: RootLayout } = await import('./layout')
    const element = await RootLayout({
      children: React.createElement('main', null, 'Dashboard'),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('<html lang="en" dir="ltr" data-theme="light">')
  })
})
