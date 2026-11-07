import type { Usuario } from './types'

// "Recordarme" marcado → localStorage (sobrevive al cierre del navegador).
// Sin marcar → sessionStorage (la sesión termina al cerrar el navegador).
const TOKEN_KEY = 'aqua.token'
const USER_KEY = 'aqua.user'

function stores(): Storage[] {
  const out: Storage[] = []
  try { out.push(localStorage) } catch { /* almacenamiento bloqueado */ }
  try { out.push(sessionStorage) } catch { /* almacenamiento bloqueado */ }
  return out
}

export function getToken(): string {
  for (const s of stores()) {
    const token = s.getItem(TOKEN_KEY)
    if (token) return token
  }
  return ''
}

export function getStoredUser(): Usuario | null {
  for (const s of stores()) {
    const raw = s.getItem(USER_KEY)
    if (raw && s.getItem(TOKEN_KEY)) {
      try { return JSON.parse(raw) as Usuario } catch { return null }
    }
  }
  return null
}

export function saveSession(user: Usuario, recordar: boolean) {
  clearSession()
  const target = recordar ? localStorage : sessionStorage
  if (user.token) target.setItem(TOKEN_KEY, user.token)
  target.setItem(USER_KEY, JSON.stringify(user))
}

/** Actualiza los datos del usuario donde ya esté guardada la sesión. */
export function updateStoredUser(user: Usuario) {
  for (const s of stores()) if (s.getItem(TOKEN_KEY)) s.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  for (const s of stores()) {
    s.removeItem(TOKEN_KEY)
    s.removeItem(USER_KEY)
  }
}
