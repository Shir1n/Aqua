import { Router } from 'express'
import { rmSync } from 'node:fs'
import { db } from '../db.js'
import { CODIGOS_FAMILIA, crearCarpetaSolicitud } from '../carpetas.js'
import { borrarTemporales, recibirArchivos } from '../subidas.js'
import { antecedentesSugeridos, prellenarInformeSeguro } from '../informe.js'
import { asincrono } from '../asincrono.js'
import { notify } from './extra.js'

// Ruta pública (formulario sin sesión): se limita tipo/tamaño de archivo (subidas.js) y frecuencia de envío.
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

const texto = (v) => (typeof v === 'string' ? v.trim() : '')

const router = Router()

router.post('/', limitarEnvios, recibirArchivos, asincrono(async (req, res, next) => {
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

  const rechazar = (error) => {
    borrarTemporales(req.files)
    return res.status(400).json({ error })
  }
  if (!cv) return rechazar('Debes adjuntar el CV del candidato (PDF, DOC o DOCX)')
  if (!campos.nombreCandidato || !campos.familiaCargo || !campos.nombreCargo) {
    return rechazar('Nombre del candidato, familia de cargo y nombre del cargo son obligatorios')
  }
  if (!(campos.familiaCargo in CODIGOS_FAMILIA)) return rechazar('Familia de cargo no válida')

  const creadoEn = new Date().toISOString()
  let carpetaCreada = null
  let solicitudId
  let documentosCreados = []

  db.exec('BEGIN')
  try {
    const infoCandidato = db
      .prepare('INSERT INTO candidatos (nombre, correo, telefono, cargo, familia_cargo, creado_en) VALUES (?, ?, ?, ?, ?, ?)')
      .run(campos.nombreCandidato, '', '', campos.nombreCargo, campos.familiaCargo, creadoEn)

    const infoSolicitud = db
      .prepare(
        `INSERT INTO solicitudes
         (candidato_id, cargo, familia_cargo, fecha_solicitud, estado, responsable_id, observaciones, creado_en,
          reclutador, origen, ubicacion, unidad, ceco, requiere_referencias, es_referido)
         VALUES (?, ?, ?, ?, 'Pendiente', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        infoCandidato.lastInsertRowid, campos.nombreCargo, campos.familiaCargo, creadoEn.slice(0, 10),
        campos.aspectos, creadoEn, campos.reclutador, campos.origen, campos.ubicacion, campos.unidad,
        campos.ceco, campos.requiereReferencias, campos.esReferido
      )
    solicitudId = Number(infoSolicitud.lastInsertRowid)

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
    documentosCreados = resultado.documentos

    db.prepare('UPDATE solicitudes SET carpeta = ? WHERE id = ?').run(resultado.carpeta, solicitudId)
    const insertDoc = db.prepare('INSERT INTO documentos (solicitud_id, tipo, nombre, ruta, creado_en) VALUES (?, ?, ?, ?, ?)')
    for (const d of resultado.documentos) insertDoc.run(solicitudId, d.tipo, d.nombre, d.ruta, creadoEn)

    const detalle = [campos.reclutador && `Reclutador/a: ${campos.reclutador}`, ...resultado.advertencias].filter(Boolean).join(' · ')
    db.prepare('INSERT INTO historial_solicitudes (solicitud_id, accion, detalle, usuario, creado_en) VALUES (?, ?, ?, ?, ?)')
      .run(solicitudId, 'Solicitud recibida', detalle, 'Formulario de solicitud', creadoEn)

    // Avisa a quienes asignan evaluaciones.
    const destinatarios = db.prepare("SELECT id FROM usuarios WHERE activo = 1 AND rol IN ('Administrador','Analista','Jefatura')").all()
    for (const u of destinatarios) {
      notify(u.id, 'Nueva solicitud recibida', `Solicitud #${solicitudId}: ${campos.nombreCandidato} — ${campos.nombreCargo}`, `/solicitudes/${solicitudId}`)
    }

    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    if (carpetaCreada) rmSync(carpetaCreada, { recursive: true, force: true })
    borrarTemporales(req.files)
    return next(err)
  }

  const antecedentes = antecedentesSugeridos({
    origen: campos.origen, ubicacion: campos.ubicacion, unidad: campos.unidad, ceco: campos.ceco,
    reclutador: campos.reclutador, fecha_solicitud: new Date().toISOString().slice(0, 10),
    es_referido: campos.esReferido, requiere_referencias: campos.requiereReferencias, observaciones: campos.aspectos,
  })
  const aviso = await prellenarInformeSeguro(documentosCreados, { candidato: campos.nombreCandidato, cargo: campos.nombreCargo, familiaCargo: campos.familiaCargo, antecedentes })
  if (aviso) {
    db.prepare('INSERT INTO historial_solicitudes (solicitud_id, accion, detalle, usuario, creado_en) VALUES (?, ?, ?, ?, ?)')
      .run(solicitudId, 'Advertencia', aviso, 'Sistema', new Date().toISOString())
  }
  res.status(201).json({ id: solicitudId, mensaje: 'Solicitud registrada' })
}))

export default router
