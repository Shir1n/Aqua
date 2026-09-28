import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import type { Usuario } from '../types'

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
    <div className="d-flex align-items-center justify-content-center min-vh-100">
      <div className="card shadow" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Evaluaciones Psicolaborales</h1>
          <p className="text-muted mb-4">Reclutamiento y Selección · Ingreso simulado</p>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <p className="mb-2 fw-semibold">Selecciona un perfil para ingresar:</p>
          <div className="d-grid gap-2">
            {usuarios.map((u) => (
              <button
                key={u.id}
                className="btn btn-outline-primary text-start"
                disabled={loading}
                onClick={() => onSelect(u)}
              >
                <span className="fw-semibold">{u.nombre}</span>
                <span className="badge bg-secondary ms-2">{u.rol}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
