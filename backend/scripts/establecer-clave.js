import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { db, initDb } from '../src/db.js'
import { passwordHash } from '../src/security.js'
initDb()
const email=process.argv[2]?.toLowerCase().trim()
if (!email) { console.error('Uso: node scripts/establecer-clave.js correo@dominio.cl');process.exit(1) }
const rl=createInterface({input,output})
const pass=await rl.question('Nueva contraseña (mínimo 12 caracteres): ')
rl.close()
if (pass.length<12) { console.error('Contraseña demasiado corta');process.exit(1) }
const result=db.prepare('UPDATE usuarios SET password_hash=?,activo=1 WHERE lower(correo)=?').run(passwordHash(pass),email)
if (!result.changes) { console.error('Usuario no encontrado');process.exit(1) }
db.prepare('DELETE FROM sesiones WHERE usuario_id=(SELECT id FROM usuarios WHERE lower(correo)=?)').run(email)
console.log('Contraseña actualizada; sesiones anteriores invalidadas.')
