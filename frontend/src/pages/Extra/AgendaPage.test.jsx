import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AgendaPage from './AgendaPage'
const mocks = vi.hoisted(() => ({ getAgenda: vi.fn(), listSolicitudes: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
beforeEach(() => { Object.values(mocks).forEach(m => m.mockReset()); mocks.getAgenda.mockResolvedValue([]); mocks.listSolicitudes.mockResolvedValue([]); })
describe('AgendaPage', () => {
 test('muestra la información recibida', async () => { render(<AgendaPage />); expect(screen.getByRole('heading', { name: 'Calendario de evaluaciones' })).toBeInTheDocument(); expect(mocks.getAgenda).toHaveBeenCalled() })
 test('muestra error al fallar la agenda', async () => { mocks.getAgenda.mockRejectedValue(new Error('Agenda no disponible')); render(<AgendaPage />); expect(await screen.findByText(/Agenda no disponible/)).toBeInTheDocument() })
 test('consulta la API correspondiente', async () => { render(<AgendaPage />); expect(mocks.getAgenda).toHaveBeenCalled() })
})
