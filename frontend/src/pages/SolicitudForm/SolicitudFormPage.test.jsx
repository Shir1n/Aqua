import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SolicitudForm from './SolicitudFormPage'
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), listCandidatos: vi.fn(), getUsuarios: vi.fn(), createSolicitud: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
beforeEach(() => { Object.values(mocks).forEach(m => m.mockReset()); mocks.listCandidatos.mockResolvedValue([{id:1,nombre:'Ana Pérez',cargo:'Analista',familia_cargo:'Profesional A'}]); mocks.getUsuarios.mockResolvedValue([{id:2,nombre:'Luis Soto',rol:'Evaluador'},{id:3,nombre:'Admin',rol:'Administrador'}]); mocks.createSolicitud.mockResolvedValue({}) })
describe('SolicitudFormPage', () => {
 test('carga candidatos y muestra formulario', async () => { render(<SolicitudForm />); expect(screen.getByRole('heading',{name:'Nueva solicitud'})).toBeInTheDocument(); expect(await screen.findByRole('option',{name:/Ana Pérez/})).toBeInTheDocument(); expect(await screen.findByRole('option',{name:'Luis Soto'})).toBeInTheDocument() })
 test('completa cargo y familia al elegir candidato', async () => { render(<SolicitudForm />); const candidate = await screen.findAllByRole('combobox').then((items) => items[0]); fireEvent.change(candidate,{target:{value:'1'}}); expect(screen.getByDisplayValue('Analista')).toHaveValue('Analista'); expect(screen.getAllByRole('combobox')[1]).toHaveValue('Profesional A') })
 test('crea solicitud y navega al listado', async () => { render(<SolicitudForm />); fireEvent.change(await screen.findAllByRole('combobox').then((items) => items[0]),{target:{value:'1'}}); fireEvent.submit(screen.getByRole('button',{name:'Crear solicitud'}).closest('form')); await waitFor(() => expect(mocks.createSolicitud).toHaveBeenCalledTimes(1)); expect(mocks.navigate).toHaveBeenCalledWith('/solicitudes') })
 test('muestra error si falla el guardado', async () => { mocks.createSolicitud.mockRejectedValue(new Error('No se pudo crear')); render(<SolicitudForm />); fireEvent.change(await screen.findAllByRole('combobox').then((items) => items[0]),{target:{value:'1'}}); fireEvent.submit(screen.getByRole('button',{name:'Crear solicitud'}).closest('form')); expect(await screen.findByText('No se pudo crear')).toBeInTheDocument() })
})
