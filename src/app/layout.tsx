import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { I18nProvider } from '@/components/i18n'
import en from '@/messages/en.json'
import he from '@/messages/he.json'

import './globals.css'

export const metadata: Metadata = {
  title: 'A-Guy Dashboard',
  description: 'Administrative analytics for A-Guy',
  robots: { index: false, follow: false },
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value === 'he' ? 'he' : 'en'
  const messages = locale === 'he' ? he : en

  return (
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
