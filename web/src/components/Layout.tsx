import { Link, Outlet } from "react-router-dom"
import { Shield } from "lucide-react"

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">PoE Armory</span>
          </Link>
          <div className="ml-4 text-sm text-muted-foreground">
            Path of Exile Character Tracker
          </div>
        </div>
      </header>
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  )
}
