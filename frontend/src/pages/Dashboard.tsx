import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Dashboard as DashboardData } from '../types'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getDashboard().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!data) return <p className="text-muted">Cargando indicadores…</p>

  const cards = [
    { label: 'Candidatos', value: data.totalCandidatos, color: 'primary' },
    { label: 'Solicitudes', value: data.totalSolicitudes, color: 'secondary' },
    { label: 'Pendientes', value: data.pendientes, color: 'warning' },
    { label: 'En proceso', value: data.enProceso, color: 'info' },
    { label: 'Finalizadas', value: data.finalizadas, color: 'success' },
  ]

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      <div className="row g-3">
        {cards.map((c) => (
          <div className="col-6 col-md-4 col-lg" key={c.label}>
            <div className={`card text-bg-${c.color} h-100`}>
              <div className="card-body">
                <div className="fs-2 fw-bold">{c.value}</div>
                <div>{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card mt-4">
        <div className="card-body text-muted">
          Indicadores generales del proceso de evaluación psicolaboral (datos ficticios).
        </div>
      </div>
    </>
  )
}
