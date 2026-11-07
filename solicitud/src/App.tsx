import { useState, type FormEvent, type DragEvent } from 'react'
import { FAMILIAS, ORIGENES, SI_NO, UBICACIONES, UNIDADES } from './catalogs'
import logoAquaChile from './assets/logo_pag_inicio.png'

const FLOW_URL =
  (import.meta.env.VITE_FLOW_URL as string | undefined) ??
  'http://localhost:3001/api/solicitud'

type FormState = {
  reclutador: string
  nombreCandidato: string
  origen: string
  familiaCargo: string
  nombreCargo: string
  ubicacion: string
  unidad: string
  requiereReferencias: string
  ceco: string
  esReferido: string
  aspectos: string
}

const initialForm: FormState = {
  reclutador: '',
  nombreCandidato: '',
  origen: '',
  familiaCargo: '',
  nombreCargo: '',
  ubicacion: '',
  unidad: '',
  requiereReferencias: 'No',
  ceco: '',
  esReferido: 'No',
  aspectos: '',
}

type Status = 'idle' | 'sending' | 'ok' | 'error'

const EXTENSIONES = ['.pdf', '.doc', '.docx']
const MAX_BYTES = 10 * 1024 * 1024

function validarArchivo(file: File): string {
  const nombre = file.name.toLowerCase()
  if (!EXTENSIONES.some((ext) => nombre.endsWith(ext))) return `"${file.name}" no es PDF, DOC ni DOCX.`
  if (file.size > MAX_BYTES) return `"${file.name}" supera el máximo de 10 MB.`
  return ''
}

function FileUpload({
  id,
  title,
  description,
  file,
  required = false,
  onChange,
}: {
  id: string
  title: string
  description: string
  file: File | null
  required?: boolean
  onChange: (file: File | null) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  // El archivo vive en el estado de React (no en el <input>), así funciona igual
  // al arrastrarlo o al elegirlo con clic. Por eso el input no lleva `required`:
  // la obligatoriedad del CV la valida onSubmit.
  function elegir(selected: File | undefined) {
    if (!selected) return
    const msg = validarArchivo(selected)
    setError(msg)
    if (!msg) onChange(selected)
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragging(false)
    elegir(e.dataTransfer.files?.[0])
  }

  return (
    <div className="upload-field">
      <label
        htmlFor={id}
        className={`upload-zone${dragging ? ' upload-zone--dragging' : ''}${file ? ' upload-zone--selected' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="upload-icon" aria-hidden="true">
          {file ? '✓' : '↑'}
        </span>
        <span className="upload-copy">
          <strong>{file ? file.name : <>{title}{required && <span className="req"> *</span>}</>}</strong>
          <span>{file ? 'Archivo seleccionado · Haz clic para reemplazarlo' : description}</span>
        </span>
        <span className="upload-action">{file ? 'Cambiar' : 'Seleccionar archivo'}</span>
      </label>
      <input
        className="file-input"
        id={id}
        type="file"
        accept=".pdf,.doc,.docx"
        aria-required={required}
        onChange={(e) => {
          elegir(e.target.files?.[0])
          e.target.value = '' // permite volver a elegir el mismo archivo
        }}
      />
      {error && <p className="upload-error" role="alert">{error}</p>}
      {file && (
        <button className="remove-file" type="button" onClick={() => { setError(''); onChange(null) }}>
          Quitar archivo
        </button>
      )}
    </div>
  )
}

export default function App() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [descFile, setDescFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!cvFile) {
      setErrorMsg('Debes adjuntar el CV del candidato (PDF o DOCX).')
      return
    }

    setStatus('sending')

    try {
      if (FLOW_URL) {
        const data = new FormData()
        data.append('reclutador', form.reclutador.trim())
        data.append('nombreCandidato', form.nombreCandidato.trim())
        data.append('origen', form.origen)
        data.append('familiaCargo', form.familiaCargo)
        data.append('nombreCargo', form.nombreCargo.trim())
        data.append('ubicacion', form.ubicacion.trim())
        data.append('unidad', form.unidad.trim())
        data.append('requiereReferencias', form.requiereReferencias)
        data.append('ceco', form.ceco.trim())
        data.append('esReferido', form.esReferido)
        data.append('aspectos', form.aspectos.trim())
        data.append('cv', cvFile)
        if (descFile) data.append('descriptor', descFile)

        const res = await fetch(FLOW_URL, { method: 'POST', body: data })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `El servidor respondió con estado ${res.status}.`)
        }
      } else {
        await new Promise((r) => setTimeout(r, 600))
      }

      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setErrorMsg(
        err instanceof TypeError
          ? 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.'
          : err instanceof Error ? err.message : 'No se pudo enviar la solicitud.',
      )
    }
  }

  function reset() {
    setForm(initialForm)
    setCvFile(null)
    setDescFile(null)
    setStatus('idle')
    setErrorMsg('')
  }

  if (status === 'ok') {
    return (
      <main className="screen">
        <div className="success-card">
          <div className="success-mark" aria-hidden="true">✓</div>
          <span className="eyebrow">RECLUTAMIENTO Y SELECCIÓN</span>
          <h1>Solicitud enviada</h1>
          <p className="success-intro">
            La solicitud de evaluación psicolaboral fue registrada correctamente.
          </p>

          <div className="success-summary">
            <div><span>Candidato/a</span><strong>{form.nombreCandidato}</strong></div>
            <div><span>Origen</span><strong>{form.origen}</strong></div>
            <div><span>Cargo</span><strong>{form.nombreCargo}</strong></div>
            <div><span>Familia de cargo</span><strong>{form.familiaCargo}</strong></div>
            <div><span>Ubicación</span><strong>{form.ubicacion}</strong></div>
            <div><span>CV adjunto</span><strong>{cvFile?.name}</strong></div>
          </div>

          <button className="button button--primary button--full" onClick={reset}>
            Crear nueva solicitud <span aria-hidden="true">→</span>
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="screen">
      <div className="page-shell">
        <header className="topbar">
          <div className="brand">
            <img className="brand-logo" src={logoAquaChile} alt="AquaChile" />
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-area">PERSONAS</span>
          </div>
          <div className="topbar-context">
            <span className="context-dot" />
            Plataforma interna
          </div>
        </header>

        <div className="page-heading">
          <div>
            <span className="eyebrow">RECLUTAMIENTO Y SELECCIÓN</span>
            <h1>Solicitud de evaluación psicolaboral</h1>
            <p>Registra los antecedentes del candidato para iniciar su proceso de evaluación.</p>
          </div>
          <div className="heading-tag"><span className="tag-dot" /> Nueva solicitud</div>
        </div>

        <form className="form-card" onSubmit={onSubmit}>
          <div className="form-intro">
            <div>
              <h2>Antecedentes de la solicitud</h2>
              <p>Completa la información y adjunta los documentos correspondientes.</p>
            </div>
            <span className="required-note"><span className="req">*</span> Campos obligatorios</span>
          </div>

          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">01</span>
              <div><h3>Solicitante</h3><p>Información de quien inicia la solicitud.</p></div>
            </div>
            <div className="field-grid field-grid--single">
              <label className="field">
                <span>Reclutador/a <span className="req">*</span></span>
                <input
                  required
                  value={form.reclutador}
                  onChange={(e) => update('reclutador', e.target.value)}
                  placeholder="Nombre del analista que solicita"
                />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">02</span>
              <div><h3>Candidato/a</h3><p>Identificación y procedencia del postulante.</p></div>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Nombre del candidato/a <span className="req">*</span></span>
                <input
                  required
                  value={form.nombreCandidato}
                  onChange={(e) => update('nombreCandidato', e.target.value)}
                  placeholder="Nombre y apellido"
                />
              </label>
              <fieldset className="field">
                <legend>Origen del candidato/a <span className="req">*</span></legend>
                <div className="choice-group">
                  {ORIGENES.map((o) => (
                    <label key={o} className={`choice${form.origen === o ? ' choice--active' : ''}`}>
                      <input
                        type="radio"
                        name="origen"
                        required
                        checked={form.origen === o}
                        onChange={() => update('origen', o)}
                      />
                      <span className="choice-indicator" />
                      {o}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">03</span>
              <div><h3>Información del cargo</h3><p>Detalles de la posición a la que postula el candidato.</p></div>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Familia de cargo <span className="req">*</span></span>
                <select required value={form.familiaCargo} onChange={(e) => update('familiaCargo', e.target.value)}>
                  <option value="" disabled>Selecciona una familia</option>
                  {FAMILIAS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Nombre del cargo <span className="req">*</span></span>
                <input required value={form.nombreCargo} onChange={(e) => update('nombreCargo', e.target.value)} placeholder="Ej. Operador de Máquina" />
              </label>
              <label className="field">
                <span>Ubicación del cargo <span className="req">*</span></span>
                <input required list="ubicaciones" value={form.ubicacion} onChange={(e) => update('ubicacion', e.target.value)} placeholder="Planta, oficina o centro" />
                <datalist id="ubicaciones">{UBICACIONES.map((u) => <option key={u} value={u} />)}</datalist>
              </label>
              <label className="field">
                <span>Unidad</span>
                <input list="unidades" value={form.unidad} onChange={(e) => update('unidad', e.target.value)} placeholder="Ej. Industrial" />
                <datalist id="unidades">{UNIDADES.map((u) => <option key={u} value={u} />)}</datalist>
              </label>
              <label className="field">
                <span>CECO <span className="field-hint">(Centro de costos)</span></span>
                <input value={form.ceco} onChange={(e) => update('ceco', e.target.value)} placeholder="Ej. A170010301" />
              </label>
              <fieldset className="field">
                <legend>¿Requiere referencias? <span className="req">*</span></legend>
                <div className="choice-group">
                  {SI_NO.map((s) => (
                    <label key={s} className={`choice${form.requiereReferencias === s ? ' choice--active' : ''}`}>
                      <input type="radio" name="requiereReferencias" checked={form.requiereReferencias === s} onChange={() => update('requiereReferencias', s)} />
                      <span className="choice-indicator" />{s}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <span className="section-number">04</span>
              <div><h3>Documentación</h3><p>Adjunta los archivos necesarios para la evaluación.</p></div>
            </div>
            <div className="upload-grid">
              <FileUpload
                id="cv-upload"
                title="Currículum vitae (CV)"
                description="Arrastra el archivo aquí o selecciónalo desde tu equipo."
                file={cvFile}
                required
                onChange={setCvFile}
              />
              <FileUpload
                id="descriptor-upload"
                title="Descriptor del cargo"
                description="Documento complementario · Opcional."
                file={descFile}
                onChange={setDescFile}
              />
            </div>
            <p className="file-guidance">Formatos permitidos: PDF, DOC y DOCX.</p>
          </section>

          <section className="form-section form-section--last">
            <div className="section-heading">
              <span className="section-number">05</span>
              <div><h3>Información adicional</h3><p>Antecedentes que pueden orientar la entrevista psicolaboral.</p></div>
            </div>
            <div className="field-grid field-grid--single">
              <fieldset className="field">
                <legend>¿El candidato es referido?</legend>
                <div className="choice-group">
                  {SI_NO.map((s) => (
                    <label key={s} className={`choice${form.esReferido === s ? ' choice--active' : ''}`}>
                      <input type="radio" name="esReferido" checked={form.esReferido === s} onChange={() => update('esReferido', s)} />
                      <span className="choice-indicator" />{s}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                <span>Aspectos a indagar / comentarios</span>
                <textarea rows={4} value={form.aspectos} onChange={(e) => update('aspectos', e.target.value)} placeholder="Competencias o puntos que se recomienda profundizar durante la entrevista (opcional)." />
              </label>
            </div>
          </section>

          {errorMsg && (
            <div className="error-message" role="alert">
              <span aria-hidden="true">!</span>{errorMsg}
            </div>
          )}

          <footer className="form-footer">
            <p><span className="lock-mark" aria-hidden="true">▣</span> Verifica los antecedentes antes de enviar la solicitud.</p>
            <button className="button button--primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? <><span className="spinner" /> Enviando solicitud…</> : <>Enviar solicitud <span aria-hidden="true">→</span></>}
            </button>
          </footer>
        </form>

        <footer className="page-footer">
          <span>AquaChile · Reclutamiento y Selección</span>
          <span>Uso interno</span>
        </footer>
      </div>
    </main>
  )
}
