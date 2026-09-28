import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ESTADOS } from '../catalogs'
import type { Solicitud } from '../types'

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    Pendiente: 'warning',
    'En proceso': 'info',
    Finalizada: 'success',
  }
  return map[estado] ?? 'secondary'
}

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setSolicitudes(await api.listSolicitudes({ q, estado }))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar')
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, estado])

  return (
    <>
      <div className="page-header">
        <h1>Solicitudes</h1>
        <Link className="btn btn-primary" to="/solicitudes/nueva">
          Nueva solicitud
        </Link>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <input
            className="form-control"
            placeholder="Buscar por candidato, cargo o familia…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select className="form-select" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-responsive">
        <table className="table table-hover align-middle bg-white rounded shadow-sm">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Candidato</th>
              <th>Cargo</th>
              <th>Familia</th>
              <th>Responsable</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/solicitudes/${s.id}`)}>
                <td>{s.id}</td>
                <td className="fw-semibold">{s.candidato_nombre}</td>
                <td>{s.cargo}</td>
                <td>{s.familia_cargo}</td>
                <td>{s.responsable_nombre ?? '—'}</td>
                <td>{s.fecha_solicitud}</td>
                <td>
                  <span className={`badge text-bg-${estadoBadge(s.estado)}`}>{s.estado}</span>
                </td>
              </tr>
            ))}
            {solicitudes.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No hay solicitudes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
