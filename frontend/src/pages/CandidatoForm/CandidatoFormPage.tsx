import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { api } from '../../api'
import { FAMILIAS } from '../../catalogs'
import { CARGOS_REFERENCIA } from '../../catalogoCargosReferencia'

const empty = {
  nombre: '',
  correo: '',
  telefono: '',
  cargo: '',
  familiaCargo: '',
}

export default function CandidatoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const origin = (location.state as {returnTo?:string;candidateFilters?:{q?:string;familia?:string}} | null)
  const backTo = origin?.returnTo === "/candidatos" || origin?.returnTo?.startsWith("/buscar") ? origin.returnTo : "/candidatos"
  const backState = origin?.candidateFilters ? {candidateFilters:origin.candidateFilters} : undefined
  const isEdit = Boolean(id)

  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [cargos, setCargos] = useState<{ cargo: string; familia: string }[]>([])
  const [cargoPersonalizado, setCargoPersonalizado] = useState(false)

  useEffect(() => {
    api.listCandidatos().then((items) => {
      const seen = new Set<string>()
      setCargos(items.filter((c) => {
        const key = c.cargo?.trim().toLocaleLowerCase('es')
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      }).map((c) => ({ cargo: c.cargo.trim(), familia: c.familia_cargo })))
    }).catch(() => { /* El campo manual sigue disponible si falla el catálogo. */ })
  }, [])

  const cargosDisponibles = useMemo(() => {
    const vistos = new Set<string>()
    return [...CARGOS_REFERENCIA, ...cargos].filter((item) => {
      if (item.familia !== form.familiaCargo) return false
      const clave = item.cargo.trim().toLocaleLowerCase('es')
      if (!clave || vistos.has(clave)) return false
      vistos.add(clave)
      return true
    }).sort((a, b) => a.cargo.localeCompare(b.cargo, 'es'))
  }, [cargos, form.familiaCargo])

  useEffect(() => {
    if (!id) return
    api.getCandidato(Number(id)).then((c) => {
      setCargoPersonalizado(!CARGOS_REFERENCIA.some((item) => item.cargo === c.cargo && item.familia === c.familia_cargo))
      setForm({
        nombre: c.nombre,
        correo: c.correo,
        telefono: c.telefono,
        cargo: c.cargo,
        familiaCargo: c.familia_cargo,
      })
    }).catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar candidato'))
  }, [id])

  function update<K extends keyof typeof empty>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await api.updateCandidato(Number(id), form)
      } else {
        await api.createCandidato(form)
      }
      navigate(backTo,{state:backState})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="sigma-form-heading">
        <div><span className="sigma-kicker">TALENTO Y SELECCIÓN / CANDIDATOS</span>
          <h1>{isEdit ? 'Editar candidato' : 'Registrar candidato'}</h1>
          <p>{isEdit ? 'Actualiza los antecedentes del perfil registrado.' : 'Completa los antecedentes para incorporar a una persona al proceso.'}</p>
        </div><span className="sigma-step">Ficha de candidato</span>
      </div>

      <form className="sigma-form-shell" onSubmit={onSubmit}>
        <div className="sigma-form-body">
          <div className="sigma-section-heading"><span className="sigma-section-number">01</span><div><h2>Información personal</h2><p>Datos básicos para identificar y contactar al candidato.</p></div></div>
          <div className="sigma-form-grid">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="sigma-field sigma-field-full">
            <label className="form-label">Nombre *</label>
            <input
              className="form-control"
              required
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
            />
          </div>
          <div className="sigma-field">
            <label className="form-label">Correo *</label>
            <input
              className="form-control"
              type="email"
              required
              value={form.correo}
              onChange={(e) => update('correo', e.target.value)}
            />
          </div>
          <div className="sigma-field">
            <label className="form-label">Teléfono</label>
            <input
              className="form-control"
              value={form.telefono}
              onChange={(e) => update('telefono', e.target.value)}
            />
          </div>
          </div>
          <div className="sigma-section-heading"><span className="sigma-section-number">02</span><div><h2>Perfil de postulación</h2><p>Define el cargo y su familia para clasificar el registro.</p></div></div>
          <div className="sigma-form-grid">
          <div className="sigma-field">
            <label className="form-label" htmlFor="sigma-familia-cargo">Familia de cargo *</label>
            <select
              id="sigma-familia-cargo"
              className="form-select"
              required
              value={form.familiaCargo}
              onChange={(e) => {
                setForm((actual) => ({ ...actual, familiaCargo: e.target.value, cargo: '' }))
                setCargoPersonalizado(false)
              }}
            >
              <option value="" disabled>Selecciona una familia</option>
              {FAMILIAS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <small className="sigma-cargo-hint">Primero selecciona la familia correspondiente.</small>
          </div>
          <div className="sigma-field">
            <label className="form-label" htmlFor="sigma-cargo-postulacion">Cargo al que postula *</label>
            {cargoPersonalizado ? (
              <input
                id="sigma-cargo-postulacion"
                className="form-control"
                required
                disabled={!form.familiaCargo}
                value={form.cargo}
                onChange={(e) => update('cargo', e.target.value)}
                placeholder="Escribe el cargo al que postula"
              />
            ) : (
              <select
                id="sigma-cargo-postulacion"
                className="form-select"
                required
                disabled={!form.familiaCargo}
                value={form.cargo}
                onChange={(e) => update('cargo', e.target.value)}
              >
                <option value="" disabled>{form.familiaCargo ? 'Selecciona un cargo' : 'Selecciona primero una familia'}</option>
                {form.cargo && !cargosDisponibles.some((item) => item.cargo === form.cargo) && <option value={form.cargo}>{form.cargo} (actual)</option>}
                {cargosDisponibles.map((item) => <option key={item.cargo} value={item.cargo}>{item.cargo}</option>)}
              </select>
            )}
            <label className="sigma-cargo-custom-option">
              <input
                type="checkbox"
                checked={cargoPersonalizado}
                onChange={(e) => { setCargoPersonalizado(e.target.checked); update('cargo', '') }}
              />
              <span>Mi cargo no aparece en la lista</span>
            </label>
            <small className="sigma-cargo-hint">Catálogo de referencia, no listado oficial de AquaChile. También incluye cargos registrados en SIGMA-Aqua.</small>
          </div>

          </div>
          <div className="sigma-form-actions"><span>Los campos con * son obligatorios.</span><div className="d-flex gap-2">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button className="btn btn-outline-secondary" type="button" onClick={() => navigate(backTo,{state:backState})}>
              Cancelar
            </button>
          </div></div>
        </div>
      </form>
    </>
  )
}
