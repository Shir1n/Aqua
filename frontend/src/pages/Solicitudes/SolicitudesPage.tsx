import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../../api'
import type { Solicitud } from '../../types'
import './solicitudes.css'
import '../../styles/sigma-v3.css'

const initials = (name:string)=>name.split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase()
const tone = (estado:string)=>estado==='Finalizada'?'done':estado==='En proceso'?'progress':'pending'
export default function Solicitudes() {
  const [all,setAll] = useState<Solicitud[]>([])
  const location = useLocation()
  const previousFilters = (location.state as {listFilters?: {q?:string;estado?:string}} | null)?.listFilters
  const [q,setQ] = useState(previousFilters?.q || '')
  const [estado,setEstado] = useState(previousFilters?.estado || '')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  const navigate = useNavigate()
  useEffect(()=>{api.listSolicitudes().then(setAll).catch(e=>setError(e instanceof Error ? e.message : 'Error al cargar solicitudes')).finally(()=>setLoading(false))},[])
  const counts=useMemo(()=>({total:all.length,pending:all.filter(s=>s.estado==='Pendiente').length,progress:all.filter(s=>s.estado==='En proceso').length,done:all.filter(s=>s.estado==='Finalizada').length}),[all])
  const visibles=useMemo(()=>all.filter(s=>(!estado || s.estado===estado)&&[s.candidato_nombre,s.cargo,s.familia_cargo,s.responsable_nombre||'',String(s.id)].join(' ').toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es').trim())).sort((a,b)=>(b.creado_en || b.fecha_solicitud).localeCompare(a.creado_en || a.fecha_solicitud)),[all,estado,q])
  const tabs=[{label:'Todas',value:'',count:counts.total},{label:'Pendientes',value:'Pendiente',count:counts.pending},{label:'En proceso',value:'En proceso',count:counts.progress},{label:'Finalizadas',value:'Finalizada',count:counts.done}]
  return <section className="v3 v3-requests">
    <div className="v3-page-head"><div><div className="v3-overline">FLUJO DE EVALUACIONES</div><h1>Gestión de solicitudes</h1><p>Prioriza, encuentra y revisa evaluaciones sin perder el contexto.</p></div><Link to="/solicitudes/nueva" className="v3-btn v3-btn-primary">+ Nueva solicitud</Link></div>
    <div className="v3-request-overview"><div className="v3-request-lead"><span className="v3-overline">VISTA GENERAL</span><strong>{counts.total}</strong><small>Solicitudes registradas</small></div><div className="v3-request-progress"><div><span className="v3-dot pending"/>Pendientes<strong>{counts.pending}</strong></div><div><span className="v3-dot progress"/>En proceso<strong>{counts.progress}</strong></div><div><span className="v3-dot done"/>Finalizadas<strong>{counts.done}</strong></div></div><div className="v3-request-progress-visual">{counts.total ? <><span className="pending" style={{width:`${counts.pending/counts.total*100}%`}}/><span className="progress" style={{width:`${counts.progress/counts.total*100}%`}}/><span className="done" style={{width:`${counts.done/counts.total*100}%`}}/></> : null}</div></div>
    <div className="v3-panel v3-table-panel"><div className="v3-request-controls"><div className="v3-tabs" role="group" aria-label="Filtrar por estado">{tabs.map(t=><button type="button" key={t.value} className={estado===t.value?'active':''} aria-pressed={estado===t.value} onClick={()=>setEstado(t.value)}>{t.label}<span>{t.count}</span></button>)}</div><label className="v3-search"><span aria-hidden="true">⌕</span><input aria-label="Buscar solicitudes" placeholder="Buscar solicitud, candidato, cargo..." value={q} onChange={e=>setQ(e.target.value)}/>{q && <button type="button" aria-label="Limpiar búsqueda" onClick={()=>setQ('')}>×</button>}</label></div>
      {error && <div className="v3-error" role="alert">{error}</div>}
      <div className="v3-table-scroll"><table className="v3-table v3-request-table"><thead><tr><th>SOLICITUD</th><th>CANDIDATO</th><th>CARGO</th><th>RESPONSABLE</th><th>FECHA</th><th>ESTADO</th><th className="v3-align-right">DETALLE</th></tr></thead><tbody>{visibles.map(s=><tr key={s.id} className="v3-clickable" tabIndex={0} onClick={()=>navigate(`/solicitudes/${s.id}`, {state:{returnTo:"/solicitudes",listFilters:{q,estado}}})} onKeyDown={e=>{if(e.key==='Enter')navigate(`/solicitudes/${s.id}`, {state:{returnTo:"/solicitudes",listFilters:{q,estado}}})}}><td><span className="v3-id">#{s.id}</span></td><td><div className="v3-person"><span className="v3-avatar">{initials(s.candidato_nombre)}</span><div><strong>{s.candidato_nombre}</strong><small>{s.familia_cargo}</small></div></div></td><td><span className="v3-job">{s.cargo}</span></td><td><span className="v3-cell-plain">{s.responsable_nombre || 'Sin asignar'}</span></td><td><time>{s.fecha_solicitud}</time></td><td><span className={`v3-status ${tone(s.estado)}`}>{s.estado}</span></td><td><Link className="v3-detail-link" to={`/solicitudes/${s.id}`} state={{returnTo:"/solicitudes",listFilters:{q,estado}}} onClick={e=>e.stopPropagation()} aria-label={`Ver solicitud ${s.id}`}>Abrir ↗</Link></td></tr>)}{!loading&&!visibles.length&&<tr><td colSpan={7}><div className="v3-empty"><strong>No hay solicitudes con estos filtros</strong><span>Prueba otra búsqueda o cambia de estado.</span>{(q||estado)&&<button type="button" onClick={()=>{setQ('');setEstado('')}}>Mostrar todas</button>}</div></td></tr>}{loading&&<tr><td colSpan={7} className="v3-loading">Cargando solicitudes…</td></tr>}</tbody></table></div><footer className="v3-table-footer">Mostrando {visibles.length} de {all.length} solicitudes <span>Selecciona una fila para abrir su evaluación</span></footer>
    </div>
  </section>
}
