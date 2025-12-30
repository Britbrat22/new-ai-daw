"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState, useMemo } from "react"

type Theme = "dark" | "light" | "system"

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  ...props
}: React.PropsWithChildren<{ defaultTheme?: Theme }>) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    try {
      const saved = window.localStorage.getItem("theme")
      return saved === "dark" || saved === "light" || saved === "system" ? saved : defaultTheme
    } catch {
      return defaultTheme
    }
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    const target = theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme
    root.classList.add(target)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme: (t: Theme) => {
        try {
          localStorage.setItem("theme", t)
        } catch {}
        setTheme(t)
      },
    }),
    [theme]
  )

  return (
    <ThemeContext.Provider value={value} {...props}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
