import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Solicitudes from './SolicitudesPage'
const mocks = vi.hoisted(() => ({ listSolicitudes: vi.fn(), navigate: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>, useNavigate: () => mocks.navigate, useLocation: () => ({ pathname: "/solicitudes", state: null }) }))
beforeEach(() => { mocks.listSolicitudes.mockReset().mockResolvedValue([]); mocks.navigate.mockReset() })
const ana = { id: 7, candidato_nombre: 'Ana Pérez', familia_cargo: 'Profesional A', cargo: 'Analista', responsable_nombre: 'Luis Soto', fecha_solicitud: '2026-10-30', estado: 'Pendiente' }
describe('SolicitudesPage', () => {
 test('muestra encabezado, filtros y estado vacío', async () => { render(<Solicitudes />); expect(screen.getByRole('heading', { name: 'Gestión de solicitudes' })).toBeInTheDocument(); expect(screen.getByRole('textbox', { name: 'Buscar solicitudes' })).toBeInTheDocument(); expect(screen.getByRole('group', { name: 'Filtrar por estado' })).toBeInTheDocument(); expect(await screen.findByText('No hay solicitudes con estos filtros')).toBeInTheDocument() })
 test('muestra solicitudes devueltas por la API', async () => { mocks.listSolicitudes.mockResolvedValue([ana]); render(<Solicitudes />); expect(await screen.findByText('Ana Pérez')).toBeInTheDocument(); expect(screen.getByText('Analista')).toBeInTheDocument() })
 test('filtra por estado', async () => { mocks.listSolicitudes.mockResolvedValue([ana]); render(<Solicitudes />); await screen.findByText('Ana Pérez'); fireEvent.click(screen.getByRole('button', { name: /Finalizadas/ })); expect(screen.getByText('No hay solicitudes con estos filtros')).toBeInTheDocument() })
 test('muestra error cuando la consulta falla', async () => { mocks.listSolicitudes.mockRejectedValue(new Error('Fallo de solicitudes')); render(<Solicitudes />); expect(await screen.findByText('Fallo de solicitudes')).toBeInTheDocument() })
})
