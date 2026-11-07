import { Router } from 'express'
import { db } from '../db.js'
import { requireRole, audit } from '../security.js'
import { borrarCarpeta } from '../carpetas.js'

const router = Router()

router.get('/', (req, res) => {
  const q = (req.query.q || '').toString().trim()
  let rows
  if (q) {
    rows = db
      .prepare(
        `SELECT * FROM candidatos
         WHERE nombre LIKE ? OR correo LIKE ? OR cargo LIKE ? OR familia_cargo LIKE ?
         ORDER BY id DESC`
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  } else {
    rows = db.prepare('SELECT * FROM candidatos ORDER BY id DESC').all()
  }
  res.json(rows)
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM candidatos WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Candidato no encontrado' })
  res.json(row)
})

router.get('/:id/historial', (req,res)=>{
 const candidato=db.prepare('SELECT id,nombre FROM candidatos WHERE id=?').get(req.params.id)
 if(!candidato)return res.status(404).json({error:'Candidato no encontrado'})
 const solicitudes=db.prepare(`SELECT s.*,u.nombre AS responsable_nombre,e.fecha_evaluacion,e.resultado,e.estado AS estado_evaluacion,e.borrador
 FROM solicitudes s LEFT JOIN usuarios u ON u.id=s.responsable_id LEFT JOIN evaluaciones e ON e.solicitud_id=s.id
 WHERE s.candidato_id=? ORDER BY s.id DESC`).all(candidato.id)
 const historial=db.prepare(`SELECT h.* FROM historial_solicitudes h JOIN solicitudes s ON s.id=h.solicitud_id WHERE s.candidato_id=? ORDER BY h.creado_en DESC LIMIT 100`).all(candidato.id)
 res.json({candidato,solicitudes,historial})
})

router.post('/', requireRole('Administrador','Analista','Jefatura'), (req, res) => {
  const { nombre, correo, telefono, cargo, familiaCargo } = req.body || {}
  if (!nombre || !correo || !cargo || !familiaCargo) {
    return res.status(400).json({ error: 'Nombre, correo, cargo y familia de cargo son obligatorios' })
  }
  const creadoEn = new Date().toISOString()
  const info = db
    .prepare(
      'INSERT INTO candidatos (nombre, correo, telefono, cargo, familia_cargo, creado_en) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(nombre, correo, telefono || '', cargo, familiaCargo, creadoEn)
  const row = db.prepare('SELECT * FROM candidatos WHERE id = ?').get(info.lastInsertRowid)
  audit(req,'Candidato creado',String(info.lastInsertRowid))
  res.status(201).json(row)
})

router.put('/:id', requireRole('Administrador','Analista','Jefatura'), (req, res) => {
  const existing = db.prepare('SELECT * FROM candidatos WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Candidato no encontrado' })
  const { nombre, correo, telefono, cargo, familiaCargo } = req.body || {}
  db.prepare(
    'UPDATE candidatos SET nombre = ?, correo = ?, telefono = ?, cargo = ?, familia_cargo = ? WHERE id = ?'
  ).run(
    nombre ?? existing.nombre,
    correo ?? existing.correo,
    telefono ?? existing.telefono,
    cargo ?? existing.cargo,
    familiaCargo ?? existing.familia_cargo,
    req.params.id
  )
  const row = db.prepare('SELECT * FROM candidatos WHERE id = ?').get(req.params.id)
  const cambios = [['nombre', nombre, 'nombre'], ['correo', correo, 'correo'], ['telefono', telefono, 'teléfono'], ['cargo', cargo, 'cargo'], ['familia_cargo', familiaCargo, 'familia']]
    .filter(([col, v]) => v !== undefined && v !== existing[col]).map(([, , etiqueta]) => etiqueta)
  if (cambios.length) audit(req, 'Candidato actualizado', `Candidato #${existing.id}: ${cambios.join(', ')}`)
  res.json(row)
})

router.delete('/:id', requireRole('Administrador','Jefatura'), (req, res) => {
  const candidato = db.prepare('SELECT id, nombre FROM candidatos WHERE id = ?').get(req.params.id)
  if (!candidato) return res.status(404).json({ error: 'Candidato no encontrado' })
  // Las solicitudes y sus documentos se borran en cascada; las carpetas en disco hay que borrarlas aparte.
  const carpetas = db.prepare('SELECT carpeta FROM solicitudes WHERE candidato_id = ? AND carpeta IS NOT NULL').all(candidato.id).map((r) => r.carpeta)
  db.prepare('DELETE FROM candidatos WHERE id = ?').run(candidato.id)
  for (const c of carpetas) {
    try { borrarCarpeta(c) } catch (err) { console.error('[SIGMA-Aqua] No se pudo borrar la carpeta', c, err.message) }
  }
  audit(req, 'Candidato eliminado', `Candidato #${candidato.id}: ${candidato.nombre} (${carpetas.length} carpeta(s) de solicitud eliminadas)`)
  res.status(204).end()
})

export default router
