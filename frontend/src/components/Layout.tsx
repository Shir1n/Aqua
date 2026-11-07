import '../styles/sigma-sidebar45.css'
import '../styles/sigma-global-back.css'
import aquaChileLogo from '../assets/logo_pag_inicio.png'
import '../pages/Extra/sigma43.css'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Notificaciones from './Notificaciones'
import { api } from '../api'
import type { Candidato, Solicitud } from '../types'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `side-nav-link${isActive ? ' active' : ''}`

function Icon({ name }: { name: 'dashboard' | 'users' | 'requests' | 'calendar' | 'statistics' | 'settings' | 'logout' | 'kanban' | 'tools' }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (name === 'dashboard') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
  if (name === 'users') return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M17 11a4 4 0 0 0 0-8" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></svg>
  if (name === 'requests') return <svg {...common}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>
  if (name === 'kanban') return <svg {...common}><rect x="2" y="3" width="6" height="18" rx="1"/><rect x="10" y="3" width="6" height="12" rx="1"/><rect x="18" y="3" width="4" height="16" rx="1"/></svg>
  if (name === 'tools') return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="12" r="2"/></svg>
  if (name === 'calendar') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /><path d="M8 14h3M8 17h3M15 14h2" /></svg>
  if (name === 'statistics') return <svg {...common}><path d="M4 20V12M10 20V5M16 20v-9M22 20V8" /><path d="M2 20h22" /></svg>
  if (name === 'settings') return <svg {...common}><path d="M10.5 2.8h3l.6 2.1a7.8 7.8 0 0 1 1.7.9l2.1-.6 2.1 2.1-.7 2.1c.4.5.7 1.1.9 1.7l2.1.6v3l-2.1.6a7.8 7.8 0 0 1-.9 1.7l.7 2.1-2.1 2.1-2.1-.7a7.8 7.8 0 0 1-1.7.9l-.6 2.1h-3l-.6-2.1a7.8 7.8 0 0 1-1.7-.9l-2.1.7-2.1-2.1.7-2.1a7.8 7.8 0 0 1-.9-1.7l-2.1-.6v-3l2.1-.6a7.8 7.8 0 0 1 .9-1.7l-.7-2.1 2.1-2.1 2.1.6a7.8 7.8 0 0 1 1.7-.9z" transform="translate(1 0) scale(.92)" /><circle cx="12" cy="12" r="3" /></svg>
  return <svg {...common}><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 3v18" /></svg>
}

export default function Layout() {
  const { user, logout, updateProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => {
    // React Router mantiene el índice de las entradas internas de la aplicación.
    // Evita salir de SIGMA-Aqua si se abrió un enlace directo.
    const index = window.history.state?.idx
    if (typeof index === 'number' && index > 0) navigate(-1)
    else if (location.pathname !== '/') navigate('/')
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (((e.ctrlKey || e.metaKey) && key === 'k') || ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'f')) {
        e.preventDefault()
        e.stopPropagation()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchCandidates, setSearchCandidates] = useState<Candidato[]>([])
  const [searchRequests, setSearchRequests] = useState<Solicitud[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (searchOpen) searchInputRef.current?.focus() }, [searchOpen])
  useEffect(() => {
    if (!searchOpen) return
    let active = true
    const timer = window.setTimeout(() => {
      setSearchLoading(true); setSearchError('')
      Promise.all([api.listCandidatos(searchQuery), api.listSolicitudes({ q: searchQuery })])
        .then(([c, r]) => { if (active) { setSearchCandidates(c); setSearchRequests(r) } })
        .catch((error: Error) => { if (active) setSearchError(error.message || 'No se pudo buscar') })
        .finally(() => { if (active) setSearchLoading(false) })
    }, 200)
    return () => { active = false; window.clearTimeout(timer) }
  }, [searchOpen, searchQuery])
  useEffect(() => {
    if (!searchOpen) return
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setSearchOpen(false) } }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [searchOpen])
  const openSearchResult = (url: string) => { setSearchOpen(false); setSearchQuery(''); navigate(url) }
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [panel, setPanel] = useState<'perfil' | 'clave' | 'apariencia' | 'preferencias' | 'actividad' | null>(null)
  const [profileName, setProfileName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [activity, setActivity] = useState<Array<{accion:string; detalle:string; creado_en:string}>>([])
  const [notifyPreference, setNotifyPreference] = useState(() => localStorage.getItem('sigma.notify.preference') !== 'off')
  const profileRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('aqua-theme') === 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('aqua-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    function outside(event: MouseEvent) {
      if (profileOpen && !profileRef.current?.contains(event.target as Node) && !profileButtonRef.current?.contains(event.target as Node)) setProfileOpen(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setProfileOpen(false); setPanel(null) }
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape) }
  }, [profileOpen])

  function openPanel(next: typeof panel) {
    setProfileOpen(false)
    setFeedback('')
    setPanel(next)
    setProfileName(user?.nombre ?? '')
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    if (next === 'actividad') {
      const token = localStorage.getItem('aqua.token') || ''
      fetch('/api/auth/mi-actividad', {headers:{Authorization:`Bearer ${token}`}})
        .then(async r => {if (!r.ok) throw new Error('No se pudo consultar la actividad'); return r.json()})
        .then(setActivity).catch(e => setFeedback(e.message))
    }
  }

  async function savePanel() {
    if (panel !== 'perfil' && panel !== 'clave') return
    if (panel === 'clave' && newPassword !== confirmPassword) {setFeedback('Las contraseñas no coinciden'); return}
    setSaving(true); setFeedback('')
    try {
      const token = localStorage.getItem('aqua.token') || ''
      const response = await fetch(panel === 'perfil' ? '/api/auth/perfil' : '/api/auth/cambiar-clave', {
        method: panel === 'perfil' ? 'PATCH' : 'POST',
        headers: {'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify(panel === 'perfil' ? {nombre:profileName} : {actual:currentPassword,nueva:newPassword})
      })
      const result = await response.json().catch(()=>({}))
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar')
      if (panel === 'perfil') updateProfile(result.nombre)
      else {setCurrentPassword('');setNewPassword('');setConfirmPassword('')}
      setFeedback('Cambios guardados correctamente')
    } catch (e) {setFeedback(e instanceof Error ? e.message : 'Error al guardar')}
    finally {setSaving(false)}
  }

  function onLogout() {
    setProfileOpen(false); setPanel(null)
    logout()
    navigate('/login')
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className={`app-shell${expanded ? '' : ' sidebar-collapsed'}`}>
      <aside
        className={`app-sidebar${menuOpen ? ' mobile-open' : ''}${expanded ? '' : ' collapsed'}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="sidebar-top">
          <Link className="sidebar-brand" to="/" onClick={closeMenu}>
            <span className="sidebar-brand-mark s45-logo"><img src={aquaChileLogo} alt="AquaChile" /></span>
            <span>
              <strong>SIGMA-Aqua</strong>
              <small>Gestión Psicolaboral</small>
            </span>
          </Link>
        </div>

        <div className="sidebar-section-title">MENÚ PRINCIPAL</div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          <NavLink className={navLinkClass} to="/" end onClick={closeMenu}>
            <Icon name="dashboard" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink className={navLinkClass} to="/candidatos" onClick={closeMenu}>
            <Icon name="users" />
            <span>Candidatos</span>
          </NavLink>
          <NavLink className={navLinkClass} to="/solicitudes" onClick={closeMenu}>
            <Icon name="requests" />
            <span>Solicitudes</span>
          </NavLink>
          <NavLink className={navLinkClass} to="/kanban" onClick={closeMenu}><Icon name="kanban" /><span>Tablero Kanban</span></NavLink>
          <NavLink className={navLinkClass} to="/herramientas" onClick={closeMenu}><Icon name="tools" /><span>Herramientas</span></NavLink>
          <NavLink className={navLinkClass} to="/agenda" onClick={closeMenu}><Icon name="calendar" /><span>Calendario</span></NavLink>
          <NavLink className={navLinkClass} to="/estadisticas" onClick={closeMenu}><Icon name="statistics" /><span>Estadísticas</span></NavLink>
          {user?.rol === 'Administrador' && <NavLink className={navLinkClass} to="/usuarios" onClick={closeMenu}><Icon name="settings" /><span>Usuarios</span></NavLink>}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user s45-user">
            <div className="sidebar-avatar">
              {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="sidebar-user-text">
              <strong>{user?.nombre}</strong>
              <span>{user?.rol}</span>
            </div>
          </div>


        </div>
      </aside>

      {menuOpen && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={closeMenu} />}

      <div className="app-content">
        <header className="app-topbar">
          <button
            className="mobile-menu-button"
            type="button"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>
          <button className="sigma-global-back" type="button" onClick={goBack}
            aria-label="Volver a la página anterior" title="Volver a la página anterior">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="topbar-title">
            <span>Panel de gestión</span>
          </div>
          
          <div className="topbar-actions">
            <button className="s43-search-icon-button" type="button" aria-label="Buscar candidatos y solicitudes" title="Buscar (Ctrl + K)" onClick={() => setSearchOpen(true)}>
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
            </button>
            {notifyPreference && <Notificaciones/>}
            <button
              className="theme-toggle"
              type="button"
              aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
              onClick={() => setDarkMode((enabled) => !enabled)}
            >
              {darkMode ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" />
                </svg>
              )}
            </button>
            <button ref={profileButtonRef} className="topbar-user sigma-profile-trigger" type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(v=>!v)}>
              <div className="topbar-avatar">{user?.nombre?.charAt(0).toUpperCase() ?? 'U'}</div>
              <div className="sigma-profile-identity"><strong>{user?.nombre}</strong><span>{user?.rol}</span></div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {profileOpen && <div ref={profileRef} className="sigma-profile-menu" role="menu" aria-label="Menú de usuario">
              <div className="sigma-profile-header"><div className="topbar-avatar">{user?.nombre?.charAt(0).toUpperCase() ?? 'U'}</div><div><strong>{user?.nombre}</strong><small>{user?.correo}</small><span>{user?.rol}</span></div></div>
              {([['perfil','Mi perfil','user-round'],['clave','Cambiar contraseña','key-round'],['apariencia','Apariencia','sun-moon'],['preferencias','Preferencias','bell'],['actividad','Mi actividad','history']] as const).map(([id,label]) => <button key={id} type="button" role="menuitem" className="sigma-profile-item" onClick={()=>openPanel(id)}>{label}<span>›</span></button>)}
              <button type="button" role="menuitem" className="sigma-profile-item sigma-profile-exit" onClick={onLogout}>Cerrar sesión <span>↗</span></button>
            </div>}
          </div>
        </header>

        {searchOpen && <div className="s43-search-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setSearchOpen(false) }}>
          <section className="s43-search-dialog" role="dialog" aria-modal="true" aria-label="Búsqueda global">
            <div className="s43-search-dialog-top">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
              <input ref={searchInputRef} type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar candidatos o solicitudes…" aria-label="Buscar" />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Cerrar búsqueda">Esc</button>
            </div>
            <div className="s43-search-dialog-body">
              {searchLoading && <p className="s43-search-status">Buscando…</p>}
              {searchError && <p className="s43-search-error" role="alert">{searchError}</p>}
              <h3>Candidatos <span>{searchCandidates.length}</span></h3>
              {searchCandidates.slice(0, 8).map(candidate => <button type="button" key={candidate.id} className="s43-search-result" onClick={() => openSearchResult(`/candidatos/${candidate.id}/historial`)}><strong>{candidate.nombre}</strong><small>{candidate.cargo} · {candidate.familia_cargo}</small></button>)}
              {!searchLoading && searchCandidates.length === 0 && <p className="s43-search-status">Sin candidatos coincidentes.</p>}
              <h3>Solicitudes <span>{searchRequests.length}</span></h3>
              {searchRequests.slice(0, 8).map(request => <button type="button" key={request.id} className="s43-search-result" onClick={() => openSearchResult(`/solicitudes/${request.id}`)}><strong>#{request.id} · {request.candidato_nombre}</strong><small>{request.cargo} · {request.estado}</small></button>)}
              {!searchLoading && searchRequests.length === 0 && <p className="s43-search-status">Sin solicitudes coincidentes.</p>}
            </div>
            <div className="s43-search-dialog-foot">Ctrl + K para abrir · Esc para cerrar</div>
          </section>
        </div>}

        {panel && <div className="sigma-profile-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPanel(null)}}>
          <section className="sigma-profile-dialog" role="dialog" aria-modal="true" aria-label="Configuración de usuario">
            <div className="sigma-profile-dialog-head"><h2>{{perfil:'Mi perfil',clave:'Cambiar contraseña',apariencia:'Apariencia',preferencias:'Preferencias',actividad:'Mi actividad'}[panel]}</h2><button type="button" aria-label="Cerrar" onClick={()=>setPanel(null)}>×</button></div>
            {panel==='perfil' && <div className="sigma-profile-fields"><label>Nombre completo<input value={profileName} maxLength={100} onChange={e=>setProfileName(e.target.value)}/></label><label>Correo electrónico<input value={user?.correo || ''} disabled/></label><label>Rol<input value={user?.rol || ''} disabled/></label><p>El correo y el rol no se pueden modificar desde el perfil.</p></div>}
            {panel==='clave' && <div className="sigma-profile-fields"><label>Contraseña actual<input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label>Nueva contraseña (mínimo 12 caracteres)<input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label>Confirmar contraseña<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label></div>}
            {panel==='apariencia' && <div className="sigma-profile-fields"><p>Elige cómo se ve SIGMA-Aqua en este navegador.</p><div className="sigma-profile-options"><button className={!darkMode?'selected':''} onClick={()=>setDarkMode(false)}>☀ Modo claro</button><button className={darkMode?'selected':''} onClick={()=>setDarkMode(true)}>☾ Modo oscuro</button></div></div>}
            {panel==='preferencias' && <div className="sigma-profile-fields"><label className="sigma-profile-check"><input type="checkbox" checked={notifyPreference} onChange={e=>{setNotifyPreference(e.target.checked);localStorage.setItem('sigma.notify.preference',e.target.checked?'on':'off')}}/> Mostrar avisos de notificaciones</label><p>Esta preferencia queda guardada en este navegador. No desactiva los avisos importantes del servidor.</p></div>}
            {panel==='actividad' && <div className="sigma-profile-activity">{activity.length===0 ? <p>No hay actividad registrada para tu cuenta.</p> : activity.map((item,i)=><div key={i}><strong>{item.accion.replace(/_/g, ' ')}</strong><small>{new Date(item.creado_en).toLocaleString('es-CL')}</small><p>{item.detalle}</p></div>)}</div>}
            {feedback && <p className="sigma-profile-feedback" role="status">{feedback}</p>}
            {(panel==='perfil'||panel==='clave') && <button className="sigma-profile-save" disabled={saving} onClick={savePanel}>{saving?'Guardando…':'Guardar cambios'}</button>}
          </section>
        </div>}
        <main className="app-main">
          <div className="app-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
