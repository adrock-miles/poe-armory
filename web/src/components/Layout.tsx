import { Link, Outlet } from "react-router-dom"
import { Shield, LogIn, LogOut, Search } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"

export function Layout() {
  const { auth, loading, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">PoE Armory</span>
            </Link>
            <Link to="/lookup" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Search className="h-4 w-4" />
              Public Lookup
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <span className="text-sm text-muted-foreground">...</span>
            ) : auth.authenticated && auth.profile ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {auth.profile.accountName}
                </span>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="mr-1 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="default" size="sm" asChild>
                <a href="/api/v1/auth/login">
                  <LogIn className="mr-1 h-4 w-4" />
                  Login with PoE
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  )
}
