'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/components/i18n'

export function LogoutButton() {
  const t = useTranslations('dashboard')
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)
    try {
      const response = await fetch('/api/logout', { method: 'POST', credentials: 'include' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = (await response.json()) as { redirectTo: string }
      window.location.assign(result.redirectTo)
    } catch {
      setPending(false)
    }
  }

  return (
    <Button type="button" variant="outline" onClick={() => void logout()} disabled={pending}>
      {pending ? t('loggingOut') : t('logout')}
    </Button>
  )
}
