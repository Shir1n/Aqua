// Catálogo orientativo para facilitar el ingreso. No representa la nómina oficial de AquaChile.
const POR_FAMILIA = {
  'Profesional A': ['Gerente de Operaciones', 'Subgerente de Producción', 'Jefe de Proyectos Estratégicos'],
  'Profesional B C': ['Analista de Sistemas', 'Analista de Calidad', 'Analista de Recursos Humanos', 'Analista de Datos', 'Ingeniero de Procesos', 'Ingeniero de Producción', 'Ingeniero Ambiental', 'Prevencionista de Riesgos', 'Analista de Abastecimiento', 'Analista de Logística', 'Analista de Control de Gestión'],
  'Técnico A': ['Técnico de Mantención Industrial', 'Técnico Eléctrico', 'Técnico Mecánico', 'Técnico en Automatización', 'Técnico de Laboratorio', 'Técnico de Refrigeración'],
  'Técnico B C': ['Asistente de Calidad', 'Asistente de Laboratorio', 'Técnico de Producción', 'Técnico de Bodega', 'Técnico de Operaciones', 'Asistente de Mantención'],
  'Operario Calificado': ['Operario de Producción', 'Operario de Planta', 'Gruero', 'Operador de Grúa Horquilla', 'Operador de Maquinaria', 'Operador de Línea', 'Operador de Empaque', 'Operador de Frigorífico', 'Operador de Bodega', 'Operador de Planta de Procesos', 'Operador de Tratamiento de Aguas'],
  'Supervisor B': ['Supervisor de Planta', 'Supervisor de Producción', 'Supervisor de Turno', 'Supervisor de Mantención', 'Supervisor de Calidad', 'Supervisor de Logística', 'Supervisor de Bodega', 'Supervisor de Seguridad'],
  'Jefatura': ['Jefe de Planta', 'Jefe de Producción', 'Jefe de Turno', 'Jefe de SSO', 'Jefe de Calidad', 'Jefe de Mantención', 'Jefe de Logística', 'Jefe de Recursos Humanos', 'Jefe de Operaciones', 'Jefe de Centro de Cultivo'],
} satisfies Record<string, string[]>

export const CARGOS_REFERENCIA = Object.entries(POR_FAMILIA).flatMap(([familia, cargos]) => cargos.map((cargo) => ({ cargo, familia })))
