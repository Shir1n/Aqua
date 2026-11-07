import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './LoginPage';

const mocks = vi.hoisted(() => ({
  apiLogin: vi.fn(),
  login: vi.fn(),
}));

vi.mock('../../api', () => ({
  api: { login: mocks.apiLogin },
}));

vi.mock('../../AuthContext', () => ({
  useAuth: () => ({ login: mocks.login }),
}));

beforeEach(() => {
  mocks.apiLogin.mockReset();
  mocks.login.mockReset();
});

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<h1>Dashboard</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('renderiza el formulario completo', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Recordarme' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Regístrate' })).toBeInTheDocument();
  });

  it('no inicia sesión con los campos vacíos', async () => {
    renderLogin();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(mocks.apiLogin).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('muestra error cuando los campos son solo espacios', async () => {
    renderLogin();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Correo'), '   ');
    await user.type(screen.getByLabelText('Contraseña'), '   ');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'completa el usuario y la contraseña',
    );
    expect(mocks.apiLogin).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('inicia sesión y navega a "/" con credenciales válidas', async () => {
    const usuarioMock = {
      id: 1,
      nombre: 'Ana',
      correo: 'ana@aqua.cl',
      rol: 'Administrador',
      token: 'abc123',
    };
    mocks.apiLogin.mockResolvedValue(usuarioMock);

    renderLogin();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Correo'), 'ana@aqua.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(mocks.apiLogin).toHaveBeenCalledWith('ana@aqua.cl', 'secreto');
    expect(mocks.login).toHaveBeenCalledWith(usuarioMock);
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('muestra error cuando la API rechaza el login', async () => {
    mocks.apiLogin.mockRejectedValue(new Error('Credenciales inválidas'));

    renderLogin();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Correo'), 'ana@aqua.cl');
    await user.type(screen.getByLabelText('Contraseña'), 'mal');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(mocks.login).not.toHaveBeenCalled();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('el botón del ojo alterna la visibilidad de la contraseña', async () => {
    renderLogin();

    const user = userEvent.setup();
    const inputContrasena = screen.getByLabelText('Contraseña');
    expect(inputContrasena).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(inputContrasena).toHaveAttribute('type', 'text');
  });
});
