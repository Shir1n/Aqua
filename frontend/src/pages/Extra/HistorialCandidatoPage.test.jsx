import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HistorialCandidatoPage from './HistorialCandidatoPage'
const mocks = vi.hoisted(() => ({ historialCandidato: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '1' }), useLocation: () => ({ state: null }), Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }))
beforeEach(() => { Object.values(mocks).forEach(m => m.mockReset()); mocks.historialCandidato.mockResolvedValue({ candidato: { nombre: 'Ana Pérez' }, solicitudes: [], historial: [] });  })
describe('HistorialCandidatoPage', () => {
 test('muestra la información recibida', async () => { render(<HistorialCandidatoPage />); expect(screen.getByRole('heading', { name: 'Historial del candidato' })).toBeInTheDocument(); expect(await screen.findByText('Ana Pérez')).toBeInTheDocument() })
 test('consulta la API correspondiente', async () => { render(<HistorialCandidatoPage />); expect(mocks.historialCandidato).toHaveBeenCalled() })
})
