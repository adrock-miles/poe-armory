import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "light" | "dark" | "mirage"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
})

const STORAGE_KEY = "poe-armory-theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "mirage") return stored
    return "dark"
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark", "mirage")
    // Both dark and mirage use dark-mode tailwind utilities
    if (theme === "light") {
      root.classList.remove("dark")
    } else {
      root.classList.add("dark")
    }
    root.classList.add(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
