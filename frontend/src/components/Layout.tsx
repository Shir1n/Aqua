import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? ' active' : ''}`

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function onLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand" to="/">
            Evaluaciones Psicolaborales
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#nav"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="nav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <NavLink className={navLinkClass} to="/">
                  Dashboard
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={navLinkClass} to="/candidatos">
                  Candidatos
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={navLinkClass} to="/solicitudes">
                  Solicitudes
                </NavLink>
              </li>
            </ul>
            <span className="navbar-text me-3">
              {user?.nombre} <span className="badge bg-secondary">{user?.rol}</span>
            </span>
            <button className="btn btn-outline-light btn-sm" onClick={onLogout}>
              Salir
            </button>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
    </>
  )
}
