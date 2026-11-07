import type { Candidato, Dashboard, Documento, Evaluacion, Solicitud, Usuario } from './types'
import { clearSession, getToken } from './session'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
  })
  if (res.status === 401 && !['/api/auth/login','/api/auth/registro','/api/auth/verificar','/api/auth/reenviar-codigo'].includes(path)) { clearSession(); window.dispatchEvent(new Event('sigma-session-expired')) }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data as T
}

export interface CandidatoInput {
  nombre: string
  correo: string
  telefono: string
  cargo: string
  familiaCargo: string
}

export interface SolicitudInput {
  candidatoId: number
  cargo: string
  familiaCargo: string
  fechaSolicitud: string
  estado: string
  responsableId: number | null
  observaciones: string
}

export interface EvaluacionInput {
  fechaEvaluacion: string
  resultado: string
  observaciones: string
  estado: string
  competencias?: Record<string,number>
  recomendaciones?: string
  borrador?: boolean
}

// Descarga autenticada (un <a href> no envía el token de sesión).
async function descargarArchivo(path: string, nombre: string) {
  const token = getToken()
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Error ${res.status}`)
  }
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Subida multipart (no usa request(): el navegador debe fijar el Content-Type con el boundary).
async function subirDocumentos(id: number, archivos: { cv?: File | null; descriptor?: File | null }) {
  const data = new FormData()
  if (archivos.cv) data.append('cv', archivos.cv)
  if (archivos.descriptor) data.append('descriptor', archivos.descriptor)
  const token = getToken()
  const res = await fetch(`/api/solicitudes/${id}/documentos`, { method: 'POST', body: data, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`)
  return body as Documento[]
}

export const api = {
  subirDocumentos,
  descargarDocumento: (id: number, nombre: string) => descargarArchivo(`/api/documentos/${id}/descargar`, nombre),
  me: () => request<Usuario>('/api/auth/me'),
  logout: () => request<void>('/api/auth/logout',{method:'POST'}),
  getNotificaciones: () => request<Notificacion[]>('/api/extra/notificaciones'),
  leerNotificacion: (id:number) => request<void>(`/api/extra/notificaciones/${id}/leida`,{method:'PATCH'}),
  leerTodas: () => request<void>('/api/extra/notificaciones/leer-todas',{method:'POST'}),
  getAgenda: () => request<EventoAgenda[]>('/api/extra/agenda'),
  crearEvento: (body:{solicitudId:number;fecha:string;hora:string;notas:string}) => request<{id:number}>('/api/extra/agenda',{method:'POST',body:JSON.stringify(body)}),
  eliminarEvento: (id:number) => request<void>(`/api/extra/agenda/${id}`,{method:'DELETE'}),
  getEstadisticas: () => request<Estadisticas>('/api/extra/estadisticas'),
  adminUsuarios: () => request<UsuarioAdmin[]>('/api/extra/usuarios'),
  adminActualizar: (id:number,body:{rol?:string;activo?:boolean}) => request<{mensaje:string}>(`/api/extra/usuarios/${id}`,{method:'PATCH',body:JSON.stringify(body)}),
  adminCrearUsuario: (body:{nombre:string;correo:string;rol:string;contrasena:string}) => request<{id:number;mensaje:string}>('/api/extra/usuarios',{method:'POST',body:JSON.stringify(body)}),
  adminRestablecerClave: (id:number,contrasena:string) => request<{mensaje:string}>(`/api/extra/usuarios/${id}/clave`,{method:'PUT',body:JSON.stringify({contrasena})}),
  adminAuditoria: () => request<Auditoria[]>('/api/extra/auditoria'),
  getUsuarios: () => request<Usuario[]>('/api/auth/usuarios'),
  login: (correo: string, contrasena = '') =>
    request<Usuario>('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo, contrasena }) }),
  registro: (body: {nombre:string; correo:string; contrasena:string; rol:string}) => request<{mensaje:string}>('/api/auth/registro',{method:'POST',body:JSON.stringify(body)}),
  verificar: (correo:string,codigo:string) => request<{mensaje:string}>('/api/auth/verificar',{method:'POST',body:JSON.stringify({correo,codigo})}),
  reenviarCodigo: (correo:string) => request<{mensaje:string}>('/api/auth/reenviar-codigo',{method:'POST',body:JSON.stringify({correo})}),

  actualizarEstado: (id:number,estado:string) => request<Solicitud>(`/api/solicitudes/${id}/estado`,{method:'PATCH',body:JSON.stringify({estado})}),
  historialCandidato: (id:number) => request<HistorialCandidato>(`/api/candidatos/${id}/historial`),
  recordatorios: () => request<Recordatorios>('/api/extra/recordatorios'),
  getDashboard: () => request<Dashboard>('/api/dashboard'),

  listCandidatos: (q = '') =>
    request<Candidato[]>(`/api/candidatos${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getCandidato: (id: number) => request<Candidato>(`/api/candidatos/${id}`),
  createCandidato: (body: CandidatoInput) =>
    request<Candidato>('/api/candidatos', { method: 'POST', body: JSON.stringify(body) }),
  updateCandidato: (id: number, body: CandidatoInput) =>
    request<Candidato>(`/api/candidatos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCandidato: (id: number) =>
    request<void>(`/api/candidatos/${id}`, { method: 'DELETE' }),

  listSolicitudes: (opts: { estado?: string; q?: string } = {}) => {
    const params = new URLSearchParams()
    if (opts.estado) params.set('estado', opts.estado)
    if (opts.q) params.set('q', opts.q)
    const qs = params.toString()
    return request<Solicitud[]>(`/api/solicitudes${qs ? `?${qs}` : ''}`)
  },
  getSolicitud: (id: number) => request<Solicitud>(`/api/solicitudes/${id}`),
  createSolicitud: (body: SolicitudInput) =>
    request<Solicitud>('/api/solicitudes', { method: 'POST', body: JSON.stringify(body) }),
  updateSolicitud: (id: number, body: Partial<SolicitudInput>) =>
    request<Solicitud>(`/api/solicitudes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getEvaluacion: (id: number) => request<Evaluacion | null>(`/api/solicitudes/${id}/evaluacion`),
  saveEvaluacion: (id: number, body: EvaluacionInput) =>
    request<Evaluacion>(`/api/solicitudes/${id}/evaluacion`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

export interface Notificacion {id:number;titulo:string;descripcion:string;leida:number;enlace:string;creado_en:string}
export interface EventoAgenda {id:number;solicitud_id:number;fecha:string;hora:string;notas:string;candidato_nombre:string;cargo:string;evaluador_nombre:string|null; evaluador_id:number|null}
export interface Estadisticas {porMes:{mes:string;total:number;finalizadas:number}[];porEvaluador:{nombre:string;total:number;finalizadas:number}[];resumen:{total:number;finalizadas:number;diasAproximados:number|null}}
export interface UsuarioAdmin {id:number;nombre:string;correo:string;rol:string;activo:number;verificado:number}
export interface Auditoria {id:number;accion:string;detalle:string;usuario_nombre:string;creado_en:string}

export interface HistorialCandidato {candidato:{id:number;nombre:string};solicitudes:(Solicitud & {fecha_evaluacion?:string;resultado?:string;borrador?:number})[];historial:{id:number;solicitud_id:number;accion:string;detalle:string;creado_en:string}[]}
export interface Recordatorios {agenda:{id:number;fecha:string;hora:string;solicitud_id:number;candidato_nombre:string}[];sinAsignar:{id:number;cargo:string;fecha_solicitud:string}[]}
