import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CandidatoForm from './CandidatoFormPage'
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), createCandidato: vi.fn(), updateCandidato: vi.fn(), getCandidato: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate, useParams: () => ({}) }))
beforeEach(() => { Object.values(mocks).forEach(m => m.mockReset()); mocks.createCandidato.mockResolvedValue({}) })
describe('CandidatoFormPage', () => {
 test('renderiza los campos requeridos', () => { render(<CandidatoForm />); expect(screen.getByRole('heading', {name:'Nuevo candidato'})).toBeInTheDocument(); expect(screen.getByRole('textbox')).toBeInTheDocument(); expect(screen.getByRole('combobox')).toBeInTheDocument(); expect(screen.getByText('Correo *')).toBeInTheDocument(); expect(screen.getByText('Cargo al que postula *')).toBeInTheDocument() })
 test('crea un candidato y vuelve al listado', async () => { render(<CandidatoForm />); const form = screen.getByRole('button', {name:/Guardar/i}).closest('form'); const fields = form.querySelectorAll('input, select'); fireEvent.change(fields[0], {target:{value:'Ana Pérez'}}); fireEvent.change(fields[1], {target:{value:'ana@test.cl'}}); fireEvent.change(fields[3], {target:{value:'Analista'}}); fireEvent.change(fields[4], {target:{value:'Profesional A'}}); fireEvent.submit(screen.getByRole('button', {name:/Guardar/i}).closest('form')); await waitFor(() => expect(mocks.createCandidato).toHaveBeenCalledTimes(1)); expect(mocks.navigate).toHaveBeenCalledWith('/candidatos') })
 test('muestra error si no se puede guardar', async () => { mocks.createCandidato.mockRejectedValue(new Error('No se pudo guardar')); render(<CandidatoForm />); const form = screen.getByRole('button', {name:/Guardar/i}).closest('form'); const fields = form.querySelectorAll('input, select'); fireEvent.change(fields[0], {target:{value:'Ana Pérez'}}); fireEvent.change(fields[1], {target:{value:'ana@test.cl'}}); fireEvent.change(fields[3], {target:{value:'Analista'}}); fireEvent.change(fields[4], {target:{value:'Profesional A'}}); fireEvent.submit(screen.getByRole('button', {name:/Guardar/i}).closest('form')); expect(await screen.findByText('No se pudo guardar')).toBeInTheDocument() })
})
