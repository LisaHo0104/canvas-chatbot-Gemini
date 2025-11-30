"use client"
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultTokens, Tokens } from './tokens'
import { lightTheme, darkTheme } from './themes'

type ThemeName = 'light' | 'dark'

type ThemeContextValue = {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
  tokens: Tokens
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyCssVariables(tokens: Tokens) {
  const root = document.documentElement
  root.style.setProperty('--background', tokens.colors.background)
  root.style.setProperty('--foreground', tokens.colors.foreground)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('light')

  const tokens = useMemo(() => {
    const overrides = theme === 'dark' ? darkTheme : lightTheme
    return {
      ...defaultTokens,
      colors: { ...defaultTokens.colors, ...overrides.colors }
    }
  }, [theme])

  useEffect(() => {
    applyCssVariables(tokens)
    document.documentElement.setAttribute('data-theme', theme)
  }, [tokens, theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, tokens }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}