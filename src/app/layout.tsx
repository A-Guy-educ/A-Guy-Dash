import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { ThemeInitScript, type Locale } from '@a-guy/ui'

import { AppChrome } from '@/components/app-chrome'
import { I18nProvider } from '@/components/i18n'
import en from '@/messages/en.json'
import he from '@/messages/he.json'

import '@a-guy/ui/styles.css'
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
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'} data-theme="light">
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <I18nProvider locale={locale} messages={messages}>
          <AppChrome locale={locale as Locale}>{children}</AppChrome>
        </I18nProvider>
      </body>
    </html>
  )
}
