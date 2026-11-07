import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { ESTADOS, FAMILIAS } from '../../catalogs'
import type { Candidato, Usuario } from '../../types'

export default function SolicitudForm() {
  const navigate = useNavigate()
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [evaluadores, setEvaluadores] = useState<Usuario[]>([])
  const [form, setForm] = useState({
    candidatoId: '',
    cargo: '',
    familiaCargo: '',
    fechaSolicitud: new Date().toISOString().slice(0, 10),
    estado: 'Pendiente',
    responsableId: '',
    observaciones: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.listCandidatos().then(setCandidatos).catch(() => setError('No se pudieron cargar los candidatos'))
    api
      .getUsuarios()
      .then((us) => setEvaluadores(us.filter((u) => u.rol === 'Evaluador')))
      .catch(() => {})
  }, [])

  function onCandidatoChange(id: string) {
    const c = candidatos.find((x) => String(x.id) === id)
    setForm((f) => ({
      ...f,
      candidatoId: id,
      cargo: c ? c.cargo : f.cargo,
      familiaCargo: c ? c.familia_cargo : f.familiaCargo,
    }))
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createSolicitud({
        candidatoId: Number(form.candidatoId),
        cargo: form.cargo,
        familiaCargo: form.familiaCargo,
        fechaSolicitud: form.fechaSolicitud,
        estado: form.estado,
        responsableId: form.responsableId ? Number(form.responsableId) : null,
        observaciones: form.observaciones,
      })
      navigate('/solicitudes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="sigma-form-heading"><div><span className="sigma-kicker">GESTIÓN DEL PROCESO / SOLICITUDES</span><h1>Nueva solicitud</h1><p>Asocia un candidato, configura la evaluación y registra los detalles.</p></div><span className="sigma-step">Nueva evaluación</span></div>

      <form className="sigma-form-shell" onSubmit={onSubmit}>
        <div className="sigma-form-body">
          <div className="sigma-section-heading"><span className="sigma-section-number">01</span><div><h2>Candidato y cargo</h2><p>Al elegir un candidato, el cargo y la familia se completan automáticamente.</p></div></div>
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="sigma-field sigma-field-full">
            <label className="form-label">Candidato *</label>
            <select
              className="form-select"
              required
              value={form.candidatoId}
              onChange={(e) => onCandidatoChange(e.target.value)}
            >
              <option value="" disabled>
                Selecciona un candidato
              </option>
              {candidatos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} — {c.cargo}
                </option>
              ))}
            </select>
          </div>
          <div className="row sigma-form-row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Cargo *</label>
              <input
                className="form-control"
                required
                value={form.cargo}
                onChange={(e) => update('cargo', e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Familia de cargo *</label>
              <select
                className="form-select"
                required
                value={form.familiaCargo}
                onChange={(e) => update('familiaCargo', e.target.value)}
              >
                <option value="" disabled>
                  Selecciona una familia
                </option>
                {FAMILIAS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="sigma-section-heading"><span className="sigma-section-number">02</span><div><h2>Planificación</h2><p>Define la fecha, el evaluador y el estado inicial.</p></div></div>
          <div className="row sigma-form-row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Fecha de solicitud</label>
              <input
                className="form-control"
                type="date"
                value={form.fechaSolicitud}
                onChange={(e) => update('fechaSolicitud', e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Responsable (evaluador)</label>
              <select
                className="form-select"
                value={form.responsableId}
                onChange={(e) => update('responsableId', e.target.value)}
              >
                <option value="">Sin asignar</option>
                {evaluadores.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Estado</label>
            <select className="form-select" value={form.estado} onChange={(e) => update('estado', e.target.value)}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="sigma-section-heading"><span className="sigma-section-number">03</span><div><h2>Notas adicionales</h2><p>Información relevante para quien gestione la evaluación.</p></div></div>
          <div className="mb-4">
            <label className="form-label">Observaciones</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.observaciones}
              onChange={(e) => update('observaciones', e.target.value)}
            />
          </div>

          <div className="sigma-form-actions"><span>Los campos con * son obligatorios.</span><div className="d-flex gap-2">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear solicitud'}
            </button>
            <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/solicitudes')}>
              Cancelar
            </button>
          </div></div>
        </div>
      </form>
    </>
  )
}
