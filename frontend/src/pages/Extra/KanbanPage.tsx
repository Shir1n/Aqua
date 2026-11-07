import {useEffect,useState,type DragEvent} from 'react'
import {Link} from 'react-router-dom'
import {api} from '../../api'
import type {Solicitud,Estado} from '../../types'
import './sigma43.css'
import './kanban-colors.css'
const states:Estado[]=['Pendiente','En proceso','Finalizada']
export default function KanbanPage(){
 const [rows,setRows]=useState<Solicitud[]>([]),[busy,setBusy]=useState<number|null>(null),[notice,setNotice]=useState(''),[dragging,setDragging]=useState<number|null>(null),[hovered,setHovered]=useState<Estado|null>(null)
 useEffect(()=>{api.listSolicitudes().then(setRows).catch(e=>setNotice(e.message))},[])
 async function move(id:number,estado:Estado){const item=rows.find(r=>r.id===id);if(!item||item.estado===estado||busy!==null)return
  const before=rows;setRows(rows.map(r=>r.id===id?{...r,estado}:r));setBusy(id);setNotice('')
  try{const updated=await api.actualizarEstado(id,estado);setRows(prev=>prev.map(r=>r.id===id?updated:r));setNotice(`Solicitud #${id} actualizada a ${estado}`)}catch(e){setRows(before);setNotice(e instanceof Error?e.message:String(e))}finally{setBusy(null);setDragging(null);setHovered(null)}
 }
 function drop(e:DragEvent<HTMLElement>,estado:Estado){e.preventDefault();setHovered(null);const id=Number(e.dataTransfer.getData('text/plain')||dragging);if(Number.isInteger(id)&&id>0)void move(id,estado)}
 return <section className="s43-page"><header><small>GESTIÓN VISUAL</small><h1>Tablero Kanban</h1><p>Arrastra solicitudes para cambiar su estado. Los cambios se guardan automáticamente.</p></header>{notice&&<div className="s43-toast" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Cerrar aviso">×</button></div>}
 <div className="s43-board s454-board">{states.map(estado=><section className={`s43-column s454-column s454-${estado==='Pendiente'?'pending':estado==='En proceso'?'progress':'done'} ${hovered===estado&&dragging!==null?'s454-drop-target':''}`} key={estado} onDragEnter={e=>{e.preventDefault();if(dragging!==null)setHovered(estado)}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';if(dragging!==null&&hovered!==estado)setHovered(estado)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setHovered(prev=>prev===estado?null:prev)}} onDrop={e=>drop(e,estado)}><h2>{estado}<span>{rows.filter(r=>r.estado===estado).length}</span></h2>{rows.filter(r=>r.estado===estado).map(r=><article className={`s43-ticket s454-ticket ${dragging===r.id?'s454-dragging':''}`} key={r.id} draggable={busy===null} onDragStart={e=>{setDragging(r.id);e.dataTransfer.setData('text/plain',String(r.id));e.dataTransfer.effectAllowed='move'}} onDragEnd={()=>{setDragging(null);setHovered(null)}}><Link to={`/solicitudes/${r.id}`} state={{ returnTo: "/kanban" }}><strong>#{r.id} · {r.candidato_nombre}</strong></Link><p>{r.cargo}</p><small>{r.responsable_nombre||'Sin asignar'}</small><label>Mover a <select disabled={busy!==null} value={r.estado} onChange={e=>void move(r.id,e.target.value as Estado)}>{states.map(st=><option key={st} value={st}>{st}</option>)}</select></label></article>)}{rows.every(r=>r.estado!==estado)&&<p className="s43-empty">Suelta una solicitud aquí</p>}</section>)}</div></section>
}
