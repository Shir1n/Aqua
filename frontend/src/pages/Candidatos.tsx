import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Candidato } from '../types'

export default function Candidatos() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      setCandidatos(await api.listCandidatos(q))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [q])

  async function onDelete(c: Candidato) {
    if (!confirm(`¿Eliminar al candidato ${c.nombre}?`)) return
    try {
      await api.deleteCandidato(c.id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Candidatos</h1>
        <Link className="btn btn-primary" to="/candidatos/nuevo">
          Nuevo candidato
        </Link>
      </div>

      <input
        className="form-control mb-3"
        placeholder="Buscar por nombre, correo, cargo o familia…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-responsive">
        <table className="table table-hover align-middle bg-white rounded shadow-sm">
          <thead className="table-light">
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Cargo</th>
              <th>Familia de cargo</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {candidatos.map((c) => (
              <tr key={c.id}>
                <td className="fw-semibold">{c.nombre}</td>
                <td>{c.correo}</td>
                <td>{c.telefono}</td>
                <td>{c.cargo}</td>
                <td>{c.familia_cargo}</td>
                <td className="text-end">
                  <Link className="btn btn-sm btn-outline-secondary me-1" to={`/candidatos/${c.id}/editar`}>
                    Editar
                  </Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(c)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {candidatos.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  No hay candidatos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
