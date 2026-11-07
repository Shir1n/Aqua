import { useEffect, useState, type FormEvent } from 'react'
import { api, type UsuarioAdmin, type Auditoria } from '../../api'
import { useAuth } from '../../AuthContext'
import './extra.css'

const roles = ['Analista', 'Evaluador', 'Jefatura', 'Administrador']
const esAdminPrincipal = (correo: string) => correo.trim().toLowerCase() === 'admin@aqua.test'
const mensajeError = (e: unknown) => (e instanceof Error ? e.message : String(e))

function generarClave() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(14))
  return Array.from(bytes, b => alfabeto[b % alfabeto.length]).join('')
}

const nuevoVacio = { nombre: '', correo: '', rol: 'Analista', contrasena: '' }

export default function UsuariosPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UsuarioAdmin[]>([])
  const [logs, setLogs] = useState<Auditoria[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [nuevo, setNuevo] = useState(nuevoVacio)
  const [claveDe, setClaveDe] = useState<UsuarioAdmin | null>(null)
  const [clave, setClave] = useState('')

  async function load() {
    try {
      const [u, a] = await Promise.all([api.adminUsuarios(), api.adminAuditoria()])
      setUsers(u)
      setLogs(a)
    } catch (e) {
      setError(mensajeError(e))
    }
  }
  useEffect(() => { void load() }, [])

  function avisar(ok: string) { setError(''); setMessage(ok) }

  async function update(id: number, body: { rol?: string; activo?: boolean }) {
    if (!confirm('¿Confirmar el cambio? Se cerrarán las sesiones del usuario.')) return
    try { avisar((await api.adminActualizar(id, body)).mensaje); await load() } catch (e) { setError(mensajeError(e)) }
  }

  async function crear(e: FormEvent) {
    e.preventDefault()
    try {
      const r = await api.adminCrearUsuario({ ...nuevo, nombre: nuevo.nombre.trim(), correo: nuevo.correo.trim() })
      avisar(`${r.mensaje}. Entrega la contraseña a ${nuevo.correo.trim()} por un canal seguro.`)
      setNuevo(nuevoVacio)
      await load()
    } catch (e) { setError(mensajeError(e)) }
  }

  async function restablecer(e: FormEvent) {
    e.preventDefault()
    if (!claveDe) return
    try {
      avisar((await api.adminRestablecerClave(claveDe.id, clave)).mensaje)
      setClaveDe(null)
      setClave('')
      await load()
    } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <section className="x-page">
      <header className="x-header">
        <div>
          <small>CONTROL DE ACCESO</small>
          <h1>Administración de usuarios</h1>
          <p>Crea cuentas con contraseña, asigna roles, controla accesos y revisa acciones administrativas.</p>
        </div>
      </header>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <article className="x-card">
        <h2>Nuevo usuario</h2>
        <form className="x-form" onSubmit={crear} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>
          <label>Nombre<input className="form-control" required minLength={2} maxLength={100} value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} /></label>
          <label>Correo<input className="form-control" type="email" required value={nuevo.correo} onChange={e => setNuevo({ ...nuevo, correo: e.target.value })} /></label>
          <label>Rol<select className="form-select" value={nuevo.rol} onChange={e => setNuevo({ ...nuevo, rol: e.target.value })}>{roles.map(r => <option key={r}>{r}</option>)}</select></label>
          <label>Contraseña (mín. 12)
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-control" type="text" required minLength={12} maxLength={128} autoComplete="new-password" value={nuevo.contrasena} onChange={e => setNuevo({ ...nuevo, contrasena: e.target.value })} />
              <button type="button" className="x-secondary" onClick={() => setNuevo({ ...nuevo, contrasena: generarClave() })}>Generar</button>
            </div>
          </label>
          <button type="submit" className="x-primary">Crear usuario</button>
        </form>
      </article>

      <article className="x-card" style={{ marginTop: 16 }}>
        <h2>Usuarios del sistema</h2>
        <div className="x-table-wrap">
          <table className="table">
            <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acción</th><th>Contraseña</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.nombre}</strong></td>
                  <td>{u.correo}</td>
                  <td>
                    {esAdminPrincipal(u.correo)
                      ? <span className="x-protected-role">Administrador <span aria-label="Cuenta protegida" title="Cuenta principal protegida">🔒</span></span>
                      : <select aria-label={`Rol de ${u.nombre}`} value={u.rol} onChange={e => update(u.id, { rol: e.target.value })} disabled={u.id === user?.id}>{roles.map(r => <option key={r}>{r}</option>)}</select>}
                  </td>
                  <td>{u.activo ? 'Activo' : 'Desactivado'}</td>
                  <td>
                    {esAdminPrincipal(u.correo)
                      ? <span className="x-protected-label" title="La cuenta principal no se puede desactivar">Protegido</span>
                      : <button className={`x-secondary x-user-action ${u.activo ? 'x-user-deactivate' : 'x-user-activate'}`} disabled={u.id === user?.id} onClick={() => update(u.id, { activo: !u.activo })}>{u.activo ? 'Desactivar' : 'Activar'}</button>}
                  </td>
                  <td>
                    <button className="x-secondary" disabled={u.id === user?.id} title={u.id === user?.id ? 'Cambia tu propia contraseña desde tu perfil' : undefined} onClick={() => { setClaveDe(u); setClave('') }}>Restablecer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {claveDe && (
          <form onSubmit={restablecer} style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>Nueva contraseña para <strong>{claveDe.correo}</strong>:</span>
            <input className="form-control" style={{ maxWidth: 260 }} type="text" required minLength={12} maxLength={128} autoComplete="new-password" aria-label="Nueva contraseña" value={clave} onChange={e => setClave(e.target.value)} />
            <button type="button" className="x-secondary" onClick={() => setClave(generarClave())}>Generar</button>
            <button type="submit" className="x-primary">Guardar</button>
            <button type="button" className="x-secondary" onClick={() => setClaveDe(null)}>Cancelar</button>
          </form>
        )}
      </article>

      <article className="x-card" style={{ marginTop: 16 }}>
        <h2>Auditoría administrativa</h2>
        {logs.map(x => <div className="x-list-row" key={x.id}><div><strong>{x.accion}</strong><small>{x.usuario_nombre || 'Sistema'} · {new Date(x.creado_en).toLocaleString('es-CL')} · {x.detalle}</small></div></div>)}
        {!logs.length && <p>Sin acciones registradas.</p>}
      </article>
    </section>
  )
}
