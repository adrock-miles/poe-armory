import { useState, useRef, useEffect } from "react"
import { useTheme, type Theme } from "./ThemeProvider"
import { Sun, Moon, Sparkles } from "lucide-react"

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "mirage", label: "Mirage", icon: Sparkles },
]

export function ThemeDropdown() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [open])

  const current = THEMES.find((t) => t.value === theme)!
  const Icon = current.icon

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border border-border bg-popover p-1 shadow-lg">
          {THEMES.map((t) => {
            const TIcon = t.icon
            return (
              <button
                key={t.value}
                onClick={() => { setTheme(t.value); setOpen(false) }}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                  theme === t.value ? "bg-accent text-accent-foreground" : "text-popover-foreground"
                }`}
              >
                <TIcon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
