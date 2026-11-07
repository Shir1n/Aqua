import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import KanbanPage from './KanbanPage'
const mocks = vi.hoisted(() => ({ listSolicitudes: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
beforeEach(() => { Object.values(mocks).forEach(m => m.mockReset()); mocks.listSolicitudes.mockResolvedValue([]);  })
describe('KanbanPage', () => {
 test('muestra la información recibida', async () => { render(<KanbanPage />); expect(screen.getByRole('heading', { name: 'Tablero Kanban' })).toBeInTheDocument(); expect(mocks.listSolicitudes).toHaveBeenCalled() })
 test('muestra error al fallar la consulta', async () => { mocks.listSolicitudes.mockRejectedValue(new Error('Tablero no disponible')); render(<KanbanPage />); expect(await screen.findByText(/Tablero no disponible/)).toBeInTheDocument() })
 test('consulta la API correspondiente', async () => { render(<KanbanPage />); expect(mocks.listSolicitudes).toHaveBeenCalled() })
})
