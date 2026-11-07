import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const DATA_DIR = resolve(__dirname, '..', 'data')
export const SOLICITUDES_DIR = join(DATA_DIR, 'solicitudes')
export const UPLOADS_TMP_DIR = join(DATA_DIR, 'uploads', 'tmp')
export const PLANTILLAS_DIR = resolve(__dirname, '..', '..', 'plantillas')

mkdirSync(SOLICITUDES_DIR, { recursive: true })
mkdirSync(UPLOADS_TMP_DIR, { recursive: true })

// Familia visible → código usado para resolver plantillas (<COD>-informe.xlsx / <COD>-pauta.docx).
export const CODIGOS_FAMILIA = {
  'Profesional A': 'PRA',
  'Profesional B C': 'PBC',
  'Técnico A': 'TEA',
  'Técnico B C': 'TBC',
  'Operario Calificado': 'OPC',
  'Supervisor B': 'SUP',
  Jefatura: 'JEF',
}

/** "Juan Pérez " → "Juan_Perez" (sin tildes ni caracteres inválidos para SharePoint). */
export function normalizarNombre(nombre) {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Candidato'
  )
}

/** Ruta absoluta de un documento guardado, validando que no salga de DATA_DIR. */
export function rutaAbsoluta(rutaRelativa) {
  const abs = resolve(DATA_DIR, rutaRelativa)
  if (abs !== DATA_DIR && !abs.startsWith(DATA_DIR + sep)) {
    throw Object.assign(new Error('Ruta de documento inválida'), { status: 400 })
  }
  return abs
}

/**
 * Crea la carpeta de la solicitud con CV, descriptor, formulario y plantillas.
 * Devuelve la carpeta (relativa a DATA_DIR), los documentos creados y advertencias.
 * Si algo falla, borra la carpeta y relanza el error.
 */
export function crearCarpetaSolicitud({ solicitudId, nombreCandidato, familiaCargo, cv, descriptor, formulario }) {
  const nombre = normalizarNombre(nombreCandidato)
  const carpetaAbs = join(SOLICITUDES_DIR, `${String(solicitudId).padStart(4, '0')}_${nombre}`)
  const documentos = []
  const advertencias = []

  const registrar = (tipo, archivoAbs) => {
    documentos.push({
      tipo,
      nombre: archivoAbs.slice(carpetaAbs.length + 1),
      ruta: relative(DATA_DIR, archivoAbs).split(sep).join('/'),
    })
  }

  mkdirSync(carpetaAbs, { recursive: false })
  try {
    if (cv) {
      const destino = join(carpetaAbs, `CV_${nombre}${extname(cv.originalname).toLowerCase()}`)
      renameSync(cv.path, destino)
      registrar('cv', destino)
    }
    if (descriptor) {
      const destino = join(carpetaAbs, `Descriptor_${nombre}${extname(descriptor.originalname).toLowerCase()}`)
      renameSync(descriptor.path, destino)
      registrar('descriptor', destino)
    }

    const formularioAbs = join(carpetaAbs, `Formulario_${nombre}.json`)
    writeFileSync(formularioAbs, JSON.stringify(formulario, null, 2), 'utf8')
    registrar('formulario', formularioAbs)

    const codigo = CODIGOS_FAMILIA[familiaCargo]
    if (!codigo) {
      advertencias.push(`Familia de cargo sin código de plantillas: ${familiaCargo}`)
    } else {
      const plantillas = [
        ['informe', join(PLANTILLAS_DIR, 'Informes', `${codigo}-informe.xlsx`), `Informe_${nombre}.xlsx`],
        ['pauta', join(PLANTILLAS_DIR, 'Pautas', `${codigo}-pauta.docx`), `PautaEntrevista_${nombre}.docx`],
      ]
      for (const [tipo, origen, destinoNombre] of plantillas) {
        if (!existsSync(origen)) {
          advertencias.push(`No existe la plantilla ${relative(PLANTILLAS_DIR, origen).split(sep).join('/')}`)
          continue
        }
        const destino = join(carpetaAbs, destinoNombre)
        copyFileSync(origen, destino)
        registrar(tipo, destino)
      }
    }
  } catch (err) {
    rmSync(carpetaAbs, { recursive: true, force: true })
    throw err
  }

  return {
    carpeta: relative(DATA_DIR, carpetaAbs).split(sep).join('/'),
    carpetaAbs,
    documentos,
    advertencias,
  }
}

const PREFIJO_ARCHIVO = { cv: 'CV', descriptor: 'Descriptor' }

/**
 * Mueve un archivo subido (CV o descriptor) a una carpeta de solicitud que ya existe.
 * Devuelve el documento a registrar. Si ya había uno del mismo tipo con el mismo nombre,
 * se sobrescribe; el llamador borra el registro y el archivo anteriores.
 */
export function guardarArchivoEnCarpeta({ carpeta, nombreCandidato, tipo, file }) {
  const carpetaAbs = rutaAbsoluta(carpeta)
  if (!existsSync(carpetaAbs)) mkdirSync(carpetaAbs, { recursive: true })
  const nombre = `${PREFIJO_ARCHIVO[tipo]}_${normalizarNombre(nombreCandidato)}${extname(file.originalname).toLowerCase()}`
  const destino = join(carpetaAbs, nombre)
  renameSync(file.path, destino)
  return { tipo, nombre, ruta: relative(DATA_DIR, destino).split(sep).join('/') }
}

/** Borra la carpeta de una solicitud (ruta relativa a DATA_DIR). No falla si no existe. */
export function borrarCarpeta(carpeta) {
  if (!carpeta) return
  const abs = rutaAbsoluta(carpeta)
  if (!abs.startsWith(SOLICITUDES_DIR + sep)) return
  rmSync(abs, { recursive: true, force: true })
}
