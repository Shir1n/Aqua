export type Rol = 'Administrador' | 'Analista' | 'Evaluador' | 'Jefatura'
export type Estado = 'Pendiente' | 'En proceso' | 'Finalizada'

export interface Usuario {
  id: number
  nombre: string
  correo: string
  rol: Rol
  token?: string
}

export interface Candidato {
  id: number
  nombre: string
  correo: string
  telefono: string
  cargo: string
  familia_cargo: string
  creado_en: string
}

export interface Evaluacion {
  id: number
  solicitud_id: number
  fecha_evaluacion: string
  resultado: string
  observaciones: string
  estado: string
  creado_en: string
  competencias?: string
  recomendaciones?: string
  borrador?: number
  advertencia_informe?: string | null
  antecedentes?: string | null
  motivacion?: string | null
  fortalezas?: string | null
  oportunidades?: string | null
  evidencias?: string | null
}

export interface CompetenciaFamilia {
  nombre: string
  descripcion: string
}

export interface Solicitud {
  id: number
  candidato_id: number
  candidato_nombre: string
  cargo: string
  familia_cargo: string
  fecha_solicitud: string
  estado: Estado
  responsable_id: number | null
  responsable_nombre: string | null
  observaciones: string
  creado_en: string
  evaluacion?: Evaluacion | null
  documentos?: Documento[]
  competencias_familia?: CompetenciaFamilia[]
  antecedentes_sugeridos?: string
  carpeta?: string | null
  reclutador?: string | null
  origen?: string | null
  ubicacion?: string | null
  unidad?: string | null
  ceco?: string | null
  requiere_referencias?: string | null
  es_referido?: string | null
}

export interface Documento {
  id: number
  tipo: 'cv' | 'descriptor' | 'informe' | 'pauta' | 'formulario'
  nombre: string
  creado_en: string
}

export interface Dashboard {
  totalCandidatos: number
  totalSolicitudes: number
  pendientes: number
  enProceso: number
  finalizadas: number
}
