import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Candidatos from './CandidatosPage'
const mocks = vi.hoisted(() => ({ listCandidatos: vi.fn(), deleteCandidato: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }))
beforeEach(() => { vi.useFakeTimers(); mocks.listCandidatos.mockReset().mockResolvedValue([]); mocks.deleteCandidato.mockReset() })
afterEach(() => vi.useRealTimers())
async function load() { await vi.advanceTimersByTimeAsync(300); }
describe('CandidatosPage', () => {
 test('muestra encabezado, búsqueda y estado vacío', async () => { render(<Candidatos />); expect(screen.getByRole('heading', {name:'Candidatos'})).toBeInTheDocument(); expect(screen.getByRole('textbox', {name:'Buscar candidatos'})).toBeInTheDocument(); await load(); expect(screen.getByText('No se encontraron candidatos')).toBeInTheDocument() })
 test('muestra candidatos recibidos desde la API', async () => { mocks.listCandidatos.mockResolvedValue([{id:1,nombre:'Ana Pérez',correo:'ana@test.cl',telefono:'123',cargo:'Analista',familia_cargo:'Administración'}]); render(<Candidatos />); await load(); expect(screen.getByText('Ana Pérez')).toBeInTheDocument(); expect(screen.getByText('ana@test.cl')).toBeInTheDocument() })
 test('muestra error cuando falla la API', async () => { mocks.listCandidatos.mockRejectedValue(new Error('API no disponible')); render(<Candidatos />); await load(); expect(screen.getByText('API no disponible')).toBeInTheDocument() })
})
