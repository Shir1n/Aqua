import { Router } from 'express'
import multer from 'multer'
import { db } from '../db.js'
import { mkdirSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = join(__dirname, '..', '..', 'data', 'uploads')
mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  },
})

// Ruta pública (formulario sin sesión): se limita tipo/tamaño de archivo y frecuencia de envío.
const EXTENSIONES = new Set(['.pdf', '.doc', '.docx'])
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 2, fields: 20, fieldSize: 5000 },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONES.has(extname(file.originalname).toLowerCase())) return cb(null, true)
    const err = new Error('Formato no permitido: solo PDF, DOC o DOCX')
    err.status = 400
    cb(err)
  },
})
const recibirArchivos = upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'descriptor', maxCount: 1 },
])

const VENTANA_MS = 10 * 60 * 1000
const MAX_ENVIOS = 20
const envios = new Map()
function limitarEnvios(req, res, next) {
  const ahora = Date.now()
  const lista = (envios.get(req.ip) || []).filter((t) => ahora - t < VENTANA_MS)
  if (lista.length >= MAX_ENVIOS) return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' })
  lista.push(ahora)
  envios.set(req.ip, lista)
  if (envios.size > 5000) for (const [k, v] of envios) if (!v.some((t) => ahora - t < VENTANA_MS)) envios.delete(k)
  next()
}

const router = Router()

router.post(
  '/',
  limitarEnvios,
  (req, res, next) =>
    recibirArchivos(req, res, (err) => {
      if (!err) return next()
      if (err instanceof multer.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Cada archivo puede pesar como máximo 10 MB' : 'Archivos o campos no válidos'
        return res.status(400).json({ error: msg })
      }
      next(err)
    }),
  (req, res) => {
    const {
      reclutador,
      nombreCandidato,
      origen,
      familiaCargo,
      nombreCargo,
      ubicacion,
      unidad,
      requiereReferencias,
      ceco,
      esReferido,
      aspectos,
    } = req.body || {}

    const cv = req.files?.cv?.[0]
    const descriptor = req.files?.descriptor?.[0]

    if (!cv) {
      return res.status(400).json({ error: 'Debes adjuntar el CV del candidato (PDF, DOC o DOCX)' })
    }
    if (!nombreCandidato || !familiaCargo || !nombreCargo) {
      return res
        .status(400)
        .json({ error: 'Nombre del candidato, familia de cargo y nombre del cargo son obligatorios' })
    }

    const creadoEn = new Date().toISOString()

    const insertCandidato = db.prepare(
      'INSERT INTO candidatos (nombre, correo, telefono, cargo, familia_cargo, creado_en) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const infoCandidato = insertCandidato.run(
      nombreCandidato.trim(),
      '',
      '',
      nombreCargo.trim(),
      familiaCargo.trim(),
      creadoEn
    )

    const observaciones = [
      reclutador ? `Reclutador: ${reclutador.trim()}` : '',
      origen ? `Origen: ${origen}` : '',
      ubicacion ? `Ubicación: ${ubicacion.trim()}` : '',
      unidad ? `Unidad: ${unidad.trim()}` : '',
      ceco ? `CECO: ${ceco.trim()}` : '',
      requiereReferencias ? `Requiere referencias: ${requiereReferencias}` : '',
      esReferido ? `Referido: ${esReferido}` : '',
      cv ? `CV: ${cv.filename}` : '',
      descriptor ? `Descriptor: ${descriptor.filename}` : '',
      aspectos?.trim(),
    ]
      .filter(Boolean)
      .join('\n')

    const insertSolicitud = db.prepare(
      `INSERT INTO solicitudes
       (candidato_id, cargo, familia_cargo, fecha_solicitud, estado, responsable_id, observaciones, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const infoSolicitud = insertSolicitud.run(
      infoCandidato.lastInsertRowid,
      nombreCargo.trim(),
      familiaCargo.trim(),
      creadoEn.slice(0, 10),
      'Pendiente',
      null,
      observaciones,
      creadoEn
    )

    res.status(201).json({ id: Number(infoSolicitud.lastInsertRowid), mensaje: 'Solicitud registrada' })
  }
)

export default router
