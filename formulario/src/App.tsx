import { useState } from 'react'

const FAMILIAS = [
  { label: 'Administrativa', code: 'ADM' },
  { label: 'Operativa', code: 'OPE' },
  { label: 'Comercial', code: 'COM' },
  { label: 'Tecnológica', code: 'TEC' },
  { label: 'Gerencial', code: 'GER' },
]

const FLOW_URL =
  import.meta.env.VITE_FLOW_URL ??
  'https://prod-XX.westeurope.logic.azure.com/workflows/PON_TU_TRIGGER_URL'

type FormState = {
  nombreCandidato: string
  familiaCargo: string
  nombreCargo: string
  linkCV: string
  correoAnalista: string
  comentarios: string
}

type Status = 'idle' | 'sending' | 'ok' | 'error'

export default function App() {
  const [form, setForm] = useState<FormState>({
    nombreCandidato: '',
    familiaCargo: '',
    nombreCargo: '',
    linkCV: '',
    correoAnalista: '',
    comentarios: '',
  })
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isValidLink(form.linkCV)) {
      setStatus('idle')
      setErrorMsg('El enlace del CV debe ser una URL válida (https://...).')
      return
    }

    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await fetch(FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreCandidato: form.nombreCandidato.trim(),
          familiaCargo: form.familiaCargo,
          codigoFamilia: FAMILIAS.find((f) => f.label === form.familiaCargo)?.code ?? '',
          nombreCargo: form.nombreCargo.trim(),
          linkCV: form.linkCV.trim(),
          correoAnalista: form.correoAnalista.trim(),
          comentarios: form.comentarios.trim(),
        }),
      })

      if (res.ok) {
        setStatus('ok')
      } else {
        setStatus('error')
        setErrorMsg(`El flujo respondió con estado ${res.status}.`)
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg('No se pudo enviar la solicitud. Revisa la conexión e intenta de nuevo.')
    }
  }

  if (status === 'ok') {
    return (
      <div className="screen">
        <div className="card card--center">
          <h1>Solicitud enviada</h1>
          <p>La solicitud de evaluación psicolaboral fue registrada correctamente.</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Nueva solicitud
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <form className="card" onSubmit={onSubmit}>
        <h1>Solicitud de Evaluación Psicolaboral</h1>
        <p className="subtitle">Reclutamiento y Selección</p>

        <label>
          Nombre del candidato <span className="req">*</span>
          <input
            required
            value={form.nombreCandidato}
            onChange={(e) => update('nombreCandidato', e.target.value)}
            placeholder="Nombre y apellido"
          />
        </label>

        <label>
          Familia de cargo <span className="req">*</span>
          <select
            required
            value={form.familiaCargo}
            onChange={(e) => update('familiaCargo', e.target.value)}
          >
            <option value="" disabled>
              Selecciona una familia
            </option>
            {FAMILIAS.map((f) => (
              <option key={f.code} value={f.label}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Nombre del cargo <span className="req">*</span>
          <input
            required
            value={form.nombreCargo}
            onChange={(e) => update('nombreCargo', e.target.value)}
            placeholder="Ej. Analista Contable"
          />
        </label>

        <label>
          Enlace al CV (OneDrive/SharePoint) <span className="req">*</span>
          <input
            required
            type="url"
            value={form.linkCV}
            onChange={(e) => update('linkCV', e.target.value)}
            placeholder="https://..."
          />
          <small>
            Sube el CV a OneDrive/SharePoint, copia el enlace y pégalo aquí.
          </small>
        </label>

        <label>
          Correo del analista solicitante <span className="req">*</span>
          <input
            required
            type="email"
            value={form.correoAnalista}
            onChange={(e) => update('correoAnalista', e.target.value)}
            placeholder="nombre@empresa.com"
          />
        </label>

        <label>
          Comentarios / contexto
          <textarea
            rows={3}
            value={form.comentarios}
            onChange={(e) => update('comentarios', e.target.value)}
            placeholder="Información adicional (opcional)"
          />
        </label>

        {errorMsg && <p className="error">{errorMsg}</p>}

        <button className="btn" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  )
}

export function isValidLink(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}
