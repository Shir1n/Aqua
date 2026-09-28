# Etapa 1 — Automatización de creación de carpeta y documentos

**Objetivo:** eliminar la gestión manual inicial. Al recibir una solicitud vía Forms, el sistema crea la carpeta del candidato, guarda el CV y copia las plantillas correctas según la familia de cargo.

## Resultado esperado

Carpeta del candidato creada automáticamente con CV + plantillas (informe Excel y pauta Word) listas para iniciar.

## Precondiciones

- Formulario Forms "Solicitud de Evaluación Psicolaboral" publicado (campos según `formulario-y-datos.md`).
- Excel "Registro de Solicitudes" en SharePoint con tabla `Respuestas` (columnas en `formulario-y-datos.md`).
- Librería `Evaluación Psicolaboral` en `/sites/RRHH` con `_Plantillas/Informes`, `_Plantillas/Pautas`, `Solicitudes` e `InformesFinalizados`.
- Plan Planner "Evaluación Psicolaboral" con buckets: "Pendiente", "En proceso", "Completado", "Enviado".
- Licencia Power Automate Premium (necesaria para el conector robusto de SharePoint / HTTP versión avanzada).
- Permisos del autor del flujo sobre la carpeta de adjuntos de Forms (OneDrive).

## Flujo Power Automate — secuencia de acciones

| # | Acción | Conector | Detalle |
|---|--------|----------|---------|
| 1 | When a new response is submitted | Microsoft Forms | Form: "Solicitud de Evaluación Psicolaboral" |
| 2 | Get response details | Microsoft Forms | Response Id = `List of response notifications Response Id` |
| 3 | Compose — Normalizar nombre | Data Operation | Ver expresión **E‑1** usando la respuesta `Nombre del candidato` |
| 4 | Initialize — Código familia | Data Operation | String, vacío (se llena en el Switch) |
| 5 | Compose — Ruta informe | Data Operation | Ver **E‑2** |
| 6 | Compose — Ruta pauta | Data Operation | Ver **E‑3** |
| 7 | Create new folder | SharePoint | Site: `/sites/RRHH`, List: `Evaluación Psicolaboral`, Path `/Solicitudes`, Name = salida paso 3 |
| 8a | HTTP — Descargar CV | HTTP (Premium) | Método GET, Uri = `File url` de la pregunta CV, Autenticación personalizada (token Graph) — ver **Consideraciones** |
| 8b | Create file | SharePoint | Folder = carpeta recién creada, Name = `CV_<Normalizado>` + extensión original, Content = body de 8a |
| 9 | Copy file | SharePoint | Source = salida paso 5, Destination = carpeta candidato, Dest. name = `Informe_<Normalizado>.xlsx` |
| 10 | Copy file | SharePoint | Source = salida paso 6, Destination = carpeta candidato, Dest. name = `PautaEntrevista_<Normalizado>.docx` |
| 11 | Update a row (o Add row) | Excel Online (Business) | `Estado = En proceso`, `CarpetaCandidato = <URL carpeta>` — ver **E‑4** |
| 12 | Create a task | Planner | Título = `<Nombre> — <Cargo>`, Bucket "En proceso", Descripción con links — ver **E‑5** |
| 13 | Send an email (V2) | Office 365 Outlook | A psicólogo/correo analista, con links a carpeta y CV |

> **El Switch** (resolución de familia → código) se implementa como variable `Código familia` asignada con un `Switch` o con `if()` encadenados, antes del paso 5-6. Cada rama: `Administrativa → ADM`, `Operativa → OPE`, etc. (tabla en `formulario-y-datos.md`). Rama por defecto: enviar alerta y terminar e el flujo.

## Expresiones (Power Automate)

**E‑1 — Normalizar nombre** (minúsculas, sin tildes, espacios → `_`):

```
replace(replace(replace(replace(replace(
  toLower(trim(items('Apply_to_each')?['NombreCandidato'])),
  'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u')
```

> Simplificado: aplicar los `replace` de acentos y luego `replace(..,' ','_')` y los nueve `replace` de caracteres inválidos de SharePoint (`" * : < > ? / \ |`), encadenados.

**E‑2 — Ruta plantilla informe:**

```
concat('/_Plantillas/Informes/', variables('CodigoFamilia'), '-informe.xlsx')
```

**E‑3 — Ruta plantilla pauta:**

```
concat('/_Plantillas/Pautas/', variables('CodigoFamilia'), '-pauta.docx')
```

**E‑4 — URL de la carpeta creada:**

```
concat('https://[tenant].sharepoint.com/sites/RRHH/Evaluacion%20Psicolaboral/Solicitudes/',
       uriComponent(outputs('Crear_carpeta')))
```

**E‑5 — Título y descripción de la tarea Planner:**

```
Título:   concat(outputs('Get_response_details')?['NombreCandidato'], ' — ', outputs('Get_response_details')?['NombreCargo'])
Descripción: carpeta: <E‑4> / CV: <File url> / familia: <Código>
```

## Configuración previa en SharePoint

- Crear librería `Evaluación Psicolaboral` en `/sites/RRHH` con `_Plantillas/Informes`, `_Plantillas/Pautas`, `Solicitudes` e `InformesFinalizados`.
- Subir una plantilla por familia usando la convención `COD-informe.xlsx` y `COD-pauta.docx` (ver `formulario-y-datos.md`).

## Consideraciones técnicas

- **Descarga del CV:** los adjuntos de Forms se guardan en OneDrive del autor del Forms y el `File url` requiere autenticación. Opciones:
  1. Conector `SharePoint` si el autor mueve el adjunto a la librería (menos directo).
  2. Conector `HTTP` Premium con autenticación Graph (`GET /me/...` o el link recibido) y luego `Create file`.
  3. Guardar el `File url` en Excel y dejar descarga manual solo como respaldo.
- Conservar la **extensión original** del CV (pdf/docx) al crear el archivo: `CV_<Normalizado>.pdf`, etc.
- **HTTP Premium** requiere licencia Power Automate Premium en la conexión.
- Añadir **control de errores** (Scope + Configure run after) en los pasos de copia para que un fallo no deje carpetas a medias.

## Checklist de validación (Etapa 1)

- [ ] Carpeta creada con nombre normalizado, sin caracteres inválidos.
- [ ] CV guardado dentro de la carpeta con extensión correcta.
- [ ] Se copiaron informe y pauta correctos según `Código` de familia.
- [ ] Estado actualizado en Excel y tarea creada en Planner con bucket "En proceso".
- [ ] Familia sin código/con plantilla faltante genera alerta y no rompe el flujo.
- [ ] Nombre duplicado no pisa una carpeta existente (manejo de colisión).
