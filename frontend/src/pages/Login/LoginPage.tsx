import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { api } from '../../api'
import logoVentisqueros from '../../assets/chile_ventisqueros.jpg'
import logoPagInicio from '../../assets/logo_pag_inicio.png'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [recordarme, setRecordarme] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')

  const pageStyle: CSSProperties = {
    minHeight: '100vh',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
  }

  const leftStyle: CSSProperties = {
    background: '#06324b',
    overflow: 'hidden',
    position: 'relative',
  }

  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  }

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(165deg, rgba(2, 27, 47, .43), rgba(2, 38, 60, .27) 48%, rgba(2, 25, 44, .84))',
  }

  const logoStyle: CSSProperties = {
    position: 'absolute',
    top: 32,
    left: 32,
    width: 'min(260px, 32%)',
    height: 'auto',
    filter: 'brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.45))',
  }

  const rightStyle: CSSProperties = {
    background: 'linear-gradient(155deg, #0b2d45 0%, #133f59 54%, #0c344d 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  }

  const cardStyle: CSSProperties = {
    width: 'min(500px, 100%)',
    padding: 40,
    background: '#ffffff',
    borderRadius: 10,
    boxShadow: '0 22px 50px rgba(0, 0, 0, 0.28)',
    position: 'relative',
    zIndex: 1,
  }

  const titleStyle: CSSProperties = {
    margin: 0,
    color: '#344451',
    fontFamily: 'Calibri, sans-serif',
    fontSize: 34,
    fontWeight: 800,
    textAlign: 'center',
  }

  const subtitleStyle: CSSProperties = {
    margin: '6px 0 0',
    color: '#344451',
    fontSize: 17,
    textAlign: 'center',
  }

  const fieldStyle: CSSProperties = {
    marginTop: 24,
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    marginBottom: 7,
    color: '#344451',
    fontSize: 18,
    fontWeight: 600,
  }

  const inputCss = `
    .aqua-login { font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .aqua-login-visual { isolation: isolate; min-height: 100vh; }
    .aqua-login-photo { animation: aqua-photo-drift 24s ease-in-out infinite alternate; transform-origin: center; will-change: transform; }
    .aqua-login-glow { position: absolute; inset: -15%; pointer-events: none; background: radial-gradient(ellipse at 65% 35%, rgba(86, 204, 226, .20), transparent 48%); animation: aqua-glow-drift 14s ease-in-out infinite alternate; }
    .aqua-login-wave { position: absolute; width: 160%; height: 28%; left: -30%; bottom: -13%; border-radius: 48% 52% 0 0 / 75% 70% 0 0; pointer-events: none; }
    .aqua-login-wave-one { background: rgba(18, 145, 177, .34); animation: aqua-wave-sway 10s ease-in-out infinite alternate; }
    .aqua-login-wave-two { bottom: -18%; background: rgba(4, 63, 94, .62); animation: aqua-wave-sway 13s ease-in-out infinite alternate-reverse; }
    .aqua-login-caption { position: absolute; left: clamp(24px, 5vw, 72px); right: 24px; bottom: 12%; color: white; z-index: 2; text-shadow: 0 2px 16px rgba(0,0,0,.35); }
    .aqua-login-caption h2 { font-size: clamp(28px, 3.2vw, 48px); line-height: 1.12; font-weight: 750; letter-spacing: -.035em; margin: 0 0 14px; }
    .aqua-login-caption p { max-width: 440px; color: #d6edf4; font-size: clamp(13px, 1.2vw, 16px); line-height: 1.6; margin: 0; }
    .aqua-login-tag { display: inline-block; margin-bottom: 18px; font-size: 11px; font-weight: 800; letter-spacing: .19em; color: #9be4ed; }
    .aqua-login-card { animation: aqua-card-enter .75s ease-out both; }
    @keyframes aqua-photo-drift { from { transform: scale(1.09) translate3d(-1.4%, 0, 0); } to { transform: scale(1.2) translate3d(1.5%, -1.3%, 0); } }
    @keyframes aqua-glow-drift { from { transform: translate(-5%, 2%); opacity: .55; } to { transform: translate(8%, -5%); opacity: 1; } }
    @keyframes aqua-wave-sway { from { transform: translateX(-3%) rotate(-2deg); } to { transform: translateX(4%) rotate(2deg); } }
    @keyframes aqua-card-enter { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 850px) {
      .aqua-login { grid-template-columns: 1fr !important; }
      .aqua-login-visual { min-height: 250px; height: 34vh; max-height: 380px; }
      .aqua-login-caption { bottom: 18%; }
      .aqua-login-caption h2 { font-size: 28px; }
      .aqua-login-caption p { display: none; }
      .aqua-login-form-side { min-height: 66vh; padding: 30px 18px !important; }
      .aqua-login-card { padding: 30px 24px !important; }
    }
    @media (prefers-reduced-motion: reduce) { .aqua-login-photo, .aqua-login-glow, .aqua-login-wave, .aqua-login-card { animation: none !important; } }

    .login-input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #D1D5DB;
      border-radius: 10px;
      background: #F8FAFC;
      color: #1a2530;
      font-size: 14px;
      outline: none;
      transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease;
    }
    .login-input:hover { border-color: #9CA3AF; }
    .login-input:focus {
      border-color: #344451;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(52, 68, 81, 0.2);
    }
  `

  const passwordWrapStyle: CSSProperties = {
    position: 'relative',
  }

  const eyeButtonStyle: CSSProperties = {
    position: 'absolute',
    top: '50%',
    right: 6,
    transform: 'translateY(-50%)',
    display: 'grid',
    placeItems: 'center',
    width: 34,
    height: 34,
    border: 'none',
    background: 'transparent',
    color: '#85919c',
    cursor: 'pointer',
  }

  const forgotStyle: CSSProperties = {
    marginTop: 18,
    textAlign: 'center',
    color: '#344451',
    fontSize: 16,
    cursor: 'pointer',
    textDecoration: 'underline',
  }

  const rememberStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    color: '#344451',
    fontSize: 16,
  }

  const checkboxStyle: CSSProperties = {
    width: 16,
    height: 16,
    accentColor: '#344451',
    cursor: 'pointer',
  }

  const buttonStyle: CSSProperties = {
    display: 'block',
    margin: '28px auto 0',
    padding: '12px 34px',
    border: 'none',
    borderRadius: 6,
    background: '#344451',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!usuario.trim() || !contrasena.trim()) {
      setErrorLogin('Por favor, completa el usuario y la contraseña')
      return
    }

    setErrorLogin('')
    try { const u = await api.login(usuario.trim(), contrasena); login(u); navigate('/') } catch (err) { setErrorLogin(err instanceof Error ? err.message : 'No se pudo iniciar sesión') }
  }

  return (
    <main className="aqua-login" style={pageStyle}>
      <style>{inputCss}</style>
      <section className="aqua-login-visual" style={leftStyle}>
        <img className="aqua-login-photo" src={logoVentisqueros} alt="Paisaje del sur de Chile asociado a la acuicultura" style={imgStyle} />
        <div style={overlayStyle} />
        <div className="aqua-login-glow" aria-hidden="true" />
        <div className="aqua-login-wave aqua-login-wave-one" aria-hidden="true" />
        <div className="aqua-login-wave aqua-login-wave-two" aria-hidden="true" />
        <img src={logoPagInicio} alt="Logo" style={logoStyle} />
        <div className="aqua-login-caption">
          <span className="aqua-login-tag">SIGMA · AQUA</span>
          <h2>Conectados con el mar.<br />Comprometidos con las personas.</h2>
          <p>Gestión inteligente de solicitudes y evaluaciones para un futuro más conectado.</p>
        </div>
      </section>

      <section className="aqua-login-form-side" style={rightStyle}>
        <div className="aqua-login-card" style={cardStyle}>
          <h1 style={titleStyle}>¡Bienvenido!</h1>
          <p style={subtitleStyle}>Ingresa tus credenciales</p>

          <form onSubmit={handleSubmit}>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="usuario">
                Correo
              </label>
              <input
                id="usuario"
                type="text"
                className="login-input"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value)
                  if (errorLogin) setErrorLogin('')
                }}
                autoComplete="username"
                required
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="contrasena">
                Contraseña
              </label>
              <div style={passwordWrapStyle}>
                <input
                  id="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  className="login-input"
                  style={{ paddingRight: 46 }}
                  value={contrasena}
                  onChange={(e) => {
                    setContrasena(e.target.value)
                    if (errorLogin) setErrorLogin('')
                  }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  style={eyeButtonStyle}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setMostrarContrasena((v) => !v)}
                >
                  {mostrarContrasena ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {errorLogin && (
              <p
                role="alert"
                style={{
                  margin: '16px 0 0',
                  color: '#B91C1C',
                  fontSize: 14,
                  textAlign: 'center',
                }}
              >
                {errorLogin}
              </p>
            )}

            <div style={forgotStyle}>¿Olvidaste tu contraseña?</div>

            <label style={rememberStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
              />
              Recordarme
            </label>

            <button type="submit" style={buttonStyle}>
              Ingresar
            </button>
            <p style={{ margin: '18px 0 0', textAlign: 'center', color: '#344451', fontSize: 14 }}>
              ¿No tienes una cuenta? <Link to="/register" style={{ color: '#344451', fontWeight: 700 }}>Regístrate</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}
