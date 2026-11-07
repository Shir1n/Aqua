import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Candidatos from './CandidatosPage'
const mocks = vi.hoisted(() => ({ listCandidatos: vi.fn(), deleteCandidato: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>, useLocation: () => ({ pathname: '/candidatos', state: null }) }))
beforeEach(() => { mocks.listCandidatos.mockReset().mockResolvedValue([]); mocks.deleteCandidato.mockReset() })
const ana = { id: 1, nombre: 'Ana Pérez', correo: 'ana@test.cl', telefono: '123', cargo: 'Analista', familia_cargo: 'Administración' }
describe('CandidatosPage', () => {
 test('muestra encabezado, búsqueda y estado vacío', async () => { render(<Candidatos />); expect(screen.getByRole('heading', { name: 'Directorio de candidatos' })).toBeInTheDocument(); expect(screen.getByRole('textbox', { name: 'Buscar candidatos' })).toBeInTheDocument(); expect(await screen.findByText('No se encontraron candidatos')).toBeInTheDocument() })
 test('muestra candidatos recibidos desde la API', async () => { mocks.listCandidatos.mockResolvedValue([ana]); render(<Candidatos />); expect(await screen.findByText('Ana Pérez')).toBeInTheDocument(); expect(screen.getByText('ana@test.cl')).toBeInTheDocument() })
 test('filtra candidatos por nombre', async () => { mocks.listCandidatos.mockResolvedValue([ana]); render(<Candidatos />); await screen.findByText('Ana Pérez'); fireEvent.change(screen.getByRole('textbox', { name: 'Buscar candidatos' }), { target: { value: 'inexistente' } }); expect(screen.getByText('No se encontraron candidatos')).toBeInTheDocument() })
 test('muestra error cuando falla la API', async () => { mocks.listCandidatos.mockRejectedValue(new Error('API no disponible')); render(<Candidatos />); expect(await screen.findByText('API no disponible')).toBeInTheDocument() })
})
