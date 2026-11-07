import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SolicitudDetalle from './SolicitudDetallePage';

const mocks = vi.hoisted(() => ({
  getSolicitud: vi.fn(),
  getCandidato: vi.fn(),
  updateSolicitud: vi.fn(),
  saveEvaluacion: vi.fn(),
}));

vi.mock('../../api', () => ({
  api: {
    getSolicitud: mocks.getSolicitud,
    getCandidato: mocks.getCandidato,
    updateSolicitud: mocks.updateSolicitud,
    saveEvaluacion: mocks.saveEvaluacion,
  },
}));

vi.mock('../../AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, nombre: 'Ana', correo: 'ana@aqua.cl', rol: 'Administrador' } }),
}));

beforeEach(() => {
  mocks.getSolicitud.mockReset();
  mocks.getCandidato.mockReset();
  mocks.updateSolicitud.mockReset();
  mocks.saveEvaluacion.mockReset();
});

const solicitudMock = {
  id: 1,
  candidato_id: 10,
  candidato_nombre: 'Ana Torres',
  cargo: 'Operario Calificado',
  familia_cargo: 'Operario',
  fecha_solicitud: '2026-10-01',
  estado: 'Pendiente',
  responsable_id: null,
  responsable_nombre: null,
  observaciones: 'Sin observaciones',
  creado_en: '2026-10-01',
  evaluacion: null,
};

const candidatoMock = {
  id: 10,
  nombre: 'Ana Torres',
  correo: 'ana@aqua.cl',
  telefono: '123456',
  cargo: 'Operario Calificado',
  familia_cargo: 'Operario',
  creado_en: '2026-10-01',
};

function renderDetalle() {
  return render(
    <MemoryRouter initialEntries={['/solicitudes/1']}>
      <Routes>
        <Route path="/solicitudes/:id" element={<SolicitudDetalle />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SolicitudDetallePage', () => {
  it('renderiza los datos de la solicitud cargada', async () => {
    mocks.getSolicitud.mockResolvedValue(solicitudMock);
    mocks.getCandidato.mockResolvedValue(candidatoMock);

    renderDetalle();

    expect(await screen.findByRole('heading', { name: /Solicitud #1/ })).toBeInTheDocument();
    expect(screen.getByText('Ana Torres')).toBeInTheDocument();
    expect(screen.getByText('Operario Calificado')).toBeInTheDocument();
    expect(screen.getByText('Pendiente', { selector: '.badge' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar informe PDF' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver' })).toBeInTheDocument();
  });

  it('muestra error si falla la carga', async () => {
    mocks.getSolicitud.mockRejectedValue(new Error('Error al cargar la solicitud'));

    renderDetalle();

    expect(await screen.findByText('Error al cargar la solicitud')).toBeInTheDocument();
  });

  it('actualiza el estado de la solicitud', async () => {
    mocks.getSolicitud.mockResolvedValue(solicitudMock);
    mocks.getCandidato.mockResolvedValue(candidatoMock);
    mocks.updateSolicitud.mockResolvedValue({});

    renderDetalle();

    await screen.findByRole('heading', { name: /Solicitud #1/ });

    const user = userEvent.setup();
    const selectEstado = screen.getAllByRole('combobox')[0];
    await user.selectOptions(selectEstado, 'Finalizada');

    expect(mocks.updateSolicitud).toHaveBeenCalledWith(1, { estado: 'Finalizada' });
    expect(await screen.findByText('Estado actualizado')).toBeInTheDocument();
  });

  it('guarda la evaluación', async () => {
    mocks.getSolicitud.mockResolvedValue(solicitudMock);
    mocks.getCandidato.mockResolvedValue(candidatoMock);
    mocks.saveEvaluacion.mockResolvedValue({});

    renderDetalle();

    await screen.findByRole('heading', { name: /Solicitud #1/ });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Guardar evaluación' }));

    await waitFor(() => expect(mocks.saveEvaluacion).toHaveBeenCalledWith(1, expect.objectContaining({ estado: 'En proceso', borrador: true, competencias: {}, recomendaciones: '' })));
    expect(await screen.findByText('Evaluación registrada')).toBeInTheDocument();
  });

  it('el enlace "Volver" apunta a "/solicitudes"', async () => {
    mocks.getSolicitud.mockResolvedValue(solicitudMock);
    mocks.getCandidato.mockResolvedValue(candidatoMock);

    renderDetalle();

    await screen.findByRole('heading', { name: /Solicitud #1/ });

    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/solicitudes');
  });
  it('muestra error si falla la actualización del estado', async () => {
    mocks.getSolicitud.mockResolvedValue(solicitudMock);
    mocks.getCandidato.mockResolvedValue(candidatoMock);
    mocks.updateSolicitud.mockRejectedValue(new Error('No se pudo actualizar'));
    renderDetalle();
    await screen.findByRole('heading', { name: /Solicitud #1/ });
    await userEvent.setup().selectOptions(screen.getAllByRole('combobox')[0], 'Finalizada');
    expect(await screen.findByText('No se pudo actualizar')).toBeInTheDocument();
  });

  it('muestra error si falla el guardado de evaluación', async () => {
    mocks.getSolicitud.mockResolvedValue(solicitudMock);
    mocks.getCandidato.mockResolvedValue(candidatoMock);
    mocks.saveEvaluacion.mockRejectedValue(new Error('No se pudo registrar'));
    renderDetalle();
    await screen.findByRole('heading', { name: /Solicitud #1/ });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar evaluación' }));
    expect(await screen.findByText('No se pudo registrar')).toBeInTheDocument();
  });

});
