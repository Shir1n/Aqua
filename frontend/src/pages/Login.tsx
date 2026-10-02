import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import type { Usuario } from '../types'

function getInitials(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

function getRoleIcon(rol: string) {
  switch (rol.toLowerCase()) {
    case 'administrador':
      return 'AD'
    case 'analista':
      return 'AN'
    case 'evaluador':
      return 'EV'
    case 'jefatura':
      return 'JF'
    default:
      return 'US'
  }
}

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
      return
    }

    api
      .getUsuarios()
      .then(setUsuarios)
      .catch(() => setError('No se pudo cargar los usuarios. Verifica que la API esté activa.'))
  }, [user, navigate])

  async function onSelect(u: Usuario) {
    setLoading(true)
    setError('')

    try {
      const logged = await api.login(u.correo)
      login(logged)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al ingresar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-brand-mark" aria-hidden="true">
            EP
          </div>
          <div>
            <span className="login-brand-label">Ingreso al sistema</span>
            <span className="login-brand-status">Acceso simulado</span>
          </div>
        </div>

        <div className="login-heading">
          <h1 id="login-title">Evaluaciones Psicolaborales</h1>
          <p>Reclutamiento y Selección · Ingreso simulado</p>
        </div>

        {error && (
          <div className="login-alert" role="alert">
            <span className="login-alert-icon" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}

        <div className="login-selection-header">
          <div>
            <h2>Selecciona un perfil para ingresar</h2>
            <p>Elige el usuario con el que deseas acceder al sistema.</p>
          </div>
          <span className="login-count">{usuarios.length}</span>
        </div>

        <div className="login-users">
          {usuarios.map((u) => (
            <button
              key={u.id}
              type="button"
              className="login-user-card"
              disabled={loading}
              onClick={() => onSelect(u)}
            >
              <span className="login-user-avatar" aria-hidden="true">
                {getInitials(u.nombre)}
              </span>

              <span className="login-user-info">
                <span className="login-user-name">{u.nombre}</span>
                <span className="login-user-role">
                  <span className="login-role-icon" aria-hidden="true">
                    {getRoleIcon(u.rol)}
                  </span>
                  {u.rol}
                </span>
              </span>

              <span className="login-user-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="login-loading" aria-live="polite">
            <span className="login-spinner" aria-hidden="true" />
            Ingresando al sistema...
          </div>
        )}

        <div className="login-footer">
          <span className="login-footer-dot" aria-hidden="true" />
          Selección de perfil para demostración
        </div>
      </section>
    </main>
  )
}
