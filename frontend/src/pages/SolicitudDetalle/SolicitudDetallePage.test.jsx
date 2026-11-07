import { describe, test, expect, vi, beforeEach, waitFor } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SolicitudDetalle from './SolicitudDetallePage'
const mocks = vi.hoisted(() => ({ getSolicitud: vi.fn(), updateSolicitud: vi.fn(), saveEvaluacion: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('react-router-dom', () => ({ Link: ({to,children,...props}) => <a href={to} {...props}>{children}</a>, useParams: () => ({id:'7'}) }))
const solicitud = {id:7,estado:'Pendiente',candidato_nombre:'Ana Pérez',cargo:'Analista',familia_cargo:'Profesional A',fecha_solicitud:'2026-10-30',responsable_nombre:null,observaciones:'Primera entrevista',evaluacion:null}
beforeEach(() => { mocks.getSolicitud.mockReset().mockResolvedValue({...solicitud}); mocks.updateSolicitud.mockReset().mockResolvedValue({}); mocks.saveEvaluacion.mockReset().mockResolvedValue({}) })
describe('SolicitudDetallePage', () => {
 test('muestra los datos de la solicitud', async () => { render(<SolicitudDetalle />); expect(await screen.findByRole('heading',{name:/Solicitud #7/})).toBeInTheDocument(); expect(screen.getByText('Ana Pérez')).toBeInTheDocument(); expect(screen.getByText('Primera entrevista')).toBeInTheDocument() })
 test('actualiza el estado cuando cambia el selector', async () => { render(<SolicitudDetalle />); await screen.findByRole('heading',{name:/Solicitud #7/}); fireEvent.change(screen.getAllByRole('combobox')[0],{target:{value:'En proceso'}}); await waitFor(() => expect(mocks.updateSolicitud).toHaveBeenCalledWith(7,{estado:'En proceso'})) })
 test('muestra error si no puede cargar la solicitud', async () => { mocks.getSolicitud.mockRejectedValue(new Error('Solicitud no disponible')); render(<SolicitudDetalle />); expect(await screen.findByText('Solicitud no disponible')).toBeInTheDocument() })
})
