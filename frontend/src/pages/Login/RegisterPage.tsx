import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import logoVentisqueros from '../../assets/chile_ventisqueros.jpg'
import logoPagInicio from '../../assets/logo_pag_inicio.png'
import './register.css'

const roles = ['Analista', 'Evaluador']

export default function RegisterPage() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState<'registro' | 'verificacion'>('registro')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [rol, setRol] = useState('Analista')
  const [codigo, setCodigo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const pageStyle: CSSProperties = {
    minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr',
  }

  async function enviarRegistro(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMensaje('')
    if (contrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (contrasena !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setCargando(true)
    try {
      const respuesta = await api.registro({ nombre: nombre.trim(), correo: correo.trim().toLowerCase(), contrasena, rol })
      setMensaje(respuesta.mensaje)
      setPaso('verificacion')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el registro.')
    } finally {
      setCargando(false)
    }
  }

  async function verificarCuenta(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMensaje('')
    if (!/^\d{6}$/.test(codigo)) {
      setError('Ingresa el código de 6 dígitos.')
      return
    }
    setCargando(true)
    try {
      const respuesta = await api.verificar(correo.trim().toLowerCase(), codigo)
      setMensaje(respuesta.mensaje)
      window.setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar la cuenta.')
    } finally {
      setCargando(false)
    }
  }

  async function reenviarCodigo() {
    setError('')
    setMensaje('')
    setCargando(true)
    try {
      const respuesta = await api.reenviarCodigo(correo.trim().toLowerCase())
      setMensaje(respuesta.mensaje)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el código.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="register-page" style={pageStyle}>
      <section className="register-image" aria-hidden="true">
        <img src={logoVentisqueros} alt="" />
        <div className="register-image-overlay" />
        <img className="register-brand" src={logoPagInicio} alt="" />
      </section>
      <section className="register-panel">
        <div className="register-card">
          {paso === 'registro' ? (
            <>
              <h1>Crear cuenta</h1>
              <p className="register-subtitle">Regístrate en AquaChile</p>
              <form onSubmit={enviarRegistro}>
                <label htmlFor="registro-nombre">Nombre completo</label>
                <input id="registro-nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" required maxLength={100} />
                <label htmlFor="registro-correo">Correo electrónico</label>
                <input id="registro-correo" type="email" value={correo} onChange={e => setCorreo(e.target.value)} autoComplete="email" required maxLength={150} />
                <label htmlFor="registro-rol">Rol</label>
                <select id="registro-rol" value={rol} onChange={e => setRol(e.target.value)}>
                  {roles.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <p className="register-role-hint">Los roles de Jefatura y Administrador se asignan únicamente mediante autorización administrativa.</p>
                <label htmlFor="registro-contrasena">Contraseña</label>
                <input id="registro-contrasena" type="password" value={contrasena} onChange={e => setContrasena(e.target.value)} autoComplete="new-password" required minLength={8} />
                <label htmlFor="registro-confirmar">Confirmar contraseña</label>
                <input id="registro-confirmar" type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" required minLength={8} />
                {error && <p className="register-alert register-error" role="alert">{error}</p>}
                <button className="register-submit" type="submit" disabled={cargando}>{cargando ? 'Enviando...' : 'Crear cuenta'}</button>
              </form>
              <p className="register-footer">¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link></p>
            </>
          ) : (
            <>
              <h1>Verifica tu correo</h1>
              <p className="register-subtitle">Enviamos un código de 6 dígitos a {correo}. Revisa tu bandeja de entrada y spam.</p>
              <form onSubmit={verificarCuenta}>
                <label htmlFor="registro-codigo">Código de verificación</label>
                <input id="registro-codigo" className="register-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
                {error && <p className="register-alert register-error" role="alert">{error}</p>}
                {mensaje && <p className="register-alert register-success" role="status">{mensaje}</p>}
                <button className="register-submit" type="submit" disabled={cargando}>{cargando ? 'Verificando...' : 'Verificar cuenta'}</button>
              </form>
              <button className="register-resend" type="button" onClick={reenviarCodigo} disabled={cargando}>Reenviar código</button>
              <p className="register-footer"><Link to="/login">Volver al inicio de sesión</Link></p>
            </>
          )}
          {paso === 'registro' && mensaje && <p className="register-alert register-success" role="status">{mensaje}</p>}
        </div>
      </section>
    </main>
  )
}
