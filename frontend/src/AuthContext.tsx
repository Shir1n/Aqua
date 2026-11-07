import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Usuario } from './types'
import { clearSession, getStoredUser, getToken, saveSession, updateStoredUser } from './session'

interface AuthContextValue {
  user: Usuario | null
  login: (u: Usuario, recordar?: boolean) => void
  updateProfile: (nombre: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(() => getStoredUser())

  const login = (u: Usuario, recordar = false) => {
    saveSession(u, recordar)
    setUser(u)
  }

  const updateProfile = (nombre: string) => {
    setUser(current => {
      if (!current) return null
      const updated = { ...current, nombre }
      updateStoredUser(updated)
      return updated
    })
  }

  const logout = () => {
    const token = getToken()
    if (token) { void fetch('/api/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${token}`}}).catch(()=>{}) }
    clearSession()
    setUser(null)
  }

  useEffect(() => { const handler=()=>setUser(null); window.addEventListener('sigma-session-expired',handler); return ()=>window.removeEventListener('sigma-session-expired',handler) },[])
  useEffect(() => { if (!user) return; fetch('/api/auth/me',{headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>{if(!r.ok){clearSession();setUser(null)}}).catch(()=>{}) },[])
  return <AuthContext.Provider value={{ user, login, logout, updateProfile }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
