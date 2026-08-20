import designTokens from './tailwind.tokens.mjs'

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      spacing: designTokens.spacing,
      boxShadow: designTokens.boxShadow,
      fontSize: designTokens.fontSize,
      transitionDuration: designTokens.transitionDuration,
      opacity: designTokens.opacity,
      borderRadius: {
        ...designTokens.borderRadius,
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        error: 'hsl(var(--error))',
        ring: 'hsl(var(--ring))',
      },
    },
  },
}

export default config
