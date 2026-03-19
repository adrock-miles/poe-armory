import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api } from "@/lib/api"
import type { AuthState, Profile } from "@/types/character"

interface AuthContextType {
  auth: AuthState
  loading: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  auth: { authenticated: false },
  loading: true,
  logout: async () => {},
  refresh: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ authenticated: false })
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const state = await api.getAuthState()
      setAuth(state)
    } catch {
      setAuth({ authenticated: false })
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      await api.logout()
    } catch {
      // ignore
    }
    setAuth({ authenticated: false })
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <AuthContext.Provider value={{ auth, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
