import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import type { Candidato, Dashboard as DashboardData, Solicitud } from '../../types'
import './dashboard.css'
import './dashboard-atmosphere.css'
import './dashboard-reference.css'
import '../../styles/sigma-v3.css'

function prettyDate(date: string) {
  if (!date) return 'Sin fecha'
  const d = new Date(`${date.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? date : new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(d)
}
function tone(estado: string) {
  return estado === 'Finalizada' ? 'done' : estado === 'En proceso' ? 'progress' : 'pending'
}
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([api.getDashboard(), api.listSolicitudes(), api.listCandidatos()])
      .then(([d, s, c]) => { setData(d); setSolicitudes(s); setCandidatos(c) })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el panel'))
  }, [])
  const recientes = useMemo(() => [...solicitudes].sort((a,b) => (b.creado_en || b.fecha_solicitud).localeCompare(a.creado_en || a.fecha_solicitud)).slice(0, 5), [solicitudes])
  const sinAsignar = solicitudes.filter((s) => s.estado === 'Pendiente' && !s.responsable_id)
  if (error) return <div className="alert alert-danger">{error}</div>
  if (!data) return <div className="v3-loading">Cargando tu espacio de trabajo…</div>
  const total = data.totalSolicitudes || 0
  const summary = [
    { title: 'Solicitudes activas', value: data.pendientes + data.enProceso, note: 'Pendientes y en proceso', color: 'blue', href: '/solicitudes' },
    { title: 'Por revisar', value: data.pendientes, note: 'Esperando atención', color: 'amber', href: '/solicitudes' },
    { title: 'Completadas', value: data.finalizadas, note: total ? `${Math.round(data.finalizadas / total * 100)}% del total` : 'Sin solicitudes', color: 'green', href: '/solicitudes' },
    { title: 'Candidatos', value: data.totalCandidatos, note: 'Perfiles registrados', color: 'purple', href: '/candidatos' },
  ]
  const counts = [
    { label: 'Pendientes', value: data.pendientes, color: '#f4a333' },
    { label: 'En proceso', value: data.enProceso, color: '#239ee9' },
    { label: 'Finalizadas', value: data.finalizadas, color: '#2bbf62' },
  ]
  const pct = (n: number) => total ? n / total * 100 : 0
  const chart = `conic-gradient(#f4a333 0% ${pct(data.pendientes)}%, #239ee9 ${pct(data.pendientes)}% ${pct(data.pendientes + data.enProceso)}%, #2bbf62 ${pct(data.pendientes + data.enProceso)}% 100%)`
  return <section className="v3 v3-dashboard v44-reference">
    <div className="v3-page-head">
      <div><div className="v3-overline"><span className="v3-live-dot" /> CENTRO DE OPERACIONES</div><h1>Panel de control</h1><p>Todo tu proceso de evaluación, en un solo lugar.</p></div>
      <div className="v3-head-actions"><Link className="v3-btn v3-btn-ghost" to="/candidatos/nuevo">+ Nuevo candidato</Link><Link className="v3-btn v3-btn-primary" to="/solicitudes/nueva">+ Nueva solicitud</Link></div>
    </div>
    <div className="v44-metrics">
      {[
        { title: 'Candidatos', value: data.totalCandidatos, icon: '♧', href: '/candidatos' },
        { title: 'Solicitudes', value: total, icon: '▤', href: '/solicitudes' },
        { title: 'En proceso', value: data.enProceso, icon: '⌁', href: '/solicitudes' },
        { title: 'Finalizadas', value: data.finalizadas, icon: '✓', href: '/solicitudes' },
      ].map(m => <Link key={m.title} to={m.href} className="v44-metric">
        <span className="v44-metric-icon" aria-hidden="true">{m.icon}</span>
        <span><strong>{m.title}</strong><b>{m.value}</b></span>
      </Link>)}
    </div>
    <div className="v44-overview">
      <article className="v44-card">
        <h2><span aria-hidden="true">▥</span> Solicitudes por estado</h2>
        <div className="v44-chart-content">
          <div className="v44-donut" style={{background: total ? chart : '#d9e5ef'}} aria-label={`${total} solicitudes en total`}>
            <div><strong>{total}</strong><span>Solicitudes</span></div>
          </div>
          <div className="v44-chart-legend">
            {counts.map(c => <div key={c.label}><span><i style={{background:c.color}} />{c.label}</span><strong>{c.value} <small>({Math.round(pct(c.value))}%)</small></strong></div>)}
          </div>
        </div>
      </article>
      <article className="v44-card">
        <div className="v44-card-title"><h2><span aria-hidden="true">▦</span> Actividad reciente</h2><Link to="/agenda">Ver calendario →</Link></div>
        <div className="v44-activity">
          {recientes.slice(0, 3).map(s => <Link to={`/solicitudes/${s.id}`} state={{ returnTo: "/" }} key={s.id}>
            <span className="v44-activity-icon" aria-hidden="true">▣</span>
            <span className="v44-activity-info"><strong>Solicitud #{s.id} · {s.candidato_nombre}</strong><small>{prettyDate(s.fecha_solicitud)} · {s.cargo}</small></span>
            <em className={`v3-status ${tone(s.estado)}`}>{s.estado}</em>
          </Link>)}
          {!recientes.length && <p>No hay solicitudes registradas todavía.</p>}
        </div>
      </article>
    </div>
    <div className="v3-dashboard-body">
      <div className="v3-dashboard-primary">
        <article className="v3-panel">
          <header className="v3-panel-head"><div><span className="v3-overline">SEGUIMIENTO EN TIEMPO REAL</span><h2>Solicitudes recientes</h2><p>Accede directamente a los últimos movimientos.</p></div><Link to="/solicitudes" className="v3-text-link">Ver todas →</Link></header>
          <div className="v3-recent-list">
            {recientes.map(s => <Link to={`/solicitudes/${s.id}`} state={{ returnTo: "/" }} key={s.id} className="v3-recent-row"><span className="v3-recent-number">#{s.id}</span><span className="v3-recent-main"><strong>{s.candidato_nombre}</strong><small>{s.cargo}</small></span><span className={`v3-status ${tone(s.estado)}`}>{s.estado}</span><time>{prettyDate(s.fecha_solicitud)}</time><span className="v3-row-chevron">›</span></Link>)}
            {!recientes.length && <div className="v3-empty">Todavía no hay solicitudes. <Link to="/solicitudes/nueva">Crear la primera →</Link></div>}
          </div>
        </article>
        <article className="v3-panel v3-shortcuts"><header className="v3-panel-head"><div><span className="v3-overline">ACCESOS DIRECTOS</span><h2>¿Qué necesitas hacer?</h2></div></header><div className="v3-shortcut-grid"><Link to="/solicitudes/nueva"><span className="v3-shortcut-symbol">＋</span><strong>Crear solicitud</strong><small>Iniciar una evaluación</small><b>→</b></Link><Link to="/candidatos/nuevo"><span className="v3-shortcut-symbol">◎</span><strong>Registrar candidato</strong><small>Agregar un perfil</small><b>→</b></Link><Link to="/solicitudes"><span className="v3-shortcut-symbol">☷</span><strong>Gestionar solicitudes</strong><small>Consultar y evaluar</small><b>→</b></Link></div></article>
      </div>
      <aside className="v3-dashboard-aside">
        <article className="v3-panel v3-priority"><header className="v3-panel-head"><div><span className="v3-overline">PRIORIDADES</span><h2>Necesita tu atención</h2></div></header><div className="v3-priority-number">{sinAsignar.length}<span>sin asignar</span></div><p>Solicitudes pendientes que aún no tienen evaluador responsable.</p>{sinAsignar.length ? <div className="v3-priority-items">{sinAsignar.slice(0, 3).map(s => <Link to={`/solicitudes/${s.id}`} state={{ returnTo: "/" }} key={s.id}>#{s.id} · {s.candidato_nombre}<span>→</span></Link>)}</div> : <div className="v3-all-clear">✓ No hay solicitudes pendientes sin responsable.</div>}<Link to="/solicitudes" className="v3-text-link">Revisar solicitudes →</Link></article>
        <article className="v3-panel v3-distribution"><header className="v3-panel-head"><div><span className="v3-overline">ESTADO DEL PROCESO</span><h2>Distribución</h2></div><span className="v3-total-chip">{total} total</span></header><div className="v3-distribution-bar" aria-label="Distribución por estado">{total > 0 && <><span className="pending" style={{width:`${data.pendientes / total * 100}%`}}/><span className="progress" style={{width:`${data.enProceso / total * 100}%`}}/><span className="done" style={{width:`${data.finalizadas / total * 100}%`}}/></>}</div><div className="v3-legend">{[['Pendientes',data.pendientes,'pending'],['En proceso',data.enProceso,'progress'],['Finalizadas',data.finalizadas,'done']].map(([label,count,kind])=><div key={label}><span><i className={`v3-dot ${kind}`}/>{label}</span><strong>{count}</strong></div>)}</div></article>
        <div className="v3-footnote">Información sincronizada con SIGMA-Aqua · {candidatos.length} perfiles disponibles</div>
      </aside>
    </div>
  </section>
}
