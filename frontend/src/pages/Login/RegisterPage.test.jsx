import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RegisterPage from './RegisterPage'
const mocks = vi.hoisted(() => ({ registro: vi.fn(), verificar: vi.fn(), reenviarCodigo: vi.fn(), navigate: vi.fn() }))
vi.mock('../../api', () => ({ api: { registro: mocks.registro, verificar: mocks.verificar, reenviarCodigo: mocks.reenviarCodigo } }))
vi.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>, useNavigate: () => mocks.navigate }))
beforeEach(() => { Object.values(mocks).forEach(m => m.mockReset()) })
describe('RegisterPage', () => {
 test('renderiza el formulario de registro', () => { render(<RegisterPage />); expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument() })
 test('no envía registro con formulario vacío', () => { render(<RegisterPage />); const button = screen.getByRole('button', { name: /crear cuenta/i }); fireEvent.click(button); expect(mocks.registro).not.toHaveBeenCalled() })
})
