export type ColorTokens = {
  background: string
  foreground: string
  primary: string
  primaryForeground: string
  muted: string
  mutedForeground: string
  border: string
  ring: string
  danger: string
  dangerForeground: string
}

export type TypographyTokens = {
  fontSans: string
  fontMono: string
  textXs: string
  textSm: string
  textMd: string
  textLg: string
  textXl: string
}

export type RadiusTokens = {
  sm: string
  md: string
  lg: string
}

export type SpacingTokens = {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
}

export type Tokens = {
  colors: ColorTokens
  typography: TypographyTokens
  radius: RadiusTokens
  spacing: SpacingTokens
}

export const defaultTokens: Tokens = {
  colors: {
    background: 'var(--background)',
    foreground: 'var(--foreground)',
    primary: 'rgb(15 23 42)',
    primaryForeground: 'rgb(255 255 255)',
    muted: 'rgb(248 250 252)',
    mutedForeground: 'rgb(71 85 105)',
    border: 'rgb(226 232 240)',
    ring: 'rgb(100 116 139)',
    danger: 'rgb(220 38 38)',
    dangerForeground: 'rgb(255 255 255)'
  },
  typography: {
    fontSans: 'var(--font-geist-sans)',
    fontMono: 'var(--font-geist-mono)',
    textXs: '0.75rem',
    textSm: '0.875rem',
    textMd: '1rem',
    textLg: '1.125rem',
    textXl: '1.25rem'
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem'
  }
}