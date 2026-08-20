import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { NotAuthorizedPanel } from '@/components/dashboard/NotAuthorizedPanel'
import { LogoutButton } from '@/components/logout-button'
import { getLoginUrl, parseDashboardMetrics, requestDashboardMetrics } from '@/server/aguy-web'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const requestHeaders = await headers()
  const response = await requestDashboardMetrics(requestHeaders.get('cookie'), 'month')

  if (response.status === 401) redirect(getLoginUrl())
  if (response.status === 403) return <NotAuthorizedPanel />
  if (!response.ok) throw new Error('Dashboard metrics are unavailable')

  const metrics = await parseDashboardMetrics(response)

  return (
    <main>
      <div className="mx-auto flex max-w-7xl justify-end px-4 pt-4">
        <LogoutButton />
      </div>
      <DashboardShell initialData={metrics} />
    </main>
  )
}
