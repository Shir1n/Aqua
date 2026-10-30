import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Login from './LoginPage'

// Mockeamos lo que Login usa desde fuera de sí mismo.
const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  login: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../../AuthContext', () => ({
  useAuth: () => ({ login: mocks.login }),
}))

beforeEach(() => {
  mocks.navigate.mockReset()
  mocks.login.mockReset()
})

// Dispara el submit directamente sobre el <form>, saltando la validación
// nativa de "required" para poder probar la validación propia del componente.
function submitForm() {
  const form = screen.getByRole('button', { name: 'Ingresar' }).closest('form')
  fireEvent.submit(form)
}

describe('LoginPage', () => {
  test('renderiza los campos de usuario, contraseña y el botón Ingresar', () => {
    render(<Login />)

    expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
  })

  test('muestra un error al enviar con ambos campos vacíos', () => {
    render(<Login />)

    submitForm()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Por favor, completa el usuario y la contraseña',
    )
    expect(mocks.login).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  test('muestra un error si falta la contraseña', () => {
    render(<Login />)

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'admin' } })
    submitForm()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(mocks.login).not.toHaveBeenCalled()
  })

  test('hace login y navega a "/" cuando los campos están completos', () => {
    render(<Login />)

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(mocks.login).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).toHaveBeenCalledWith('/')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('el botón del ojo alterna la visibilidad de la contraseña', () => {
    render(<Login />)

    const inputContrasena = screen.getByLabelText('Contraseña')
    expect(inputContrasena).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(inputContrasena).toHaveAttribute('type', 'text')
  })
})
