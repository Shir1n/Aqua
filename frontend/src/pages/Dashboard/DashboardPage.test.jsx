import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Dashboard from './DashboardPage'
const mocks = vi.hoisted(() => ({ getDashboard: vi.fn(), listSolicitudes: vi.fn(), listCandidatos: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('react-router-dom', () => ({ Link: ({to, children, ...props}) => <a href={to} {...props}>{children}</a> }))
beforeEach(() => { mocks.getDashboard.mockReset().mockResolvedValue({totalCandidatos:2,totalSolicitudes:3,pendientes:1,enProceso:1,finalizadas:1}); mocks.listSolicitudes.mockReset().mockResolvedValue([]); mocks.listCandidatos.mockReset().mockResolvedValue([]) })
describe('DashboardPage', () => {
 test('muestra carga mientras espera los indicadores', () => { mocks.getDashboard.mockReturnValue(new Promise(() => {})); render(<Dashboard />); expect(screen.getByText('Cargando tu espacio de trabajo…')).toBeInTheDocument() })
 test('muestra indicadores cuando la API responde', async () => { render(<Dashboard />); expect(await screen.findByText('Candidatos')).toBeInTheDocument(); expect(screen.getAllByText('Solicitudes').length).toBeGreaterThan(0); expect(screen.getAllByText('Pendientes')[0]).toBeInTheDocument(); expect(screen.getAllByText('2').length).toBeGreaterThan(0) })
 test('muestra error si falla la carga', async () => { mocks.getDashboard.mockRejectedValue(new Error('No se pudo conectar')); render(<Dashboard />); expect(await screen.findByText('No se pudo conectar')).toBeInTheDocument() })
})
