import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Solicitudes from './SolicitudesPage'
const mocks = vi.hoisted(() => ({ listSolicitudes: vi.fn(), navigate: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('react-router-dom', () => ({ Link: ({to, children, ...props}) => <a href={to} {...props}>{children}</a>, useNavigate: () => mocks.navigate }))
beforeEach(() => { vi.useFakeTimers(); mocks.listSolicitudes.mockReset().mockResolvedValue([]); mocks.navigate.mockReset() })
afterEach(() => vi.useRealTimers())
async function load() { await vi.advanceTimersByTimeAsync(300) }
describe('SolicitudesPage', () => {
 test('muestra encabezado, filtros y estado vacío', async () => { render(<Solicitudes />); expect(screen.getByRole('heading', {name:'Solicitudes'})).toBeInTheDocument(); expect(screen.getByRole('textbox', {name:'Buscar solicitudes'})).toBeInTheDocument(); expect(screen.getByRole('combobox', {name:'Filtrar por estado'})).toBeInTheDocument(); await load(); expect(screen.getByText('No se encontraron solicitudes')).toBeInTheDocument() })
 test('muestra solicitudes devueltas por la API', async () => { mocks.listSolicitudes.mockResolvedValue([{id:7,candidato_nombre:'Ana Pérez',familia_cargo:'Profesional A',cargo:'Analista',responsable_nombre:'Luis Soto',fecha_solicitud:'2026-10-30',estado:'Pendiente'}]); render(<Solicitudes />); await load(); expect(screen.getByText('Ana Pérez')).toBeInTheDocument(); expect(screen.getByText('Analista')).toBeInTheDocument(); expect(screen.getByText('Pendiente')).toBeInTheDocument() })
 test('muestra error cuando la consulta falla', async () => { mocks.listSolicitudes.mockRejectedValue(new Error('Fallo de solicitudes')); render(<Solicitudes />); await load(); expect(screen.getByText('Fallo de solicitudes')).toBeInTheDocument() })
})
