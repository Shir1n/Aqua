# SIGMA-Aqua — proyecto consolidado (AquaV6)

Proyecto React/Vite + Node/Express + SQLite. Esta entrega conserva la estructura funcional del ZIP AquaV6, eliminando `node_modules` y archivos generados para una distribución limpia.

## Inicio rápido en Windows PowerShell

1. Instala Node.js LTS y comprueba `node -v` y `npm -v`.
2. Abre PowerShell **en esta carpeta**.
3. Ejecuta `npm ci --prefix frontend`, `npm ci --prefix backend` y `npm ci --prefix solicitud`.
4. Configura `backend/.env` a partir de `backend/.env.example` para el correo.
5. Ejecuta `powershell -ExecutionPolicy Bypass -File .\iniciar.ps1`.
6. Abre la dirección local que imprima Vite (habitualmente `http://localhost:5173`; puede variar).

También puedes usar `make dev` si tienes `make` disponible; el Makefile instala dependencias en cada ejecución.

## Estructura

- `frontend/`: panel principal, Dashboard, Candidatos, Solicitudes, Kanban, calendario, buscador y perfiles.
- `backend/`: API, autenticación, SQLite, SMTP, informes y rutas.
- `solicitud/`: formulario independiente de solicitud.
- `docs/`: notas técnicas.
- `ScreenShots/`: capturas de referencia.
- `SOLUCION_DE_PROBLEMAS.md`: guía de incidentes y soluciones.

**Datos:** Se incluye `backend/data/aqua.db` procedente del ZIP del usuario para conservar registros y cuentas de prueba. Es información sensible: no la publiques ni la envíes a terceros. Si ya tienes datos más nuevos en tu equipo, **no sobrescribas tu archivo `backend/data/aqua.db`**.

**Credenciales:** `backend/.env` está excluido deliberadamente. Debes conservar tu copia local segura y rotar la contraseña SMTP expuesta en el archivo de ejemplo original.

**Verificación:** la estructura y sintaxis básica de rutas JS se revisaron; una prueba de extremo a extremo en Windows y la compilación de frontend deben hacerse localmente después de `npm ci`.
