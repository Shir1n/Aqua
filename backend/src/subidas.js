import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import { extname } from 'node:path'
import { UPLOADS_TMP_DIR } from './carpetas.js'

// Subida de CV y descriptor: solo PDF/DOC/DOCX, hasta 10 MB cada uno.
// Los archivos llegan a una carpeta temporal y luego se mueven a la carpeta de la solicitud.
const EXTENSIONES_PERMITIDAS = new Set(['.pdf', '.doc', '.docx'])
export const MAX_MB = 10

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_TMP_DIR),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 2, fields: 20, fieldSize: 5000 },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONES_PERMITIDAS.has(extname(file.originalname).toLowerCase())) return cb(null, true)
    cb(Object.assign(new Error('Formato no permitido: solo PDF, DOC o DOCX'), { status: 400 }))
  },
}).fields([
  { name: 'cv', maxCount: 1 },
  { name: 'descriptor', maxCount: 1 },
])

export function borrarTemporales(files) {
  for (const f of Object.values(files || {}).flat()) {
    try { unlinkSync(f.path) } catch { /* ya movido o inexistente */ }
  }
}

export function recibirArchivos(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next()
    borrarTemporales(req.files)
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `Cada archivo puede pesar como máximo ${MAX_MB} MB` : 'Archivos o campos no válidos'
      return res.status(400).json({ error: msg })
    }
    next(err)
  })
}
