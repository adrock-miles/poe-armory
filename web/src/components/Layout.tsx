import { Link, Outlet } from "react-router-dom"
import { Shield } from "lucide-react"
import { ThemeDropdown } from "./ThemeDropdown"

export function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">PoE Armory</span>
          </Link>
          <div className="ml-4 text-sm text-muted-foreground">
            Path of Exile Character Tracker
          </div>
          <div className="ml-auto">
            <ThemeDropdown />
          </div>
        </div>
      </header>
      <main className="container py-6 pb-12 flex-1 overflow-x-hidden">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <div className="container">
          PoE Armory — Path of Exile Character Tracker. Not affiliated with Grinding Gear Games.
        </div>
      </footer>
    </div>
  )
}
