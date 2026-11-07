import { Router } from 'express'
import { createHash, randomInt } from 'node:crypto'
import { db } from '../db.js'
import { createSession, requireAuth, passwordHash, verifyPassword, audit } from '../security.js'
import { enviarCodigoVerificacion } from '../services/email.js'

const router = Router()
const hash = (s) => createHash('sha256').update(String(s)).digest('hex')
const normalize = (s) => String(s || '').trim().toLowerCase()
const mailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const limits = new Map()
function allow(key, durationMs) {
  const now = Date.now()
  const until = limits.get(key) || 0
  if (until > now) return false
  limits.set(key, now + durationMs)
  if (limits.size > 2000) for (const [k,v] of limits) if (v <= now) limits.delete(k)
  return true
}
function release(key) { limits.delete(key) }
const PUBLIC_ROLES = new Set(['Analista', 'Evaluador'])
const genericFailure = 'No se pudo enviar el correo de verificación. Revisa la configuración SMTP e inténtalo nuevamente.'

router.get('/usuarios', requireAuth, (req, res) => res.json(db.prepare('SELECT id, nombre, correo, rol FROM usuarios ORDER BY id').all()))
router.post('/login', (req, res) => {
  const { correo, contrasena } = req.body || {}
  const u = db.prepare('SELECT id,nombre,correo,rol,password_hash,verificado,activo FROM usuarios WHERE lower(correo)=lower(?)').get(normalize(correo))
  if (!u || !u.activo || !u.password_hash || !verifyPassword(contrasena || '',u.password_hash) || !u.verificado) return res.status(401).json({error:'Credenciales incorrectas o cuenta no verificada'})
  res.json({id:u.id,nombre:u.nombre,correo:u.correo,rol:u.rol,token:createSession(u.id)})
})
router.get('/me', requireAuth, (req,res)=>res.json(req.user))
router.post('/logout', requireAuth, (req,res)=>{ db.prepare('DELETE FROM sesiones WHERE token_hash=?').run(hash((req.headers.authorization||'').slice(7))); res.status(204).end() })
router.patch('/perfil', requireAuth, (req,res)=>{
  const nombre = req.body?.nombre
  if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 100)
    return res.status(400).json({error:'El nombre debe tener entre 2 y 100 caracteres'})
  db.prepare('UPDATE usuarios SET nombre=? WHERE id=?').run(nombre.trim(),req.user.id)
  audit(req,'perfil_actualizado','Nombre de perfil actualizado')
  res.json({nombre:nombre.trim()})
})
router.post('/cambiar-clave', requireAuth, (req,res)=>{
  const {actual,nueva} = req.body || {}
  if (typeof actual !== 'string' || typeof nueva !== 'string' || nueva.length < 12 || nueva.length > 128)
    return res.status(400).json({error:'La nueva contraseña debe tener entre 12 y 128 caracteres'})
  const stored = db.prepare('SELECT password_hash FROM usuarios WHERE id=?').get(req.user.id)
  if (!stored || !verifyPassword(actual,stored.password_hash))
    return res.status(403).json({error:'La contraseña actual es incorrecta'})
  db.prepare('UPDATE usuarios SET password_hash=? WHERE id=?').run(passwordHash(nueva),req.user.id)
  db.prepare('DELETE FROM sesiones WHERE usuario_id=? AND token_hash<>?').run(req.user.id,hash((req.headers.authorization||'').slice(7)))
  audit(req,'clave_actualizada','Contraseña cambiada por el usuario')
  res.json({mensaje:'Contraseña actualizada correctamente'})
})
router.get('/mi-actividad',requireAuth,(req,res)=>{
  res.json(db.prepare('SELECT accion,detalle,creado_en FROM auditoria WHERE usuario_id=? ORDER BY id DESC LIMIT 30').all(req.user.id))
})

router.post('/registro', async (req,res)=>{
  const {nombre,contrasena,rol='Analista'}=req.body||{}
  const correo=normalize(req.body?.correo)
  if(typeof nombre !== 'string' || !nombre.trim() || !mailPattern.test(correo) || typeof contrasena !== 'string' || contrasena.length<8) return res.status(400).json({error:'Ingresa nombre, correo válido y contraseña de al menos 8 caracteres'})
  if(typeof rol !== 'string' || !PUBLIC_ROLES.has(rol)) return res.status(403).json({error:'Este rol no está disponible para el registro público. Solicita su asignación a un administrador.'})
  if(db.prepare('SELECT id FROM usuarios WHERE lower(correo)=lower(?)').get(correo)) return res.status(409).json({error:'Ya existe una cuenta con ese correo'})
  const key='registro:'+correo
  if (!allow(key,60000)) return res.status(429).json({error:'Espera un minuto antes de solicitar otro código.'})
  const codigo=String(randomInt(100000,1000000))
  const vence=new Date(Date.now()+10*60*1000).toISOString()
  try {
    await enviarCodigoVerificacion(correo,codigo)
    db.prepare('INSERT OR REPLACE INTO codigos_verificacion(correo,codigo,vence_en,nombre,password_hash,rol) VALUES(?,?,?,?,?,?)').run(correo,hash(codigo),vence,nombre.trim(),passwordHash(contrasena),rol)
    res.status(201).json({mensaje:'Te enviamos un código de 6 dígitos a tu correo. Revisa también la carpeta de spam.'})
  } catch(err) {
    release(key)
    console.error('[SIGMA-Aqua] Error SMTP en registro:',err.message)
    res.status(503).json({error:genericFailure})
  }
})
router.post('/verificar', (req,res)=>{
  const {codigo}=req.body||{}
  const correo=normalize(req.body?.correo)
  const key='verificar:'+correo
  if (!allow(key,1500)) return res.status(429).json({error:'Espera unos segundos antes de volver a intentarlo.'})
  const pending=db.prepare('SELECT * FROM codigos_verificacion WHERE correo=?').get(correo)
  if(!pending || pending.vence_en < new Date().toISOString() || !/^\d{6}$/.test(String(codigo||'')) || pending.codigo!==hash(codigo)) return res.status(400).json({error:'Código inválido o vencido'})
  // Defensa adicional: también bloquea registros pendientes creados antes de esta actualización.
  if (!PUBLIC_ROLES.has(pending.rol)) return res.status(403).json({error:'El rol solicitado requiere autorización administrativa. Regístrate con un rol permitido.'})
  try { db.prepare('INSERT INTO usuarios(nombre,correo,rol,password_hash,verificado) VALUES(?,?,?,?,1)').run(pending.nombre,pending.correo,pending.rol,pending.password_hash) } catch { return res.status(409).json({error:'El correo ya está registrado'}) }
  db.prepare('DELETE FROM codigos_verificacion WHERE correo=?').run(pending.correo)
  res.json({mensaje:'Cuenta verificada. Ya puedes iniciar sesión.'})
})
router.post('/reenviar-codigo', async (req,res)=>{
  const correo=normalize(req.body?.correo)
  const pending=db.prepare('SELECT correo FROM codigos_verificacion WHERE correo=?').get(correo)
  if(!pending) return res.status(404).json({error:'No hay un registro pendiente para ese correo'})
  const key='reenviar:'+correo
  if(!allow(key,60000)) return res.status(429).json({error:'Espera un minuto antes de solicitar otro código.'})
  const codigo=String(randomInt(100000,1000000))
  const vence=new Date(Date.now()+10*60*1000).toISOString()
  try {
    await enviarCodigoVerificacion(correo,codigo)
    db.prepare('UPDATE codigos_verificacion SET codigo=?, vence_en=? WHERE correo=?').run(hash(codigo),vence,correo)
    res.json({mensaje:'Enviamos un nuevo código a tu correo electrónico.'})
  } catch(err) {
    release(key)
    console.error('[SIGMA-Aqua] Error SMTP al reenviar:',err.message)
    res.status(503).json({error:genericFailure})
  }
})
export default router
