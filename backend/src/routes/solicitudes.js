import { Router } from 'express'
import { db, ESTADOS } from '../db.js'
import { notify } from './extra.js'
import { audit, requireRole } from '../security.js'

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

router.get('/:id', (req, res) => {
  const row = db.prepare(`${SOLICITUD_SELECT} WHERE s.id = ?`).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Solicitud no encontrada' })
  const evaluacion = db
    .prepare('SELECT * FROM evaluaciones WHERE solicitud_id = ?')
    .get(req.params.id)
  const documentos = db
    .prepare('SELECT id, tipo, nombre, creado_en FROM documentos WHERE solicitud_id = ? ORDER BY id')
    .all(req.params.id)
  res.json({ ...row, evaluacion: evaluacion || null, documentos })
})

router.post('/', requireRole('Administrador','Analista','Jefatura'), (req, res) => {
  const { candidatoId, cargo, familiaCargo, fechaSolicitud, estado, responsableId, observaciones } = req.body || {}
  if (!candidatoId || !cargo || !familiaCargo) {
    return res.status(400).json({ error: 'Candidato, cargo y familia de cargo son obligatorios' })
  }
  const candidato = db.prepare('SELECT id FROM candidatos WHERE id = ?').get(candidatoId)
  if (!candidato) return res.status(400).json({ error: 'Candidato no existe' })

  const creadoEn = new Date().toISOString()
  const info = db
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
  notify(responsableId,'Nueva evaluación asignada',`Solicitud #${info.lastInsertRowid}: ${cargo}`,`/solicitudes/${info.lastInsertRowid}`)
  audit(req,'Solicitud creada',String(info.lastInsertRowid))
  registrarHistorial(info.lastInsertRowid, 'Solicitud creada', `Estado inicial: ${estado || 'Pendiente'}`)
  const row = db.prepare(`${SOLICITUD_SELECT} WHERE s.id = ?`).get(info.lastInsertRowid)
  res.status(201).json(row)
})

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

router.post('/:id/evaluacion', requireRole('Administrador','Jefatura','Evaluador'), (req, res) => {
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
  res.status(201).json(evaluacion)
})

export default router
