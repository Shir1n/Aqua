import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import UsuariosPage from './UsuariosPage'
const mocks = vi.hoisted(() => ({ adminUsuarios: vi.fn(), adminAuditoria: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('../../AuthContext', () => ({ useAuth: () => ({ user: { id: 1, rol: 'Administrador' } }) }))
beforeEach(() => { Object.values(mocks).forEach(m => m.mockReset()); mocks.adminUsuarios.mockResolvedValue([]); mocks.adminAuditoria.mockResolvedValue([]); })
describe('UsuariosPage', () => {
 test('muestra la información recibida', async () => { render(<UsuariosPage />); expect(screen.getByRole('heading', { name: 'Administración de usuarios' })).toBeInTheDocument(); expect(await screen.findByText('Usuarios del sistema')).toBeInTheDocument() })
 test('consulta la API correspondiente', async () => { render(<UsuariosPage />); expect(mocks.adminUsuarios).toHaveBeenCalled() })
})
