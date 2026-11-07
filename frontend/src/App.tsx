import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login/LoginPage'
import RegisterPage from './pages/Login/RegisterPage'
import Dashboard from './pages/Dashboard/DashboardPage'
import Candidatos from './pages/Candidatos/CandidatosPage'
import CandidatoForm from './pages/CandidatoForm/CandidatoFormPage'
import Solicitudes from './pages/Solicitudes/SolicitudesPage'
import SolicitudForm from './pages/SolicitudForm/SolicitudFormPage'
import SolicitudDetalle from './pages/SolicitudDetalle/SolicitudDetallePage'
import AgendaPage from './pages/Extra/AgendaPage'
import EstadisticasPage from './pages/Extra/EstadisticasPage'
import UsuariosPage from './pages/Extra/UsuariosPage'
import KanbanPage from './pages/Extra/KanbanPage'
import BusquedaPage from './pages/Extra/BusquedaPage'
import HistorialCandidatoPage from './pages/Extra/HistorialCandidatoPage'
import HerramientasPage from './pages/Extra/HerramientasPage'

function AdminOnly({children}:{children:ReactNode}) { const {user}=useAuth(); return user?.rol==='Administrador'?<>{children}</>:<Navigate to="/" replace/> }

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/candidatos" element={<Candidatos />} />
            <Route path="/candidatos/nuevo" element={<CandidatoForm />} />
            <Route path="/candidatos/:id/editar" element={<CandidatoForm />} />
            <Route path="/solicitudes" element={<Solicitudes />} />
            <Route path="/solicitudes/nueva" element={<SolicitudForm />} />
            <Route path="/solicitudes/:id" element={<SolicitudDetalle />} />
            <Route path="/kanban" element={<KanbanPage/>}/>
            <Route path="/buscar" element={<BusquedaPage/>}/>
            <Route path="/candidatos/:id/historial" element={<HistorialCandidatoPage/>}/>
            <Route path="/herramientas" element={<HerramientasPage/>}/>
            <Route path="/agenda" element={<AgendaPage/>}/>
            <Route path="/estadisticas" element={<EstadisticasPage/>}/>
            <Route path="/usuarios" element={<AdminOnly><UsuariosPage/></AdminOnly>}/>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
