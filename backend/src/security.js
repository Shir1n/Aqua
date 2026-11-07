import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { db } from './db.js'

export const sha = (s) => createHash('sha256').update(String(s)).digest('hex')
export function passwordHash(password) { const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}` }
export function verifyPassword(password,stored) {
  if (!stored) return false
  if (!stored.startsWith('scrypt:')) return timingSafeEqual(Buffer.from(sha(password)),Buffer.from(stored))
  const parts=stored.split(':');if(parts.length!==3||!/^[a-f0-9]{128}$/.test(parts[2]))return false
  return timingSafeEqual(scryptSync(password,parts[1],64),Buffer.from(parts[2],'hex'))
}
export function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO sesiones(token_hash,usuario_id,vence_en) VALUES(?,?,?)').run(sha(token),userId,new Date(Date.now()+12*60*60*1000).toISOString())
  return token
}
export function requireAuth(req,res,next) {
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(req.headers.authorization || '')
  if (!match) return res.status(401).json({error:'Inicia sesión para continuar'})
  const u = db.prepare(`SELECT u.id,u.nombre,u.correo,u.rol,u.activo FROM sesiones s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.vence_en>?`).get(sha(match[1]),new Date().toISOString())
  if (!u || !u.activo) return res.status(401).json({error:'Sesión vencida o cuenta desactivada'})
  req.user = u
  next()
}
export function requireRole(...roles) { return (req,res,next)=> roles.includes(req.user?.rol) ? next() : res.status(403).json({error:'No tienes permiso para esta acción'}) }
export function audit(req,accion,detalle='') {
  db.prepare('INSERT INTO auditoria(usuario_id,accion,detalle,creado_en) VALUES(?,?,?,?)').run(req.user?.id||null,accion,String(detalle).slice(0,500),new Date().toISOString())
}
