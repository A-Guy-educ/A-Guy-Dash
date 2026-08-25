'use client'

import { AppShell, ThemeProvider, applyLocale, type Locale } from '@a-guy/ui'

import { useTranslations } from '@/components/i18n'
import { LogoutButton } from '@/components/logout-button'

export function AppChrome({
  children,
  locale,
  teacherOrigin,
  webOrigin,
}: {
  children: React.ReactNode
  locale: Locale
  teacherOrigin: string
  webOrigin: string
}) {
  const t = useTranslations('shell')

  function changeLocale(nextLocale: Locale) {
    applyLocale(nextLocale, {
      rootDomain: window.location.hostname.endsWith('.aguy.co.il') ? 'aguy.co.il' : undefined,
      secure: window.location.protocol === 'https:',
    })
    window.location.reload()
  }

  return (
    <ThemeProvider>
      <AppShell
        actions={<LogoutButton />}
        appName={t('appName')}
        footer={t('footer')}
        locale={locale}
        localeLabels={{ en: 'English', he: 'עברית' }}
        menuLabel={t('menu')}
        navItems={[
          { href: '/', label: t('dashboard'), current: true },
          { href: `${webOrigin}/`, label: t('web') },
          { href: `${teacherOrigin}/`, label: t('teacher') },
        ]}
        onLocaleChange={changeLocale}
        skipLabel={t('skip')}
        themeLabels={{
          label: t('theme'),
          auto: t('themeAuto'),
          light: t('themeLight'),
          dark: t('themeDark'),
        }}
      >
        {children}
      </AppShell>
    </ThemeProvider>
  )
}
