import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HerramientasPage from './HerramientasPage'
const mocks = vi.hoisted(() => ({ recordatorios: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('../../AuthContext', () => ({ useAuth: () => ({ user: { id: 1, rol: 'Administrador' } }) }))
vi.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }))
beforeEach(() => { Object.values(mocks).forEach(m => m.mockReset()); mocks.recordatorios.mockResolvedValue({ agenda: [], sinAsignar: [] });  })
describe('HerramientasPage', () => {
 test('muestra la información recibida', async () => { render(<HerramientasPage />); expect(screen.getByRole('heading', { name: 'Herramientas y recordatorios' })).toBeInTheDocument(); expect(await screen.findByText('Exportaciones para Excel')).toBeInTheDocument() })
 test('consulta la API correspondiente', async () => { render(<HerramientasPage />); expect(mocks.recordatorios).toHaveBeenCalled() })
})
