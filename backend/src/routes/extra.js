import { Router } from 'express'
import { db, ROLES } from '../db.js'
import { requireRole, audit, passwordHash } from '../security.js'
const router=Router()
const now=()=>new Date().toISOString()
function notify(userId,title,descripcion,enlace='') {
  if (!userId) return
  db.prepare('INSERT INTO notificaciones(usuario_id,titulo,descripcion,enlace,creado_en) VALUES(?,?,?,?,?)').run(userId,title,descripcion,enlace,now())
}
export { notify }
router.get('/notificaciones',(req,res)=>res.json(db.prepare('SELECT * FROM notificaciones WHERE usuario_id=? ORDER BY id DESC LIMIT 60').all(req.user.id)))
router.patch('/notificaciones/:id/leida',(req,res)=>{db.prepare('UPDATE notificaciones SET leida=1 WHERE id=? AND usuario_id=?').run(req.params.id,req.user.id);res.status(204).end()})
router.post('/notificaciones/leer-todas',(req,res)=>{db.prepare('UPDATE notificaciones SET leida=1 WHERE usuario_id=?').run(req.user.id);res.status(204).end()})
router.get('/agenda',(req,res)=>res.json(db.prepare(`SELECT a.*,c.nombre AS candidato_nombre,s.cargo,u.nombre AS evaluador_nombre FROM agenda a JOIN solicitudes s ON s.id=a.solicitud_id JOIN candidatos c ON c.id=s.candidato_id LEFT JOIN usuarios u ON u.id=a.evaluador_id WHERE (? IN ('Administrador','Jefatura') OR a.evaluador_id=? OR a.evaluador_id IS NULL) ORDER BY a.fecha,a.hora`).all(req.user.rol,req.user.id)))
router.post('/agenda',(req,res)=>{
 const {solicitudId,fecha,hora,notas=''}=req.body||{}
 if (!Number.isInteger(Number(solicitudId)) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha||'') || !/^\d{2}:\d{2}$/.test(hora||'')) return res.status(400).json({error:'Indica solicitud, fecha y hora válidas'})
 const s=db.prepare('SELECT id,responsable_id FROM solicitudes WHERE id=?').get(solicitudId)
 if(!s)return res.status(404).json({error:'Solicitud no encontrada'})
 if (!['Administrador','Jefatura'].includes(req.user.rol) && s.responsable_id!==req.user.id) return res.status(403).json({error:'Solo el evaluador asignado o jefatura puede agendar'})
 const info=db.prepare('INSERT INTO agenda(solicitud_id,evaluador_id,fecha,hora,notas,creado_en) VALUES(?,?,?,?,?,?)').run(s.id,s.responsable_id,fecha,hora,String(notas).slice(0,1000),now())
 notify(s.responsable_id,'Evaluación agendada',`Solicitud #${s.id} · ${fecha} ${hora}`,`/solicitudes/${s.id}`)
 audit(req,'Agenda creada',`Solicitud ${s.id}`)
 res.status(201).json({id:Number(info.lastInsertRowid)})
})
router.delete('/agenda/:id',(req,res)=>{
 const a=db.prepare('SELECT * FROM agenda WHERE id=?').get(req.params.id)
 if(!a)return res.status(404).json({error:'Evento no encontrado'})
 if(!['Administrador','Jefatura'].includes(req.user.rol)&&a.evaluador_id!==req.user.id)return res.status(403).json({error:'Sin permiso'})
 db.prepare('DELETE FROM agenda WHERE id=?').run(a.id);audit(req,'Agenda eliminada',String(a.id));res.status(204).end()
})
router.get('/estadisticas',(req,res)=>{
 const porMes=db.prepare("SELECT substr(fecha_solicitud,1,7) AS mes, COUNT(*) AS total, SUM(CASE WHEN estado='Finalizada' THEN 1 ELSE 0 END) AS finalizadas FROM solicitudes GROUP BY substr(fecha_solicitud,1,7) ORDER BY mes DESC LIMIT 12").all().reverse()
 const porEvaluador=db.prepare("SELECT COALESCE(u.nombre,'Sin asignar') AS nombre,COUNT(*) AS total,SUM(CASE WHEN s.estado='Finalizada' THEN 1 ELSE 0 END) AS finalizadas FROM solicitudes s LEFT JOIN usuarios u ON u.id=s.responsable_id GROUP BY s.responsable_id ORDER BY total DESC").all()
 const resumen=db.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN estado='Finalizada' THEN 1 ELSE 0 END) AS finalizadas, ROUND(AVG(CASE WHEN estado='Finalizada' THEN julianday(date('now'))-julianday(fecha_solicitud) ELSE NULL END),1) AS diasAproximados FROM solicitudes").get()
 res.json({porMes,porEvaluador,resumen})
})
router.get('/usuarios',requireRole('Administrador'),(req,res)=>res.json(db.prepare('SELECT id,nombre,correo,rol,activo,verificado FROM usuarios ORDER BY id').all()))
router.patch('/usuarios/:id',requireRole('Administrador'),(req,res)=>{
 const id=Number(req.params.id),{rol,activo}=req.body||{}
 const u=db.prepare('SELECT id,correo,rol,activo FROM usuarios WHERE id=?').get(id)
 if(!u)return res.status(404).json({error:'Usuario no encontrado'})
 if(u.correo?.trim().toLowerCase()==='admin@aqua.test')return res.status(403).json({error:'La cuenta principal de administración está protegida y no se puede modificar'})
 if(rol!==undefined&&!ROLES.includes(rol))return res.status(400).json({error:'Rol inválido'})
 if(activo!==undefined&&typeof activo!=='boolean')return res.status(400).json({error:'Estado inválido'})
 if(id===req.user.id && ((rol&&rol!=='Administrador')||activo===false))return res.status(400).json({error:'No puedes quitarte el acceso de administrador'})
 db.prepare('UPDATE usuarios SET rol=?,activo=? WHERE id=?').run(rol??u.rol,activo===undefined?u.activo:Number(activo),id)
 db.prepare('DELETE FROM sesiones WHERE usuario_id=?').run(id)
 audit(req,'Usuario actualizado',`Usuario #${id}: ${rol??u.rol}, activo=${activo??Boolean(u.activo)}`)
 res.json({mensaje:'Usuario actualizado; sus sesiones se cerraron'})
})
const correoValido=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
const claveValida=(c)=>typeof c==='string'&&c.length>=12&&c.length<=128
router.post('/usuarios',requireRole('Administrador'),(req,res)=>{
 const {nombre,rol,contrasena}=req.body||{}
 const correo=String(req.body?.correo||'').trim().toLowerCase()
 if(typeof nombre!=='string'||nombre.trim().length<2||nombre.trim().length>100)return res.status(400).json({error:'El nombre debe tener entre 2 y 100 caracteres'})
 if(!correoValido.test(correo))return res.status(400).json({error:'Correo inválido'})
 if(!ROLES.includes(rol))return res.status(400).json({error:'Rol inválido'})
 if(!claveValida(contrasena))return res.status(400).json({error:'La contraseña debe tener entre 12 y 128 caracteres'})
 if(db.prepare('SELECT id FROM usuarios WHERE lower(correo)=?').get(correo))return res.status(409).json({error:'Ya existe una cuenta con ese correo'})
 const r=db.prepare('INSERT INTO usuarios(nombre,correo,rol,password_hash,verificado,activo) VALUES(?,?,?,?,1,1)').run(nombre.trim(),correo,rol,passwordHash(contrasena))
 audit(req,'Usuario creado',`Usuario #${r.lastInsertRowid}: ${correo} (${rol})`)
 res.status(201).json({id:Number(r.lastInsertRowid),mensaje:'Usuario creado; ya puede iniciar sesión con su contraseña'})
})
router.put('/usuarios/:id/clave',requireRole('Administrador'),(req,res)=>{
 const id=Number(req.params.id),{contrasena}=req.body||{}
 const u=db.prepare('SELECT id,correo FROM usuarios WHERE id=?').get(id)
 if(!u)return res.status(404).json({error:'Usuario no encontrado'})
 if(id===req.user.id)return res.status(400).json({error:'Para tu propia cuenta usa "Cambiar contraseña" en tu perfil'})
 if(!claveValida(contrasena))return res.status(400).json({error:'La contraseña debe tener entre 12 y 128 caracteres'})
 db.prepare('UPDATE usuarios SET password_hash=?,verificado=1 WHERE id=?').run(passwordHash(contrasena),id)
 db.prepare('DELETE FROM sesiones WHERE usuario_id=?').run(id)
 audit(req,'Contraseña restablecida',`Usuario #${id}: ${u.correo}`)
 res.json({mensaje:'Contraseña restablecida; las sesiones del usuario se cerraron'})
})
router.get('/auditoria',requireRole('Administrador'),(req,res)=>res.json(db.prepare('SELECT a.*,u.nombre AS usuario_nombre FROM auditoria a LEFT JOIN usuarios u ON u.id=a.usuario_id ORDER BY a.id DESC LIMIT 80').all()))
router.get('/recordatorios',(req,res)=>{
 const today=new Date().toISOString().slice(0,10)
 const until=new Date(Date.now()+3*86400000).toISOString().slice(0,10)
 const agenda=db.prepare(`SELECT a.id,a.fecha,a.hora,a.solicitud_id,c.nombre AS candidato_nombre FROM agenda a JOIN solicitudes s ON s.id=a.solicitud_id JOIN candidatos c ON c.id=s.candidato_id WHERE a.fecha BETWEEN ? AND ? AND s.estado!='Finalizada' AND (? IN ('Administrador','Jefatura') OR a.evaluador_id=?) ORDER BY a.fecha,a.hora LIMIT 20`).all(today,until,req.user.rol,req.user.id)
 const sinAsignar=['Administrador','Jefatura','Analista'].includes(req.user.rol)?db.prepare("SELECT id,cargo,fecha_solicitud FROM solicitudes WHERE responsable_id IS NULL AND estado!='Finalizada' ORDER BY id DESC LIMIT 20").all():[]
 res.json({agenda,sinAsignar})
})
router.get('/respaldo',requireRole('Administrador'),async(req,res,next)=>{
 try{
  const {mkdtemp,readFile,rm}=await import('node:fs/promises')
  const {tmpdir}=await import('node:os')
  const {join}=await import('node:path')
  const dir=await mkdtemp(join(tmpdir(),'sigma-aqua-'))
  const path=join(dir,'respaldo.sqlite')
  try{
   await (await import('node:sqlite')).backup(db,path)
   const bytes=await readFile(path)
   audit(req,'Respaldo descargado','Copia de seguridad SQLite')
   res.set('Content-Type','application/vnd.sqlite3')
   res.set('Content-Disposition',`attachment; filename="sigma-aqua-${new Date().toISOString().slice(0,10)}.sqlite"`)
   res.set('Cache-Control','no-store')
   res.send(bytes)
  }finally{await rm(dir,{recursive:true,force:true})}
 }catch(e){next(e)}
})
export default router
