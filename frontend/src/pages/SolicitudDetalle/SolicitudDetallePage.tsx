import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { api } from '../../api'
import { ESTADOS, RESULTADOS } from '../../catalogs'
import type { Candidato, Solicitud } from '../../types'
import { useAuth } from '../../AuthContext'
import { abrirInformeSolicitud } from '../../utils/informeSolicitud'

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    Pendiente: 'warning',
    'En proceso': 'info',
    Finalizada: 'success',
  }
  return map[estado] ?? 'secondary'
}

export default function SolicitudDetalle() {
  const { id } = useParams()
  const location = useLocation()
  const origin = (location.state as { returnTo?: string; listFilters?: {q?:string;estado?:string} } | null)
  const returnTo = origin?.returnTo
  const safeReturnTo = returnTo && (/^\/(?:$|solicitudes(?:\?.*)?$|kanban$|herramientas$|buscar(?:\?.*)?$|agenda$|candidatos\/\d+\/historial$)/.test(returnTo)) ? returnTo : "/solicitudes"
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [candidato, setCandidato] = useState<Candidato | null>(null)
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const [evalForm, setEvalForm] = useState({
    fechaEvaluacion: '',
    resultado: '',
    observaciones: '',
    estado: 'En proceso',
    competencias: {} as Record<string,number>,
    recomendaciones: '',
    borrador: true,
  })

  async function load() {
    try {
      const s = await api.getSolicitud(Number(id))
      setSolicitud(s)
      try { setCandidato(await api.getCandidato(s.candidato_id)) } catch { setCandidato(null) }
      if (s.evaluacion) {
        setEvalForm({
          fechaEvaluacion: s.evaluacion.fecha_evaluacion,
          resultado: s.evaluacion.resultado,
          observaciones: s.evaluacion.observaciones,
          estado: s.evaluacion.estado,
          competencias: (()=>{try{return JSON.parse(s.evaluacion.competencias||'{}')}catch{return {}}})(),
          recomendaciones: s.evaluacion.recomendaciones||'',
          borrador: Boolean(s.evaluacion.borrador),
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    }
  }

  useEffect(() => {
    load()
  }, [id])

  function descargarResumen() {
    if (!solicitud) return
    if (!abrirInformeSolicitud(solicitud, candidato, user)) {
      setError('El navegador bloqueó la ventana del informe. Permite ventanas emergentes para SIGMA-Aqua e inténtalo de nuevo.')
    }
  }

  async function onEstadoChange(estado: string) {
    try {
      await api.updateSolicitud(Number(id), { estado })
      setMsg('Estado actualizado')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar')
    }
  }

  async function onEvalSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await api.saveEvaluacion(Number(id), evalForm)
      setMsg('Evaluación registrada')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar evaluación')
    }
  }

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!solicitud) return <p className="text-muted">Cargando…</p>

  return (
    <>
      <div className="page-header sigma-detail-header">
        <div>
          <span className="sigma-kicker">GESTIÓN DEL PROCESO / EVALUACIÓN</span>
          <h1>
            Solicitud #{solicitud.id}{' '}
            <span className={`badge text-bg-${estadoBadge(solicitud.estado)} align-middle`}>
              {solicitud.estado}
            </span>
          </h1>
          <p className="text-muted mb-0">
            {solicitud.candidato_nombre} — {solicitud.cargo}
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-primary" type="button" onClick={descargarResumen}>Descargar informe PDF</button>
          <Link className="btn btn-outline-secondary" to={safeReturnTo} state={origin?.listFilters ? { listFilters: origin.listFilters } : undefined}>Volver</Link>
        </div>
      </div>

      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3 sigma-detail-grid">
        <div className="col-lg-5">
          <div className="card shadow-sm sigma-detail-card">
            <div className="card-header fw-semibold"><span className="sigma-card-eyebrow">ANTECEDENTES</span><strong>Datos de la solicitud</strong></div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5">Candidato</dt>
                <dd className="col-7">{solicitud.candidato_nombre}</dd>
                <dt className="col-5">Cargo</dt>
                <dd className="col-7">{solicitud.cargo}</dd>
                <dt className="col-5">Familia de cargo</dt>
                <dd className="col-7">{solicitud.familia_cargo}</dd>
                <dt className="col-5">Fecha solicitud</dt>
                <dd className="col-7">{solicitud.fecha_solicitud}</dd>
                <dt className="col-5">Responsable</dt>
                <dd className="col-7">{solicitud.responsable_nombre ?? 'Sin asignar'}</dd>
                <dt className="col-5">Observaciones</dt>
                <dd className="col-7">{solicitud.observaciones || '—'}</dd>
              </dl>

              <hr />
              <label className="form-label">Actualizar estado</label>
              <select
                className="form-select"
                value={solicitud.estado}
                onChange={(e) => onEstadoChange(e.target.value)}
              >
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card shadow-sm sigma-detail-card">
            <div className="card-header fw-semibold"><span className="sigma-card-eyebrow">RESULTADOS Y SEGUIMIENTO</span><strong>Evaluación psicolaboral</strong></div>
            <div className="card-body">
              <p className="sigma-form-intro">Registra el resultado, la fecha y las observaciones de la evaluación.</p>
              <form onSubmit={onEvalSubmit}>
                <div className="sigma-competencies"><label className="form-label fw-semibold">Competencias evaluadas</label><p className="text-muted small">Escala de 1 (bajo) a 5 (sobresaliente). Deja sin evaluar si no corresponde.</p>
                {['Comunicación','Trabajo en equipo','Adaptabilidad','Resolución de problemas','Seguridad y autocuidado'].map(c=><div className="sigma-competency-row" key={c}><span>{c}</span><select className="form-select form-select-sm" aria-label={`Puntaje de ${c}`} value={evalForm.competencias[c]||''} onChange={e=>setEvalForm(f=>({...f,competencias:{...f.competencias,[c]:Number(e.target.value)||0}}))}><option value="">Sin evaluar</option>{[1,2,3,4,5].map(n=><option value={n} key={n}>{n} / 5</option>)}</select></div>)}</div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Fecha de evaluación</label>
                    <input
                      className="form-control"
                      type="date"
                      value={evalForm.fechaEvaluacion}
                      onChange={(e) => setEvalForm((f) => ({ ...f, fechaEvaluacion: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Resultado general</label>
                    <select
                      className="form-select"
                      value={evalForm.resultado}
                      onChange={(e) => setEvalForm((f) => ({ ...f, resultado: e.target.value }))}
                    >
                      {RESULTADOS.map((r) => (
                        <option key={r} value={r}>
                          {r || '— Sin resultado —'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Estado de la evaluación</label>
                  <select
                    className="form-select"
                    value={evalForm.estado}
                    onChange={(e) => setEvalForm((f) => ({ ...f, estado: e.target.value }))}
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={evalForm.observaciones}
                    onChange={(e) => setEvalForm((f) => ({ ...f, observaciones: e.target.value }))}
                  />
                </div>
                <div className="mb-3"><label className="form-label">Recomendaciones y próximos pasos</label><textarea className="form-control" rows={3} value={evalForm.recomendaciones} onChange={e=>setEvalForm(f=>({...f,recomendaciones:e.target.value}))}/></div>
                <div className="mb-3 form-check"><input className="form-check-input" type="checkbox" id="eval-borrador" checked={evalForm.borrador} onChange={e=>setEvalForm(f=>({...f,borrador:e.target.checked}))}/><label className="form-check-label" htmlFor="eval-borrador">Guardar como borrador (no es un informe final)</label></div>
                <div className="sigma-eval-actions"><button className="btn btn-primary" type="submit">Guardar evaluación</button></div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
