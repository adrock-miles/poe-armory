import { Toaster } from "sonner"
import { useTheme } from "./ThemeProvider"

export function ThemeAwareToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme === "light" ? "light" : "dark"} position="bottom-right" />
}
