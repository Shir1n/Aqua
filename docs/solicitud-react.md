# Solicitud de entrada (React) → Backend

El formulario de entrada es la app React `solicitud/` (Vite + TypeScript). Reemplaza a Microsoft Forms (no se dispone de licencia) y envía la solicitud de evaluación psicolaboral al backend Express, que la persiste en SQLite.

## Arquitectura

```
Analista ──► solicitud React (src/App.tsx)
                │  POST multipart/form-data (campos + archivos)
                ▼
   Backend Express  POST /api/solicitud  (multer)
                ▼
   SQLite: candidatos + solicitudes + documentos
   Carpeta data/solicitudes/<id>_<Nombre>/ con CV, descriptor,
   formulario (JSON), informe (Excel) y pauta (Word) de la familia de cargo
```

## Campos del formulario

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| Reclutador/a | Texto | Sí |
| Nombre del candidato/a | Texto | Sí |
| Origen (Interno/Externo) | Selección | Sí |
| Familia de cargo | Selección | Sí |
| Nombre del cargo | Texto | Sí |
| Ubicación del cargo | Texto | Sí |
| Unidad | Texto | No |
| CECO (centro de costos) | Texto | No |
| Requiere referencias | Sí/No | Sí |
| Currículum (CV) | Archivo (PDF/DOC/DOCX) | Sí |
| Descriptor del cargo | Archivo | No |
| ¿Es referido? | Sí/No | No |
| Aspectos a indagar / comentarios | Texto largo | No |

## Familias de cargo (catálogo)

Definidas en `src/catalogs.ts`:

`Profesional A`, `Profesional B C`, `Técnico A`, `Técnico B C`, `Operario Calificado`, `Supervisor B`, `Jefatura`.

## Configuración

1. Instalar dependencias: `npm install`.
2. Configurar `.env` (copiar de `.env.example`): `VITE_FLOW_URL=http://localhost:3001/api/solicitud`.
3. Levantar el backend (`npm run dev` en `backend/`, puerto 3001).
4. Desarrollo local: `npm run dev`.
5. Build producción: `npm run build` → carpeta `dist/`.

## Qué hace el backend al recibir la solicitud

`POST /api/solicitud` (implementado en `backend/src/routes/solicitud.js`):

- Crea un registro en `candidatos` (nombre, cargo, familia de cargo).
- Crea una `solicitud` asociada con estado `Pendiente`.
- Guarda el CV y el descriptor en `backend/data/uploads/`.
- Los campos adicionales (reclutador, origen, ubicación, unidad, CECO, referencias, referido, aspectos) se almacenan en `observaciones` de la solicitud.

## Acceso y límites

`POST /api/solicitud` es la única ruta pública de la API (no requiere sesión), porque el formulario lo usan personas sin cuenta. Para protegerla:

- Solo acepta archivos PDF, DOC o DOCX, de hasta 10 MB cada uno; el CV es obligatorio.
- Máximo 20 envíos por IP cada 10 minutos.
- Responde solo `{ id, mensaje }`, sin exponer datos internos.
- Todo se guarda en una transacción: si algo falla, se deshace y se borran la carpeta y los archivos temporales.

## Al recibir una solicitud

- Los datos del formulario (reclutador, origen, ubicación, unidad, CECO, referencias, referido) quedan en columnas propias de `solicitudes`; "Aspectos a indagar" va en `observaciones`.
- Se registra "Solicitud recibida" en el historial y se notifica a los usuarios activos con rol Administrador, Analista o Jefatura.
- En el panel, el detalle de la solicitud lista los documentos y permite descargarlos (`GET /api/documentos/:id/descargar`, con sesión).

El resto de `/api` (incluido `/api/solicitudes`) sigue exigiendo inicio de sesión.

## Solicitudes creadas desde el panel

`POST /api/solicitudes` (panel, con sesión) también crea la carpeta con el formulario y las plantillas de informe y pauta. El CV y el descriptor se adjuntan al crearla o después desde el detalle (`POST /api/solicitudes/:id/documentos`, roles Administrador, Analista y Jefatura); subir uno nuevo reemplaza al anterior. Si una solicitud antigua no tiene carpeta, se crea al adjuntar el primer documento.

Al eliminar un candidato se borran sus solicitudes, sus documentos y las carpetas en disco; la acción queda en la auditoría.
