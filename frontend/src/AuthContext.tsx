import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Usuario } from './types'

interface AuthContextValue {
  user: Usuario | null
  login: (u: Usuario) => void
  updateProfile: (nombre: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'aqua.user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw && localStorage.getItem('aqua.token') ? (JSON.parse(raw) as Usuario) : null
  })

  const login = (u: Usuario) => {
    if (u.token) localStorage.setItem('aqua.token',u.token)
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
  }

  const updateProfile = (nombre: string) => {
    setUser(current => {
      if (!current) return null
      const updated = { ...current, nombre }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const logout = () => {
    const token = localStorage.getItem('aqua.token')
    if (token) { void fetch('/api/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${token}`}}).catch(()=>{}) }
    localStorage.removeItem('aqua.token')
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  useEffect(() => { const handler=()=>setUser(null); window.addEventListener('sigma-session-expired',handler); return ()=>window.removeEventListener('sigma-session-expired',handler) },[])
  useEffect(() => { if (!user) return; fetch('/api/auth/me',{headers:{Authorization:`Bearer ${localStorage.getItem('aqua.token')||''}`}}).then(r=>{if(!r.ok){localStorage.removeItem('aqua.token');localStorage.removeItem('aqua.user');setUser(null)}}).catch(()=>{}) },[])
  return <AuthContext.Provider value={{ user, login, logout, updateProfile }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
