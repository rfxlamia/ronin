import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

const getStoredTheme = (key: string, fallback: Theme): Theme => {
  try {
    return (localStorage.getItem(key) as Theme) || fallback
  } catch {
    return fallback
  }
}

const setStoredTheme = (key: string, value: Theme) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ronin-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme(storageKey, defaultTheme))

  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = (resolved: "light" | "dark") => {
      root.classList.remove("light", "dark")
      root.classList.add(resolved)
    }

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light")
      applyTheme(mediaQuery.matches ? "dark" : "light")
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    applyTheme(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setStoredTheme(storageKey, newTheme)
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
