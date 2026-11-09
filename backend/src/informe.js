import ExcelJS from 'exceljs'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CODIGOS_FAMILIA, PLANTILLAS_DIR, rutaAbsoluta } from './carpetas.js'

// Lectura y escritura del informe Excel de cada solicitud (Informe_<Nombre>.xlsx).
// Se escribe por los nombres definidos de la plantilla (Candidato, Cargo, Conclusiones,
// Recomendacion, FechaEvaluacion, Evaluador…), así la plantilla puede editarse sin tocar el código
// mientras conserve esos nombres. Ver plantillas/README.md.

async function abrir(ruta) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(ruta)
  return wb
}

async function guardar(wb, ruta) {
  // Que Excel recalcule al abrir (p. ej. el promedio de competencias).
  wb.calcProperties = { ...(wb.calcProperties || {}), fullCalcOnLoad: true }
  await wb.xlsx.writeFile(ruta)
}

/** Celda apuntada por un nombre definido ("Hoja!$B$5"), o null si la plantilla no lo tiene. */
function celdaPorNombre(wb, nombre) {
  const def = wb.definedNames.model.find((d) => d.name === nombre)
  const rango = def?.ranges?.[0]
  if (!rango) return null
  const m = /^'?(.+?)'?!\$?([A-Z]+)\$?(\d+)$/.exec(rango)
  if (!m) return null
  return wb.getWorksheet(m[1])?.getCell(`${m[2]}${m[3]}`) ?? null
}

function escribir(wb, nombre, valor) {
  const celda = celdaPorNombre(wb, nombre)
  if (celda) celda.value = valor === undefined || valor === '' ? null : valor
  return Boolean(celda)
}

/** Filas de la hoja Competencias: { fila, nombre, descripcion } hasta la fila "Promedio". */
function filasCompetencias(wb) {
  const hoja = wb.getWorksheet('Competencias')
  if (!hoja) return []
  const filas = []
  for (let r = 4; r <= Math.min(hoja.rowCount, 40); r++) {
    const nombre = String(hoja.getCell(`A${r}`).value ?? '').trim()
    if (!nombre || /^promedio$/i.test(String(hoja.getCell(`B${r}`).value ?? '').trim())) break
    filas.push({ fila: r, nombre, descripcion: String(hoja.getCell(`B${r}`).value ?? '').trim() })
  }
  return filas
}

export function rutaPlantillaInforme(familiaCargo) {
  const codigo = CODIGOS_FAMILIA[familiaCargo]
  return codigo ? join(PLANTILLAS_DIR, 'Informes', `${codigo}-informe.xlsx`) : null
}

const cacheCompetencias = new Map()

/** Competencias de la familia según su plantilla (con caché mientras el archivo no cambie). */
export async function competenciasDeFamilia(familiaCargo) {
  const ruta = rutaPlantillaInforme(familiaCargo)
  if (!ruta || !existsSync(ruta)) return []
  const mtime = statSync(ruta).mtimeMs
  const enCache = cacheCompetencias.get(ruta)
  if (enCache?.mtime === mtime) return enCache.lista
  const lista = filasCompetencias(await abrir(ruta)).map(({ nombre, descripcion }) => ({ nombre, descripcion }))
  cacheCompetencias.set(ruta, { mtime, lista })
  return lista
}

/**
 * Texto sugerido para "Antecedentes del candidato" a partir de los datos de la solicitud
 * (columnas de `solicitudes`). El evaluador puede editarlo en el panel.
 */
export function antecedentesSugeridos(s) {
  const si = (v) => (v ? String(v).trim() : '')
  const datos = [
    si(s.origen) && `Candidato/a ${si(s.origen).toLowerCase()}`,
    si(s.ubicacion) && `ubicación del cargo: ${si(s.ubicacion)}`,
    si(s.unidad) && `unidad: ${si(s.unidad)}`,
    si(s.ceco) && `CECO: ${si(s.ceco)}`,
  ].filter(Boolean)
  const lineas = []
  if (datos.length) lineas.push(`${datos.join(', ')}.`.replace(/^./, (c) => c.toUpperCase()))
  const solicitud = [
    si(s.fecha_solicitud) && `Solicitud del ${si(s.fecha_solicitud).split('-').reverse().join('-')}`,
    si(s.reclutador) && `${si(s.fecha_solicitud) ? 'realizada' : 'Solicitud realizada'} por ${si(s.reclutador)}`,
  ].filter(Boolean).join(', ')
  if (solicitud) lineas.push(`${solicitud}.`)
  const extras = [
    si(s.es_referido) && `Referido: ${si(s.es_referido)}`,
    si(s.requiere_referencias) && `Requiere referencias: ${si(s.requiere_referencias)}`,
  ].filter(Boolean)
  if (extras.length) lineas.push(`${extras.join(' · ')}.`)
  if (si(s.observaciones)) lineas.push(`Aspectos a indagar: ${si(s.observaciones)}`)
  return lineas.join('\n')
}

/** Al crear la carpeta: datos del candidato y del cargo, y antecedentes sugeridos. */
export async function prellenarInforme(ruta, { candidato, cargo, familiaCargo, antecedentes }) {
  const wb = await abrir(ruta)
  escribir(wb, 'Candidato', `Candidato/a: ${candidato}`)
  escribir(wb, 'Cargo', `Cargo: ${cargo} · Familia: ${familiaCargo}`)
  if (antecedentes) escribir(wb, 'Antecedentes', antecedentes)
  await guardar(wb, ruta)
}

/** Al guardar la evaluación en el panel: resultado, fecha, evaluador, conclusiones y niveles. */
export async function escribirEvaluacion(ruta, { fechaEvaluacion, evaluador, resultado, observaciones, recomendaciones, competencias, borrador, antecedentes, motivacion, fortalezas, oportunidades, evidencias }) {
  const wb = await abrir(ruta)
  escribir(wb, 'Antecedentes', antecedentes?.trim())
  escribir(wb, 'Motivacion', motivacion?.trim())
  escribir(wb, 'Fortalezas', fortalezas?.trim())
  escribir(wb, 'Oportunidades', oportunidades?.trim())
  const conclusiones = [observaciones?.trim(), recomendaciones?.trim() && `Recomendaciones y próximos pasos: ${recomendaciones.trim()}`]
    .filter(Boolean).join('\n\n')
  escribir(wb, 'Conclusiones', conclusiones)
  escribir(wb, 'Recomendacion', resultado)
  // Fecha como fecha de Excel (sin desfase horario): mediodía UTC del día indicado.
  escribir(wb, 'FechaEvaluacion', /^\d{4}-\d{2}-\d{2}$/.test(fechaEvaluacion || '') ? new Date(`${fechaEvaluacion}T12:00:00Z`) : null)
  escribir(wb, 'Evaluador', evaluador)
  const celdaFecha = celdaPorNombre(wb, 'FechaEvaluacion')
  if (celdaFecha) celdaFecha.numFmt = 'dd-mm-yyyy'

  const hoja = wb.getWorksheet('Competencias')
  const niveles = competencias || {}
  const evidencia = evidencias || {}
  for (const { fila, nombre } of filasCompetencias(wb)) {
    const nivel = Number(niveles[nombre])
    hoja.getCell(`C${fila}`).value = Number.isInteger(nivel) && nivel >= 1 && nivel <= 5 ? nivel : null
    const texto = typeof evidencia[nombre] === 'string' ? evidencia[nombre].trim() : ''
    const celda = hoja.getCell(`D${fila}`)
    celda.value = texto || null
    celda.alignment = { ...(celda.alignment || {}), wrapText: true, vertical: 'top' }
  }

  const titulo = celdaPorNombre(wb, 'Titulo')
  if (titulo && typeof titulo.value === 'string') {
    const base = titulo.value.replace(/\s*\(BORRADOR\)$/, '')
    titulo.value = borrador ? `${base} (BORRADOR)` : base
  }
  await guardar(wb, ruta)
}

/**
 * Prellena el informe recién copiado a la carpeta. Nunca lanza: si falla, la solicitud
 * queda creada igual y se devuelve el motivo para registrarlo.
 */
export async function prellenarInformeSeguro(documentos, datos) {
  const informe = documentos.find((d) => d.tipo === 'informe')
  if (!informe) return null
  try {
    await prellenarInforme(rutaAbsoluta(informe.ruta), datos)
    return null
  } catch (err) {
    console.error('[SIGMA-Aqua] No se pudo prellenar el informe:', err.message)
    return 'No se pudo prellenar el informe Excel'
  }
}
