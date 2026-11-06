import { Router } from 'express'
import { existsSync } from 'node:fs'
import { db } from '../db.js'
import { rutaAbsoluta } from '../carpetas.js'

const router = Router()

router.get('/:id/descargar', (req, res) => {
  const doc = db.prepare('SELECT nombre, ruta FROM documentos WHERE id = ?').get(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Documento no encontrado' })
  const abs = rutaAbsoluta(doc.ruta)
  if (!existsSync(abs)) return res.status(404).json({ error: 'El archivo ya no existe en la carpeta' })
  res.download(abs, doc.nombre)
})

export default router
