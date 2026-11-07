# SIGMA-Aqua — guía completa de problemas conocidos y soluciones

> Basada en los incidentes que aparecen en el historial de trabajo y en los archivos de AquaV6. No se puede garantizar que incluya problemas de conversaciones no disponibles. Para cada error, sigue el diagnóstico antes de cambiar código.

## 1. PowerShell: `make dev` no se reconoce
**Síntoma:** `make : El término 'make' no se reconoce`.
**Causa:** GNU Make no viene instalado por defecto en Windows.
**Solución preferida:** desde la carpeta raíz ejecuta `powershell -ExecutionPolicy Bypass -File .\iniciar.ps1`. También puedes instalar GNU Make con un gestor confiable o usar Git Bash si incluye `make`. **No necesitas instalar Make** para usar el script.

## 2. PowerShell bloquea scripts (`npm.ps1` o política de ejecución)
**Síntoma:** `running scripts is disabled on this system`.
**Solución:** usa `npm.cmd` en vez de `npm` dentro de PowerShell; para nuestro script: `powershell -ExecutionPolicy Bypass -File .\iniciar.ps1`. Evita cambiar permanentemente la política global. Si la organización bloquea scripts, inicia cada servicio manualmente con `npm.cmd --prefix backend run dev`, `npm.cmd --prefix frontend run dev` y `npm.cmd --prefix solicitud run dev`, en tres terminales.

## 3. `make dev` no encuentra `concurrently` o falla la instalación
**Causa:** el Makefile usa `npx --yes concurrently` y reinstala dependencias.
**Solución:** ejecuta `npm.cmd ci --prefix frontend`, `npm.cmd ci --prefix backend` y `npm.cmd ci --prefix solicitud`; después usa `iniciar.ps1`. Comprueba conexión a npm si `npm ci` falla. `npm ci` necesita un `package-lock.json` coherente.

## 4. `node` / `npm` no se reconoce
Instala Node.js LTS desde su sitio oficial, cierra y reabre VS Code y comprueba `node -v` y `npm.cmd -v`. Este backend usa `node:sqlite` y `process.loadEnvFile`; evita versiones antiguas de Node.

## 5. Ruta incorrecta en PowerShell / `ENOENT package.json`
Ejecuta `Get-Location`, `Get-ChildItem` y comprueba que ves `frontend`, `backend`, `solicitud` y `Makefile`. Si estás en otra carpeta, usa `cd 'C:\ruta\a\Aqua'`. No ejecutes `npm run dev` desde la raíz: los scripts `dev` están en los subproyectos.

## 6. El backend se reinicia y Vite muestra `ECONNREFUSED`
**Síntoma:** `http proxy error: /api/...`, `AggregateError [ECONNREFUSED]`.
**Causa habitual:** el backend aún está reiniciándose o se cayó.
**Solución:** revisa la terminal backend. Si termina en `API AquaChile escuchando en http://localhost:3001`, espera unos segundos y refresca (`Ctrl+F5`). Si no aparece, corrige primero el error de Node; los errores proxy son consecuencia.

## 7. `SyntaxError: Invalid or unexpected token` en `auth.js`
**Antecedente:** apareció un `\n` literal al final de una ruta `router.post('/logout'...)`.
**Solución:** abre `backend/src/routes/auth.js`, elimina los caracteres literales `\n` que quedaron fuera de una cadena, guarda y ejecuta `node --check backend/src/routes/auth.js`. No reemplaces el archivo entero si solo es un carácter sobrante.

## 8. Error al iniciar backend / puerto 3001 ocupado
Ejecuta `Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object OwningProcess`; identifica el proceso con `Get-Process -Id <PID>`. Cierra la instancia duplicada antes de reiniciar. Si cambias `PORT`, actualiza también el proxy de `frontend/vite.config.ts`.

## 9. Vite usa 5173, 5174 u otro puerto
Abre exactamente la URL que muestra la terminal del frontend. Si 5173 está ocupado, Vite puede escoger otro. `localhost:5173` y `localhost:5174` no son intercambiables si el servidor no escucha allí.

## 10. Pantalla blanca, importaciones fallidas o archivos mezclados
Abre F12 → Consola y revisa el primer error. Ejecuta `npm.cmd --prefix frontend run build`. Confirma que todos los archivos `.tsx`, `.css` y recursos importados existen. Al instalar parches, respeta las rutas; evita mezclar `Layout.tsx` antiguo con CSS nuevo.

## 11. `admin@aqua.test` y otras cuentas: ¿dónde están las contraseñas?
Las contraseñas **no se guardan en texto plano**. Se validan contra `password_hash` en `backend/data/aqua.db`. Las cuentas de ejemplo son `admin@aqua.test`, `camila@aqua.test`, `maria.victoria@aqua.test` y `jefatura@aqua.test`. El código `seed()` las crea **sin contraseña** cuando la base está vacía; no existe una contraseña universal recuperable. Si ya funcionan en tu instalación, conserva tu DB. Para restablecer una contraseña, utiliza un procedimiento administrativo autorizado que genere el hash con `passwordHash` de `backend/src/security.js`; nunca escribas contraseñas directamente en `password_hash`. No publiques claves de prueba.

## 12. Cuenta desactivada, rol incorrecto o no puedo iniciar sesión
Comprueba correo, contraseña, `activo=1`, `verificado=1` y el rol en la base. Solo un administrador debe asignar roles elevados. La interfaz de usuarios no debería permitir desactivar ni cambiar el rol de la cuenta administrativa protegida; revisa también controles del servidor. No borres la base para resolver un login: perderías registros.

## 13. Registro de usuario: no llega el código por correo
Revisa `backend/.env` y que `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` sean correctos. Reinicia backend tras cambiar `.env`. Prueba con un correo real, revisa Spam y la consola del backend. El servidor devuelve error si falla SMTP; no asumas que envía un código si no hay configuración.

## 14. Gmail rechaza la contraseña o falla la autenticación SMTP
En Gmail, activa verificación en dos pasos y crea una contraseña de aplicación si tu cuenta lo permite. Usa esa contraseña, no la contraseña normal. Para SSL directo usa puerto `465`. La contraseña de aplicación presente en el `.env.example` del ZIP original quedó expuesta: **revócala y crea otra**. Nunca subas `.env` a GitHub ni lo adjuntes en un ZIP.

## 15. Código de verificación inválido, vencido o no permite reenvío
El código dura 10 minutos; solicita uno nuevo si expiró. El registro y reenvío tienen límites de frecuencia. Espera el tiempo indicado antes de reintentar. Verifica que el correo usado para confirmar sea el mismo del registro.

## 16. No puedo registrarme como Administrador o Jefatura
Es intencional: el registro público solo permite roles de menor privilegio (`Analista`, `Evaluador`). Pide a un administrador autorizado que asigne otro rol. No desactives la validación del backend.

## 17. Buscador global: `Ctrl + K` no hace nada
El navegador puede interceptar el atajo. Usa la lupa de la barra superior o el atajo alternativo implementado en tu versión. Comprueba que la ruta `/buscar` carga y que no haya errores de consola.

## 18. Buscador queda pegado en la barra superior
La versión anterior tenía un campo permanente; la versión posterior utiliza una lupa y buscador flotante. Si vuelve a ocurrir, comprueba `frontend/src/components/Layout.tsx` y `frontend/src/pages/Extra/sigma43.css`, y limpia caché con `Ctrl+F5`.

## 19. Sidebar contraído pierde iconos o se ve mal
Revisa que `Layout.tsx` y los CSS de sidebar sean de la misma versión. El menú contraído debe conservar los iconos y el logo; verifica `sigma-sidebar45.css` y que exista `frontend/src/assets/logo_pag_inicio.png`.

## 20. Logo de AquaChile demasiado pequeño o no aparece
Confirma la ruta `frontend/src/assets/logo_pag_inicio.png`. El archivo tiene espacio interno; `object-fit:contain` mantiene proporciones y puede verse pequeño. Ajusta solo el tamaño de su contenedor en `sigma-sidebar45.css`, no estires la imagen.

## 21. Fondo del Dashboard demasiado tenue, ampliado o ilegible
Los estilos están en `dashboard-reference.css` y `dashboard-atmosphere.css`; la imagen en `assets/dashboard-centro-cultivo.webp`. `background-size: cover` recorta la imagen; para vista panorámica usa ajuste al ancho y `background-position:center top`. Ajusta contraste de títulos con CSS específico del Dashboard, sin cambiar las tarjetas.

## 22. Botón «Ver calendario» no navega
La ruta real es `/agenda`, **no** `/calendario`. Comprueba que el enlace de Actividad reciente en `DashboardPage.tsx` use `/agenda`.

## 23. Botón «Volver» de solicitud lleva siempre a Solicitudes
Las primeras versiones tenían destino fijo. En versiones posteriores el origen se pasa por React Router `state`. Abre el detalle desde Dashboard, Kanban o Buscador y verifica el retorno. Si llegas por URL directa, el listado de Solicitudes es el destino seguro.

## 24. Flecha global «Atrás» no regresa a donde esperaba
La flecha superior usa historial de navegación. Si entraste por URL directa o recargaste, puede no existir una entrada anterior dentro de la app. Usa el menú lateral para elegir destino. No confundas esta flecha con el botón contextual «Volver» de los detalles.

## 25. Kanban: arrastrar no actualiza el estado
Comprueba que backend esté en 3001, sesión válida y permisos de actualización. Observa F12 → Red al soltar: si la petición falla, la tarjeta debe volver a su columna anterior. El selector «Mover a» es alternativa. Los colores están en `kanban-colors.css`.

## 26. Kanban sin colores o estilos de modo oscuro incorrectos
Confirma que `KanbanPage.tsx` importe `kanban-colors.css`. Limpia caché y comprueba selectores de tema. Los estados válidos en la BD son `Pendiente`, `En proceso`, `Finalizada`; evita cambiar estas cadenas por plurales en las llamadas a API.

## 27. Calendario: no puedo agendar haciendo clic en el día
La agenda está en `/agenda`. Comprueba que el día sea interactivo y que la creación envíe fecha/hora válidas. Revisa permisos y respuesta de `/api/extra/agenda`; si falla con `ECONNREFUSED`, vuelve al punto 6.

## 28. Formulario de candidatos: faltan cargos o desplegable se corta
Se cambió el selector por **Familia de cargo → Cargo**, con opción de cargo personalizado. Revisa `CandidatoFormPage.tsx`, `catalogoCargosReferencia.ts` y `sigma-forms.css`. Los cargos son referencias de la aplicación, no un catálogo oficial de AquaChile.

## 29. PDF no descarga o sale vacío
Comprueba que la solicitud exista y que el navegador permita descargas. Revisa consola y `frontend/src/utils/informeSolicitud.ts`; no borres campos de evaluación ni alteres sus nombres al actualizar el frontend.

## 30. No aparecen datos, se perdieron usuarios o solicitudes
La base está en `backend/data/aqua.db`. **No la reemplaces por una copia antigua**. Antes de actualizar: detén backend y haz `Copy-Item .\backend\data\aqua.db .\backend\data\aqua.db.respaldo`. Si ya tienes datos más recientes, restaura tu copia local, no la base incluida en este paquete.

## 31. SQLite está bloqueado o no permite escritura
Evita abrir el mismo archivo con procesos que mantengan bloqueo de escritura; cierra copias del backend. No copies la base mientras está escribiendo: detén el servidor primero o utiliza una copia de seguridad SQLite consistente. Evita carpetas sincronizadas por OneDrive para el archivo activo.

## 32. OneDrive, rutas con espacios y sincronización
El proyecto estuvo en una ruta bajo `OneDrive\Escritorio`. Si aparecen bloqueos o errores intermitentes, mueve una **copia** a una carpeta local como `C:\Proyectos\SIGMA-Aqua`. Usa comillas para rutas con espacios en PowerShell. Conserva el respaldo de la DB.

## 33. Modo oscuro: contraste o fondos incorrectos
Revisa estilos específicos de cada módulo (`dashboard-reference.css`, `kanban-colors.css`, `sigma-sidebar45.css`). Evita reglas globales que cambien el color de todos los textos o botones. Comprueba tanto modo claro como oscuro tras cada parche.

## 34. Actualizar sin romper Gmail, PDF, Kanban o cuentas
Haz copia del proyecto y de `backend/data/aqua.db`; no sobrescribas `backend/.env`. Aplica únicamente archivos modificados, respeta rutas, ejecuta `node --check` en archivos JS cambiados, `npm.cmd --prefix frontend run build` y prueba login, correo, PDF, Kanban y navegación.

## 35. Archivos `node_modules` ausentes en el ZIP
Es intencional: son dependencias regenerables y muy voluminosas. Instálalas con `npm.cmd ci --prefix frontend`, `npm.cmd ci --prefix backend`, `npm.cmd ci --prefix solicitud`. No copies `node_modules` de otro sistema operativo.

## 36. El proyecto funciona en una PC pero no en otra
Comprueba versión de Node, `npm ci`, puertos, configuración SMTP local, permisos de Windows, antivirus y que hayas copiado la DB adecuada. Los archivos `.env` no se distribuyen por seguridad.

## Comprobación final rápida

```powershell
node -v
npm.cmd -v
node --check .\backend\src\routes\auth.js
node --check .\backend\src\routes\solicitudes.js
npm.cmd ci --prefix frontend
npm.cmd ci --prefix backend
npm.cmd ci --prefix solicitud
npm.cmd --prefix frontend run build
powershell -ExecutionPolicy Bypass -File .\iniciar.ps1
```

Después prueba: iniciar sesión, Dashboard, candidato, solicitud, Kanban, calendario, buscador, PDF, perfil y registro por correo.
