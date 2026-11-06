import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { rmSync, unlinkSync } from 'node:fs'
import { extname } from 'node:path'
import { db } from '../db.js'
import { UPLOADS_TMP_DIR, crearCarpetaSolicitud } from '../carpetas.js'

const EXTENSIONES_PERMITIDAS = new Set(['.pdf', '.doc', '.docx'])
const MAX_MB = 10

// Los archivos llegan a una carpeta temporal y luego se mueven a la carpeta de la solicitud.
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_TMP_DIR),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONES_PERMITIDAS.has(extname(file.originalname).toLowerCase())) return cb(null, true)
    cb(Object.assign(new Error('Solo se aceptan archivos PDF, DOC o DOCX'), { status: 400 }))
  },
}).fields([
  { name: 'cv', maxCount: 1 },
  { name: 'descriptor', maxCount: 1 },
])

function recibirArchivos(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next()
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `Cada archivo debe pesar como máximo ${MAX_MB} MB` : err.message
      return res.status(400).json({ error: msg })
    }
    next(err)
  })
}

function borrarTemporales(files) {
  for (const f of Object.values(files || {}).flat()) {
    try {
      unlinkSync(f.path)
    } catch {
      // ya movido o inexistente
    }
  }
}

const texto = (v) => (typeof v === 'string' ? v.trim() : '')

const router = Router()

router.post('/', recibirArchivos, (req, res, next) => {
  const body = req.body || {}
  const campos = {
    reclutador: texto(body.reclutador),
    nombreCandidato: texto(body.nombreCandidato),
    origen: texto(body.origen),
    familiaCargo: texto(body.familiaCargo),
    nombreCargo: texto(body.nombreCargo),
    ubicacion: texto(body.ubicacion),
    unidad: texto(body.unidad),
    requiereReferencias: texto(body.requiereReferencias),
    ceco: texto(body.ceco),
    esReferido: texto(body.esReferido),
    aspectos: texto(body.aspectos),
  }
  const cv = req.files?.cv?.[0]
  const descriptor = req.files?.descriptor?.[0]

  if (!campos.nombreCandidato || !campos.familiaCargo || !campos.nombreCargo) {
    borrarTemporales(req.files)
    return res
      .status(400)
      .json({ error: 'Nombre del candidato, familia de cargo y nombre del cargo son obligatorios' })
  }
  if (!cv) {
    borrarTemporales(req.files)
    return res.status(400).json({ error: 'El CV del candidato es obligatorio' })
  }

  const creadoEn = new Date().toISOString()
  let carpetaCreada = null

  db.exec('BEGIN')
  try {
    const infoCandidato = db
      .prepare(
        'INSERT INTO candidatos (nombre, correo, telefono, cargo, familia_cargo, creado_en) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(campos.nombreCandidato, '', '', campos.nombreCargo, campos.familiaCargo, creadoEn)

    const infoSolicitud = db
      .prepare(
        `INSERT INTO solicitudes
         (candidato_id, cargo, familia_cargo, fecha_solicitud, estado, responsable_id, observaciones, creado_en,
          reclutador, origen, ubicacion, unidad, ceco, requiere_referencias, es_referido)
         VALUES (?, ?, ?, ?, 'Pendiente', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        infoCandidato.lastInsertRowid,
        campos.nombreCargo,
        campos.familiaCargo,
        creadoEn.slice(0, 10),
        campos.aspectos,
        creadoEn,
        campos.reclutador,
        campos.origen,
        campos.ubicacion,
        campos.unidad,
        campos.ceco,
        campos.requiereReferencias,
        campos.esReferido
      )
    const solicitudId = Number(infoSolicitud.lastInsertRowid)

    const resultado = crearCarpetaSolicitud({
      solicitudId,
      nombreCandidato: campos.nombreCandidato,
      familiaCargo: campos.familiaCargo,
      cv,
      descriptor,
      formulario: {
        solicitudId,
        recibidoEn: creadoEn,
        ...campos,
        cvOriginal: cv.originalname,
        descriptorOriginal: descriptor?.originalname ?? null,
      },
    })
    carpetaCreada = resultado.carpetaAbs

    db.prepare('UPDATE solicitudes SET carpeta = ? WHERE id = ?').run(resultado.carpeta, solicitudId)
    const insertDoc = db.prepare(
      'INSERT INTO documentos (solicitud_id, tipo, nombre, ruta, creado_en) VALUES (?, ?, ?, ?, ?)'
    )
    for (const d of resultado.documentos) insertDoc.run(solicitudId, d.tipo, d.nombre, d.ruta, creadoEn)

    db.exec('COMMIT')

    const solicitud = db
      .prepare(
        `SELECT s.*, c.nombre AS candidato_nombre, u.nombre AS responsable_nombre
         FROM solicitudes s
         JOIN candidatos c ON c.id = s.candidato_id
         LEFT JOIN usuarios u ON u.id = s.responsable_id
         WHERE s.id = ?`
      )
      .get(solicitudId)
    const documentos = db
      .prepare('SELECT id, tipo, nombre, creado_en FROM documentos WHERE solicitud_id = ? ORDER BY id')
      .all(solicitudId)

    res.status(201).json({ ...solicitud, documentos, advertencias: resultado.advertencias })
  } catch (err) {
    db.exec('ROLLBACK')
    if (carpetaCreada) rmSync(carpetaCreada, { recursive: true, force: true })
    borrarTemporales(req.files)
    next(err)
  }
})

export default router
