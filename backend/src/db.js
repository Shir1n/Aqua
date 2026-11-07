import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, appendFileSync } from 'node:fs'
import { randomBytes, scryptSync } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'data')
mkdirSync(dataDir, { recursive: true })

export const DB_PATH = join(dataDir, 'aqua.db')
export const db = new DatabaseSync(DB_PATH)

export const ESTADOS = ['Pendiente', 'En proceso', 'Finalizada']
export const ROLES = ['Administrador', 'Analista', 'Evaluador', 'Jefatura']

export function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      correo TEXT NOT NULL UNIQUE,
      rol TEXT NOT NULL CHECK (rol IN ('Administrador','Analista','Evaluador','Jefatura')),
      password_hash TEXT,
      verificado INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS codigos_verificacion (correo TEXT PRIMARY KEY, codigo TEXT NOT NULL, vence_en TEXT NOT NULL, nombre TEXT NOT NULL, password_hash TEXT NOT NULL, rol TEXT NOT NULL);

    CREATE TABLE IF NOT EXISTS candidatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      correo TEXT NOT NULL,
      telefono TEXT,
      cargo TEXT NOT NULL,
      familia_cargo TEXT NOT NULL,
      creado_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS solicitudes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidato_id INTEGER NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
      cargo TEXT NOT NULL,
      familia_cargo TEXT NOT NULL,
      fecha_solicitud TEXT NOT NULL,
      estado TEXT NOT NULL CHECK (estado IN ('Pendiente','En proceso','Finalizada')),
      responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      observaciones TEXT,
      creado_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS historial_solicitudes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
      accion TEXT NOT NULL,
      detalle TEXT NOT NULL DEFAULT '',
      usuario TEXT NOT NULL DEFAULT 'Sistema',
      creado_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('cv','descriptor','informe','pauta','formulario')),
      nombre TEXT NOT NULL,
      ruta TEXT NOT NULL,
      creado_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evaluaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitud_id INTEGER NOT NULL UNIQUE REFERENCES solicitudes(id) ON DELETE CASCADE,
      fecha_evaluacion TEXT,
      resultado TEXT,
      observaciones TEXT,
      estado TEXT NOT NULL CHECK (estado IN ('Pendiente','En proceso','Finalizada')),
      creado_en TEXT NOT NULL
    );
  `)

  for (const [col, ddl] of [['password_hash','ALTER TABLE usuarios ADD COLUMN password_hash TEXT'], ['verificado','ALTER TABLE usuarios ADD COLUMN verificado INTEGER NOT NULL DEFAULT 1']]) { try { db.exec(ddl) } catch {} }
  try { db.exec('ALTER TABLE usuarios ADD COLUMN activo INTEGER NOT NULL DEFAULT 1') } catch {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS sesiones(token_hash TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, vence_en TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS auditoria(id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER, accion TEXT NOT NULL, detalle TEXT, creado_en TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notificaciones(id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, titulo TEXT NOT NULL, descripcion TEXT NOT NULL, leida INTEGER NOT NULL DEFAULT 0, enlace TEXT, creado_en TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS agenda(id INTEGER PRIMARY KEY AUTOINCREMENT, solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE, evaluador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, fecha TEXT NOT NULL, hora TEXT NOT NULL, notas TEXT NOT NULL DEFAULT '', creado_en TEXT NOT NULL);
  `)
  for (const [col, ddl] of [['competencias','ALTER TABLE evaluaciones ADD COLUMN competencias TEXT'], ['recomendaciones','ALTER TABLE evaluaciones ADD COLUMN recomendaciones TEXT'], ['borrador','ALTER TABLE evaluaciones ADD COLUMN borrador INTEGER NOT NULL DEFAULT 1']]) { try { db.exec(ddl) } catch {} }
  migrarSolicitudes()
  seed()
  asignarClavesIniciales()
}

// Datos del formulario de solicitud guardados en columnas propias (antes iban como texto en observaciones).
const COLUMNAS_SOLICITUD = ['carpeta', 'reclutador', 'origen', 'ubicacion', 'unidad', 'ceco', 'requiere_referencias', 'es_referido']

function migrarSolicitudes() {
  const existentes = new Set(db.prepare('PRAGMA table_info(solicitudes)').all().map((c) => c.name))
  for (const col of COLUMNAS_SOLICITUD) {
    if (!existentes.has(col)) db.exec(`ALTER TABLE solicitudes ADD COLUMN ${col} TEXT`)
  }
}

export const CREDENCIALES_PATH = join(dataDir, 'credenciales-iniciales.txt')

// Las cuentas sin contraseña (p. ej. las del seed) no pueden iniciar sesión.
// Se les asigna una contraseña aleatoria, que se muestra una sola vez en consola
// y se guarda en backend/data/credenciales-iniciales.txt (carpeta ignorada por git).
function asignarClavesIniciales() {
  const sinClave = db.prepare("SELECT id, correo, rol FROM usuarios WHERE password_hash IS NULL OR password_hash = ''").all()
  if (!sinClave.length) return
  const update = db.prepare('UPDATE usuarios SET password_hash = ?, verificado = 1 WHERE id = ?')
  const lineas = []
  for (const u of sinClave) {
    const clave = randomBytes(9).toString('base64url')
    const salt = randomBytes(16).toString('hex')
    update.run(`scrypt:${salt}:${scryptSync(clave, salt, 64).toString('hex')}`, u.id)
    lineas.push(`${u.correo.padEnd(28)} ${u.rol.padEnd(14)} ${clave}`)
  }
  const bloque = `# ${new Date().toISOString()} — contraseñas iniciales (cámbialas tras el primer ingreso)\n${lineas.join('\n')}\n\n`
  appendFileSync(CREDENCIALES_PATH, bloque, { encoding: 'utf8', mode: 0o600 })
  console.log(`[SIGMA-Aqua] Se asignaron contraseñas iniciales a ${sinClave.length} cuenta(s):\n${lineas.map(l => '  ' + l).join('\n')}\n  (copia guardada en ${CREDENCIALES_PATH})`)
}

function seed() {
  const usuarios = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get()
  if (usuarios.n > 0) return

  const now = new Date().toISOString()

  const insertUsuario = db.prepare(
    'INSERT INTO usuarios (nombre, correo, rol) VALUES (?, ?, ?)'
  )
  const insertCandidato = db.prepare(
    'INSERT INTO candidatos (nombre, correo, telefono, cargo, familia_cargo, creado_en) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const insertSolicitud = db.prepare(
    'INSERT INTO solicitudes (candidato_id, cargo, familia_cargo, fecha_solicitud, estado, responsable_id, observaciones, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertEvaluacion = db.prepare(
    'INSERT INTO evaluaciones (solicitud_id, fecha_evaluacion, resultado, observaciones, estado, creado_en) VALUES (?, ?, ?, ?, ?, ?)'
  )

  insertUsuario.run('Sistema Admin', 'admin@aqua.test', 'Administrador')
  insertUsuario.run('Camila Muñoz', 'camila@aqua.test', 'Analista')
  insertUsuario.run('María Victoria', 'maria.victoria@aqua.test', 'Evaluador')
  insertUsuario.run('Jefatura RRHH', 'jefatura@aqua.test', 'Jefatura')

  const cands = [
    ['Juan Pérez', 'juan.perez@mail.com', '+56 9 1111 2222', 'Operador de Máquina', 'Operario Calificado'],
    ['María González', 'maria.gonzalez@mail.com', '+56 9 2222 3333', 'Analista de Sistemas', 'Profesional B C'],
    ['Pedro Soto', 'pedro.soto@mail.com', '+56 9 3333 4444', 'Gruero', 'Operario Calificado'],
    ['Ana Torres', 'ana.torres@mail.com', '+56 9 4444 5555', 'Jefa de SSO', 'Jefatura'],
    ['Luis Rojas', 'luis.rojas@mail.com', '+56 9 5555 6666', 'Supervisor de Planta', 'Supervisor B'],
  ]
  for (const c of cands) {
    insertCandidato.run(c[0], c[1], c[2], c[3], c[4], now)
  }

  const sols = [
    [1, 'Operador de Máquina', 'Operario Calificado', '2026-09-15', 'Finalizada', 3, 'Evaluación completada', now],
    [2, 'Analista de Sistemas', 'Profesional B C', '2026-09-18', 'En proceso', 3, '', now],
    [3, 'Gruero', 'Operario Calificado', '2026-09-20', 'Pendiente', null, '', now],
    [4, 'Jefa de SSO', 'Jefatura', '2026-09-22', 'Pendiente', 3, 'Requiere referencias', now],
    [5, 'Supervisor de Planta', 'Supervisor B', '2026-09-24', 'En proceso', 3, '', now],
  ]
  for (const s of sols) {
    insertSolicitud.run(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7])
  }

  insertEvaluacion.run(1, '2026-09-17', 'Recomendado', 'Candidato con buen desempeño conductual', 'Finalizada', now)
  insertEvaluacion.run(2, '2026-09-20', '', 'Entrevista agendada', 'En proceso', now)
}
