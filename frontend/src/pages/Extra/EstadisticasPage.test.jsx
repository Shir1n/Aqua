import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import EstadisticasPage from './EstadisticasPage'
const mocks = vi.hoisted(() => ({ getEstadisticas: vi.fn() }))
vi.mock('../../api', () => ({ api: mocks }))
beforeEach(() => { Object.values(mocks).forEach(m => m.mockReset()); mocks.getEstadisticas.mockResolvedValue({ resumen: { total: 2, finalizadas: 1 }, porMes: [], porEvaluador: [] });  })
describe('EstadisticasPage', () => {
 test('muestra la información recibida', async () => { render(<EstadisticasPage />); expect(await screen.findByRole('heading', { name: 'Estadísticas del proceso' })).toBeInTheDocument(); expect(await screen.findByText('Total de solicitudes')).toBeInTheDocument() })
 test('muestra error si falla la consulta', async () => { mocks.getEstadisticas.mockRejectedValue(new Error('Sin conexión')); render(<EstadisticasPage />); expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument() })
 test('consulta la API correspondiente', async () => { render(<EstadisticasPage />); expect(mocks.getEstadisticas).toHaveBeenCalled() })
})
