import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'
export type EffectiveThemeMode = 'light' | 'dark' | 'night'

interface ThemeContextType {
  theme: ThemeMode
  effectiveTheme: EffectiveThemeMode
  isNight: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function getIsNightByHour(date = new Date()): boolean {
  const hour = date.getHours()
  return hour >= 20 || hour <= 6
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'

  const stored = window.localStorage.getItem('nexora-theme')
  if (stored === 'light' || stored === 'dark') return stored
  if (stored === 'night') return 'dark'

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const [isNight, setIsNight] = useState<boolean>(() => getIsNightByHour())
  const effectiveTheme: EffectiveThemeMode = theme === 'dark' && isNight ? 'night' : theme

  useEffect(() => {
    function syncNightMode() {
      setIsNight(getIsNightByHour())
    }

    const intervalId = window.setInterval(syncNightMode, 60_000)
    window.addEventListener('focus', syncNightMode)
    document.addEventListener('visibilitychange', syncNightMode)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', syncNightMode)
      document.removeEventListener('visibilitychange', syncNightMode)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme
    document.documentElement.dataset.themeMode = theme
    const colorScheme = effectiveTheme === 'light' ? 'light' : 'dark'
    document.documentElement.style.colorScheme = colorScheme
    window.localStorage.setItem('nexora-theme', theme)
  }, [theme, effectiveTheme])

  function toggleTheme() {
    setTheme(current => (current === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, isNight, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
