import { Router } from 'express'
import { db, ESTADOS } from '../db.js'
import { notify } from './extra.js'
import { audit, requireRole } from '../security.js'
import { rmSync, unlinkSync } from 'node:fs'
import { crearCarpetaSolicitud, guardarArchivoEnCarpeta, rutaAbsoluta } from '../carpetas.js'
import { borrarTemporales, recibirArchivos } from '../subidas.js'
import { competenciasDeFamilia, escribirEvaluacion, prellenarInformeSeguro } from '../informe.js'
import { asincrono } from '../asincrono.js'

const router = Router()

function registrarHistorial(solicitudId, accion, detalle = '', usuario = 'Sistema') {
  db.prepare('INSERT INTO historial_solicitudes (solicitud_id, accion, detalle, usuario, creado_en) VALUES (?, ?, ?, ?, ?)')
    .run(solicitudId, accion, detalle, usuario, new Date().toISOString())
}

// Una solicitud solo puede cerrarse con una evaluación final que tenga resultado y fecha.
function evaluacionFinalCompleta(solicitudId) {
  const e = db.prepare('SELECT resultado, fecha_evaluacion, borrador FROM evaluaciones WHERE solicitud_id = ?').get(solicitudId)
  return Boolean(e && e.borrador === 0 && e.resultado && e.fecha_evaluacion)
}
const ERROR_SIN_EVALUACION = 'Finaliza primero la evaluación con resultado y fecha antes de cerrar la solicitud'

const SOLICITUD_SELECT = `
  SELECT s.*, c.nombre AS candidato_nombre, u.nombre AS responsable_nombre
  FROM solicitudes s
  JOIN candidatos c ON c.id = s.candidato_id
  LEFT JOIN usuarios u ON u.id = s.responsable_id
`

router.get('/', (req, res) => {
  const estado = (req.query.estado || '').toString().trim()
  const q = (req.query.q || '').toString().trim()
  const conds = []
  const params = []

  if (estado) {
    conds.push('s.estado = ?')
    params.push(estado)
  }
  if (q) {
    conds.push('(c.nombre LIKE ? OR s.cargo LIKE ? OR s.familia_cargo LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const rows = db.prepare(`${SOLICITUD_SELECT} ${where} ORDER BY s.id DESC`).all(...params)
  res.json(rows)
})

router.get('/:id', asincrono(async (req, res, next) => {
  try {
  const row = db.prepare(`${SOLICITUD_SELECT} WHERE s.id = ?`).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Solicitud no encontrada' })
  const evaluacion = db
    .prepare('SELECT * FROM evaluaciones WHERE solicitud_id = ?')
    .get(req.params.id)
  const documentos = db
    .prepare('SELECT id, tipo, nombre, creado_en FROM documentos WHERE solicitud_id = ? ORDER BY id')
    .all(req.params.id)
  // Competencias de la familia según su plantilla de informe (las mismas que se escriben en el Excel).
  const competencias_familia = await competenciasDeFamilia(row.familia_cargo).catch(() => [])
  res.json({ ...row, evaluacion: evaluacion || null, documentos, competencias_familia })
  } catch (err) { next(err) }
}))

router.post('/', requireRole('Administrador','Analista','Jefatura'), asincrono(async (req, res, next) => {
  const { candidatoId, cargo, familiaCargo, fechaSolicitud, estado, responsableId, observaciones } = req.body || {}
  if (!candidatoId || !cargo || !familiaCargo) {
    return res.status(400).json({ error: 'Candidato, cargo y familia de cargo son obligatorios' })
  }
  const candidato = db.prepare('SELECT id, nombre FROM candidatos WHERE id = ?').get(candidatoId)
  if (!candidato) return res.status(400).json({ error: 'Candidato no existe' })
  if (estado !== undefined && !ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' })
  if (estado === 'Finalizada') return res.status(400).json({ error: 'Una solicitud nueva no puede crearse finalizada' })
  if (responsableId && !db.prepare('SELECT id FROM usuarios WHERE id = ? AND activo = 1').get(responsableId)) {
    return res.status(400).json({ error: 'El responsable no existe o está desactivado' })
  }

  const creadoEn = new Date().toISOString()
  let carpetaCreada = null
  let documentosCreados = []
  let info
  db.exec('BEGIN')
  try {
    info = db
      .prepare(
        `INSERT INTO solicitudes
         (candidato_id, cargo, familia_cargo, fecha_solicitud, estado, responsable_id, observaciones, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        candidatoId,
        cargo,
        familiaCargo,
        fechaSolicitud || new Date().toISOString().slice(0, 10),
        estado || 'Pendiente',
        responsableId || null,
        observaciones || '',
        creadoEn
      )
    // Igual que el formulario público: carpeta con formulario y plantillas; el CV se adjunta después.
    const solicitudId = Number(info.lastInsertRowid)
    const carpeta = crearCarpetaSolicitud({
      solicitudId,
      nombreCandidato: candidato.nombre,
      familiaCargo,
      formulario: { solicitudId, recibidoEn: creadoEn, origenRegistro: 'Panel', creadoPor: req.user.nombre, candidato: candidato.nombre, cargo, familiaCargo, observaciones: observaciones || '' },
    })
    carpetaCreada = carpeta.carpetaAbs
    documentosCreados = carpeta.documentos
    db.prepare('UPDATE solicitudes SET carpeta = ? WHERE id = ?').run(carpeta.carpeta, solicitudId)
    const insertDoc = db.prepare('INSERT INTO documentos (solicitud_id, tipo, nombre, ruta, creado_en) VALUES (?, ?, ?, ?, ?)')
    for (const d of carpeta.documentos) insertDoc.run(solicitudId, d.tipo, d.nombre, d.ruta, creadoEn)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    if (carpetaCreada) rmSync(carpetaCreada, { recursive: true, force: true })
    return next(err)
  }
  const aviso = await prellenarInformeSeguro(documentosCreados, { candidato: candidato.nombre, cargo, familiaCargo })
  if (aviso) registrarHistorial(info.lastInsertRowid, 'Advertencia', aviso)
  notify(responsableId,'Nueva evaluación asignada',`Solicitud #${info.lastInsertRowid}: ${cargo}`,`/solicitudes/${info.lastInsertRowid}`)
  audit(req,'Solicitud creada',String(info.lastInsertRowid))
  registrarHistorial(info.lastInsertRowid, 'Solicitud creada', `Estado inicial: ${estado || 'Pendiente'}`, req.user.nombre)
  const row = db.prepare(`${SOLICITUD_SELECT} WHERE s.id = ?`).get(info.lastInsertRowid)
  res.status(201).json(row)
}))

// Adjunta o reemplaza el CV y/o el descriptor de una solicitud (p. ej. las creadas desde el panel).
router.post('/:id/documentos', requireRole('Administrador','Analista','Jefatura'), recibirArchivos, asincrono(async (req, res, next) => {
  const files = req.files || {}
  const solicitud = db.prepare(
    'SELECT s.id, s.carpeta, s.cargo, s.familia_cargo, c.nombre AS candidato_nombre FROM solicitudes s JOIN candidatos c ON c.id = s.candidato_id WHERE s.id = ?'
  ).get(req.params.id)
  if (!solicitud) { borrarTemporales(files); return res.status(404).json({ error: 'Solicitud no encontrada' }) }
  const nuevos = ['cv', 'descriptor'].filter((t) => files[t]?.[0])
  if (!nuevos.length) return res.status(400).json({ error: 'Adjunta un CV o un descriptor (PDF, DOC o DOCX)' })

  const creadoEn = new Date().toISOString()
  let documentosNuevaCarpeta = []
  try {
    let carpeta = solicitud.carpeta
    if (!carpeta) {
      // Solicitudes antiguas sin carpeta: se crea completa, con plantillas.
      const r = crearCarpetaSolicitud({
        solicitudId: solicitud.id,
        nombreCandidato: solicitud.candidato_nombre,
        familiaCargo: solicitud.familia_cargo,
        formulario: { solicitudId: solicitud.id, recibidoEn: creadoEn, origenRegistro: 'Carpeta creada al adjuntar documentos' },
      })
      carpeta = r.carpeta
      db.prepare('UPDATE solicitudes SET carpeta = ? WHERE id = ?').run(carpeta, solicitud.id)
      const insertDoc = db.prepare('INSERT INTO documentos (solicitud_id, tipo, nombre, ruta, creado_en) VALUES (?, ?, ?, ?, ?)')
      for (const d of r.documentos) insertDoc.run(solicitud.id, d.tipo, d.nombre, d.ruta, creadoEn)
      documentosNuevaCarpeta = r.documentos
    }
    for (const tipo of nuevos) {
      const anteriores = db.prepare('SELECT id, ruta FROM documentos WHERE solicitud_id = ? AND tipo = ?').all(solicitud.id, tipo)
      const doc = guardarArchivoEnCarpeta({ carpeta, nombreCandidato: solicitud.candidato_nombre, tipo, file: files[tipo][0] })
      for (const a of anteriores) {
        if (a.ruta !== doc.ruta) { try { unlinkSync(rutaAbsoluta(a.ruta)) } catch { /* ya no existe */ } }
        db.prepare('DELETE FROM documentos WHERE id = ?').run(a.id)
      }
      db.prepare('INSERT INTO documentos (solicitud_id, tipo, nombre, ruta, creado_en) VALUES (?, ?, ?, ?, ?)').run(solicitud.id, tipo, doc.nombre, doc.ruta, creadoEn)
      registrarHistorial(solicitud.id, `${tipo === 'cv' ? 'CV' : 'Descriptor'} ${anteriores.length ? 'reemplazado' : 'adjuntado'}`, doc.nombre, req.user.nombre)
    }
  } catch (err) {
    borrarTemporales(files)
    return next(err)
  }
  if (documentosNuevaCarpeta.length) {
    const aviso = await prellenarInformeSeguro(documentosNuevaCarpeta, { candidato: solicitud.candidato_nombre, cargo: solicitud.cargo, familiaCargo: solicitud.familia_cargo })
    if (aviso) registrarHistorial(solicitud.id, 'Advertencia', aviso)
  }
  audit(req, 'Documentos adjuntados', `Solicitud ${solicitud.id}: ${nuevos.join(', ')}`)
  res.status(201).json(db.prepare('SELECT id, tipo, nombre, creado_en FROM documentos WHERE solicitud_id = ? ORDER BY id').all(solicitud.id))
}))

router.put('/:id', requireRole('Administrador','Analista','Jefatura','Evaluador'), (req, res) => {
  const existing = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Solicitud no encontrada' })
  if (req.user.rol === 'Evaluador' && existing.responsable_id !== req.user.id) return res.status(403).json({error:'Esta solicitud no está asignada a tu cuenta'})
  const body = req.body || {}
  const { estado, observaciones } = body
  const nuevoEstado = estado ?? existing.estado
  // `responsableId: null` desasigna; si no viene el campo, se conserva el actual.
  const nuevoResponsable = Object.hasOwn(body, 'responsableId') ? (body.responsableId === null || body.responsableId === '' ? null : Number(body.responsableId)) : existing.responsable_id
  const nuevasObservaciones = observaciones ?? existing.observaciones

  if (!ESTADOS.includes(nuevoEstado)) return res.status(400).json({ error: 'Estado inválido' })
  if (observaciones !== undefined && typeof observaciones !== 'string') return res.status(400).json({ error: 'Observaciones inválidas' })
  if (nuevoEstado === 'Finalizada' && existing.estado !== 'Finalizada' && !evaluacionFinalCompleta(existing.id)) {
    return res.status(409).json({ error: ERROR_SIN_EVALUACION })
  }
  if (nuevoResponsable !== existing.responsable_id) {
    if (req.user.rol === 'Evaluador') return res.status(403).json({ error: 'Solo Analistas, Jefatura o Administración pueden reasignar solicitudes' })
    if (nuevoResponsable !== null) {
      const u = Number.isInteger(nuevoResponsable) && db.prepare('SELECT id FROM usuarios WHERE id = ? AND activo = 1').get(nuevoResponsable)
      if (!u) return res.status(400).json({ error: 'El responsable no existe o está desactivado' })
    }
  }
  db.prepare(
    'UPDATE solicitudes SET estado = ?, responsable_id = ?, observaciones = ? WHERE id = ?'
  ).run(
    nuevoEstado,
    nuevoResponsable,
    nuevasObservaciones,
    req.params.id
  )
  if (nuevoEstado !== existing.estado) { notify(nuevoResponsable,'Estado de solicitud actualizado',`Solicitud #${req.params.id}: ${nuevoEstado}`,`/solicitudes/${req.params.id}`); audit(req,'Estado cambiado',`${req.params.id}: ${nuevoEstado}`) }
  if (nuevoEstado !== existing.estado) registrarHistorial(req.params.id, 'Cambio de estado', `${existing.estado} → ${nuevoEstado}`, req.user.nombre)
  if (nuevasObservaciones !== existing.observaciones) registrarHistorial(req.params.id, 'Observaciones actualizadas', nuevasObservaciones || 'Sin observaciones', req.user.nombre)
  if (nuevoResponsable !== existing.responsable_id) notify(nuevoResponsable,'Evaluación asignada',`Solicitud #${req.params.id}`,`/solicitudes/${req.params.id}`)
  if (nuevoResponsable !== existing.responsable_id) {
    const nombre = nuevoResponsable === null ? 'Sin asignar' : db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(nuevoResponsable)?.nombre
    registrarHistorial(req.params.id, 'Responsable actualizado', nombre || `ID ${nuevoResponsable}`, req.user.nombre)
  }
  const row = db.prepare(`${SOLICITUD_SELECT} WHERE s.id = ?`).get(req.params.id)
  res.json(row)
})

router.patch('/:id/estado', requireRole('Administrador','Analista','Jefatura','Evaluador'), (req,res)=>{
 const estado=req.body?.estado
 if(!['Pendiente','En proceso','Finalizada'].includes(estado))return res.status(400).json({error:'Estado inválido'})
 const existing=db.prepare('SELECT * FROM solicitudes WHERE id=?').get(req.params.id)
 if(!existing)return res.status(404).json({error:'Solicitud no encontrada'})
 if(req.user.rol==='Evaluador'&&existing.responsable_id!==req.user.id)return res.status(403).json({error:'Solicitud no asignada a tu cuenta'})
 if(estado==='Finalizada'){
  if(!evaluacionFinalCompleta(existing.id))return res.status(409).json({error:ERROR_SIN_EVALUACION})
 }
 if(estado!==existing.estado){
  db.prepare('UPDATE solicitudes SET estado=? WHERE id=?').run(estado,existing.id)
  registrarHistorial(existing.id,'Cambio de estado',`${existing.estado} → ${estado}`,req.user.nombre)
  audit(req,'Estado cambiado',`${existing.id}: ${existing.estado} → ${estado}`)
  notify(existing.responsable_id,'Estado actualizado',`Solicitud #${existing.id}: ${estado}`,`/solicitudes/${existing.id}`)
 }
 res.json(db.prepare(`${SOLICITUD_SELECT} WHERE s.id=?`).get(existing.id))
})

router.get('/:id/historial', (req, res) => {
  const solicitud = db.prepare('SELECT id FROM solicitudes WHERE id = ?').get(req.params.id)
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' })
  res.json(db.prepare('SELECT * FROM historial_solicitudes WHERE solicitud_id = ? ORDER BY id DESC').all(req.params.id))
})

router.get('/:id/evaluacion', (req, res) => {
  const solicitud = db.prepare('SELECT id FROM solicitudes WHERE id = ?').get(req.params.id)
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' })
  const evaluacion = db
    .prepare('SELECT * FROM evaluaciones WHERE solicitud_id = ?')
    .get(req.params.id)
  res.json(evaluacion || null)
})

router.post('/:id/evaluacion', requireRole('Administrador','Jefatura','Evaluador'), asincrono(async (req, res, next) => {
  const solicitud = db.prepare('SELECT id,responsable_id FROM solicitudes WHERE id = ?').get(req.params.id)
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' })
  const { fechaEvaluacion, resultado, observaciones, estado, competencias, recomendaciones, borrador } = req.body || {}
  if (!['Administrador','Jefatura'].includes(req.user.rol) && solicitud.responsable_id !== req.user.id) return res.status(403).json({error:'Solo el evaluador asignado puede modificar esta evaluación'})
  if (borrador === false && (!resultado || !fechaEvaluacion)) return res.status(400).json({error:'Para finalizar, registra fecha y resultado'})
  const creadoEn = new Date().toISOString()

  const existing = db
    .prepare('SELECT id FROM evaluaciones WHERE solicitud_id = ?')
    .get(req.params.id)

  if (existing) {
    db.prepare(
      'UPDATE evaluaciones SET fecha_evaluacion = ?, resultado = ?, observaciones = ?, estado = ? WHERE id = ?'
    ).run(
      fechaEvaluacion ?? '',
      resultado ?? '',
      observaciones ?? '',
      estado ?? 'En proceso',
      existing.id
    )
  } else {
    db.prepare(
      'INSERT INTO evaluaciones (solicitud_id, fecha_evaluacion, resultado, observaciones, estado, creado_en) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.params.id,
      fechaEvaluacion || '',
      resultado || '',
      observaciones || '',
      estado || 'En proceso',
      creadoEn
    )
  }

  db.prepare('UPDATE evaluaciones SET competencias=?,recomendaciones=?,borrador=? WHERE solicitud_id=?').run(JSON.stringify(competencias||{}),String(recomendaciones||''),borrador===false?0:1,req.params.id)
  if (borrador===false && estado==='Finalizada') { db.prepare("UPDATE solicitudes SET estado='Finalizada' WHERE id=?").run(req.params.id); registrarHistorial(req.params.id,'Evaluación finalizada',resultado,req.user.nombre); notify(solicitud.responsable_id,'Evaluación finalizada',`Solicitud #${req.params.id}`,`/solicitudes/${req.params.id}`) }
  audit(req,'Evaluación guardada',`Solicitud ${req.params.id}, borrador=${borrador!==false}`)
  const evaluacion = db.prepare('SELECT * FROM evaluaciones WHERE solicitud_id = ?').get(req.params.id)

  // Traspasa la evaluación al informe Excel de la carpeta. Si falla, la evaluación queda guardada igual.
  let advertencia_informe = null
  const informe = db.prepare("SELECT ruta FROM documentos WHERE solicitud_id = ? AND tipo = 'informe' ORDER BY id DESC").get(req.params.id)
  if (informe) {
    try {
      const evaluador = solicitud.responsable_id
        ? db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(solicitud.responsable_id)?.nombre
        : req.user.nombre
      await escribirEvaluacion(rutaAbsoluta(informe.ruta), {
        fechaEvaluacion: evaluacion.fecha_evaluacion,
        evaluador,
        resultado: evaluacion.resultado,
        observaciones: evaluacion.observaciones,
        recomendaciones: evaluacion.recomendaciones,
        competencias: (() => { try { return JSON.parse(evaluacion.competencias || '{}') } catch { return {} } })(),
        borrador: evaluacion.borrador !== 0,
      })
    } catch (err) {
      console.error('[SIGMA-Aqua] No se pudo escribir el informe Excel:', err.message)
      advertencia_informe = 'La evaluación se guardó, pero no se pudo actualizar el informe Excel (¿está abierto o fue movido?).'
    }
  }
  res.status(201).json({ ...evaluacion, advertencia_informe })
}))

export default router
