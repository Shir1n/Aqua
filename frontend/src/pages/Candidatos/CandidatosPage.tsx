import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../../api'
import type { Candidato } from '../../types'
import './candidatos.css'
import '../../styles/sigma-v3.css'

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase()
export default function Candidatos() {
  const [candidatos,setCandidatos] = useState<Candidato[]>([])
  const location = useLocation()
  const previousFilters = (location.state as {candidateFilters?: {q?:string;familia?:string}} | null)?.candidateFilters
  const [q,setQ] = useState(previousFilters?.q || '')
  const [familia,setFamilia] = useState(previousFilters?.familia || '')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  async function load() {
    try { setError(''); setCandidatos(await api.listCandidatos()); }
    catch(e) { setError(e instanceof Error ? e.message : 'Error al cargar candidatos') }
    finally { setLoading(false) }
  }
  useEffect(()=>{ void load() },[])
  async function onDelete(c: Candidato) {
    if (!window.confirm(`¿Eliminar al candidato ${c.nombre}?`)) return
    try { await api.deleteCandidato(c.id); await load() }
    catch(e) { setError(e instanceof Error ? e.message : 'Error al eliminar') }
  }
  const familias = useMemo(()=>[...new Set(candidatos.map(c=>c.familia_cargo).filter(Boolean))].sort(),[candidatos])
  const visibles = useMemo(()=>candidatos.filter(c=>(!familia || c.familia_cargo===familia) && [c.nombre,c.correo,c.telefono,c.cargo,c.familia_cargo].join(' ').toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es').trim())),[candidatos,q,familia])
  return <section className="v3 v3-directory">
    <div className="v3-page-head"><div><div className="v3-overline">GESTIÓN DE TALENTO</div><h1>Directorio de candidatos</h1><p>Perfiles organizados para encontrar lo que necesitas rápidamente.</p></div><Link className="v3-btn v3-btn-primary" to="/candidatos/nuevo">+ Registrar candidato</Link></div>
    <div className="v3-directory-summary"><div><span className="v3-summary-icon">◎</span><div><strong>{candidatos.length}</strong><small>Candidatos registrados</small></div></div><div><span className="v3-summary-icon">▦</span><div><strong>{familias.length}</strong><small>Familias de cargo</small></div></div><div className="v3-directory-tip"><span>✦</span><p>Selecciona <b>Editar</b> para actualizar la información de un perfil.</p></div></div>
    <div className="v3-panel v3-table-panel"><div className="v3-table-header"><div><span className="v3-overline">BASE DE CANDIDATOS</span><h2>Todos los perfiles <span className="v3-count">{visibles.length}</span></h2></div><div className="v3-toolbar"><label className="v3-search"><span aria-hidden="true">⌕</span><input aria-label="Buscar candidatos" placeholder="Buscar nombre, correo o cargo..." value={q} onChange={e=>setQ(e.target.value)}/>{q && <button type="button" onClick={()=>setQ('')} aria-label="Limpiar búsqueda">×</button>}</label><select aria-label="Filtrar por familia de cargo" value={familia} onChange={e=>setFamilia(e.target.value)}><option value="">Todas las familias</option>{familias.map(f=><option value={f} key={f}>{f}</option>)}</select></div></div>
      {error && <div className="v3-error" role="alert">{error}</div>}
      <div className="v3-table-scroll"><table className="v3-table"><thead><tr><th>PERFIL</th><th>CONTACTO</th><th>CARGO</th><th>FAMILIA</th><th className="v3-align-right">ACCIONES</th></tr></thead><tbody>{visibles.map(c=><tr key={c.id}><td><div className="v3-person"><span className="v3-avatar">{initials(c.nombre)}</span><div><strong>{c.nombre}</strong><small>Registro #{c.id}</small></div></div></td><td><div className="v3-cell-stack"><strong>{c.correo}</strong><small>{c.telefono || 'Sin teléfono'}</small></div></td><td><span className="v3-job">{c.cargo || 'Sin cargo'}</span></td><td><span className="v3-family">{c.familia_cargo || 'Sin familia'}</span></td><td><div className="v3-table-actions"><Link to={`/candidatos/${c.id}/editar`} state={{returnTo:"/candidatos",candidateFilters:{q,familia}}} className="v3-mini-action">Editar ↗</Link><button type="button" className="v3-mini-action v3-danger-action" onClick={()=>onDelete(c)} aria-label={`Eliminar a ${c.nombre}`}>Eliminar</button></div></td></tr>)}{!loading && !visibles.length && <tr><td colSpan={5}><div className="v3-empty"><strong>No se encontraron candidatos</strong><span>Prueba otra búsqueda o elimina los filtros.</span>{(q || familia) && <button type="button" onClick={()=>{setQ('');setFamilia('')}}>Limpiar filtros</button>}</div></td></tr>}{loading && <tr><td colSpan={5} className="v3-loading">Cargando candidatos…</td></tr>}</tbody></table></div>
      <footer className="v3-table-footer">Mostrando {visibles.length} de {candidatos.length} candidatos <span>Directorio SIGMA-Aqua</span></footer>
    </div>
  </section>
}
