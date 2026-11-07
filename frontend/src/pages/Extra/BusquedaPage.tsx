import {useEffect,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {api} from '../../api'
import type {Candidato,Solicitud} from '../../types'
import './sigma43.css'
export default function BusquedaPage(){const [params,setParams]=useSearchParams();const q=params.get('q')||'';const [c,setC]=useState<Candidato[]>([]),[s,setS]=useState<Solicitud[]>([]),[error,setError]=useState('')
 useEffect(()=>{let active=true;const t=setTimeout(()=>{Promise.all([api.listCandidatos(q),api.listSolicitudes({q})]).then(([a,b])=>{if(active){setC(a);setS(b)}}).catch(e=>{if(active)setError(e.message)})},220);return()=>{active=false;clearTimeout(t)}},[q])
 return <section className="s43-page"><header><small>BÚSQUEDA GLOBAL</small><h1>Encuentra un registro</h1><p>Busca candidatos y solicitudes por nombre, cargo o familia.</p></header><input autoFocus className="s43-search" placeholder="Nombre, cargo o familia…" value={q} onChange={e=>setParams(e.target.value?{q:e.target.value}:{})}/>{error&&<p role="alert">{error}</p>}<div className="s43-results"><section><h2>Candidatos ({c.length})</h2>{c.map(x=><Link key={x.id} to={`/candidatos/${x.id}/historial`} state={{ returnTo: `/buscar${window.location.search}` }}><strong>{x.nombre}</strong><small>{x.cargo} · {x.familia_cargo}</small></Link>)}</section><section><h2>Solicitudes ({s.length})</h2>{s.map(x=><Link key={x.id} to={`/solicitudes/${x.id}`} state={{ returnTo: `/buscar${window.location.search}` }}><strong>#{x.id} · {x.candidato_nombre}</strong><small>{x.cargo} · {x.estado}</small></Link>)}</section></div></section>
}
