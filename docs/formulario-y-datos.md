# Formulario y estructura de datos

## 1. Formulario Microsoft Forms

### Campos de la solicitud

> El campo de Forms debe guardar el **Código** como valor interno. En Forms se logra usando pregunta de opción con el texto visible "Administrativa" y en Power Automate mapeando la respuesta a su código (o fijando el desplegable con el código como valor). Ver nota al pie de la sección.

| Campo | Tipo | Obligatorio | Asociación de datos |
|-------|------|-------------|---------------------|
| Nombre del candidato | Texto | Sí | `NombreCandidato` |
| Familia de cargo | Selección única | Sí | `FamiliaCargo` → resuelve `Código` |
| Nombre del cargo | Texto | Sí | `NombreCargo` |
| Curriculum Vitae (CV) | Carga de archivo | Sí | `LinkCV` (PDF/DOCX, ≤ 10 MB) |
| Correo del analista solicitante | Texto (correo) | Sí | `CorreoAnalista` |
| Comentarios / contexto | Texto largo | No | `Comentarios` |

### Catálogo de familias de cargo

> Cada familia apunta a un par de plantillas en la librería. El desplegable de Forms debe contener exactamente estos valores (valor visible y valor interno).

| # | Familia de cargo | Código | Plantilla informe Excel | Pauta entrevista Word |
|---|------------------|--------|-------------------------|-----------------------|
| 1 | Administrativa | `ADM` | `ADM-informe.xlsx` | `ADM-pauta.docx` |
| 2 | Operativa | `OPE` | `OPE-informe.xlsx` | `OPE-pauta.docx` |
| 3 | Comercial | `COM` | `COM-informe.xlsx` | `COM-pauta.docx` |
| 4 | Tecnológica | `TEC` | `TEC-informe.xlsx` | `TEC-pauta.docx` |
| 5 | Gerencial | `GER` | `GER-informe.xlsx` | `GER-pauta.docx` |

> **Regla de negocio:** el flujo resuelve las plantillas por `Código`, no por el nombre visible. Esto evita errores por tildes/mayúsculas y facilita agregar familias sin tocar el flujo (solo agregando archivos `COD-informe.xlsx` / `COD-pauta.docx` en `_Plantillas`).

## 2. Modelo de datos

### Recolección de respuestas

Power Automate conecta Forms → Excel (tabla `Respuestas`). Columnas sugeridas:

- `ID` (autonumérico)
- `Timestamp`
- `NombreCandidato`
- `FamiliaCargo`
- `NombreCargo`
- `LinkCV`
- `CorreoAnalista`
- `Estado` (Pendiente / En proceso / Completado / Enviado)
- `CarpetaCandidato` (URL asignada por el flujo)
- `IDPlannerTask`

### Integración con Planner

Al crear solicitud, el flujo crea una tarea en Planner (`Plan: Evaluación Psicolaboral`) con:

- Título: `<NombreCandidato> — <NombreCargo>`
- Bucket según `Estado`.
- Descripción: link a carpeta SharePoint y al CV.

## 3. Estructura de carpetas en SharePoint

Librería destino: `Evaluación Psicolaboral` en el sitio **Recursos Humanos** (`/sites/RRHH`).

```
/sites/RRHH/Evaluación Psicolaboral
├── _Plantillas/
│   ├── Informes/
│   │   ├── ADM-informe.xlsx
│   │   ├── OPE-informe.xlsx
│   │   ├── COM-informe.xlsx
│   │   ├── TEC-informe.xlsx
│   │   └── GER-informe.xlsx
│   └── Pautas/
│       ├── ADM-pauta.docx
│       ├── OPE-pauta.docx
│       ├── COM-pauta.docx
│       ├── TEC-pauta.docx
│       └── GER-pauta.docx
├── Solicitudes/
│   └── <NombreCandidato>/
│       ├── CV_<NombreCandidato>.<ext>
│       ├── Informe_<NombreCandidato>.xlsx
│       └── PautaEntrevista_<NombreCandidato>.docx
└── InformesFinalizados/
    └── <NombreCandidato>/Informe_<NombreCandidato>_FIRMADO.xlsx
```

## 4. Convención de nombres

- Carpetas: `NombreCandidato` normalizado (sin tildes, espacios → `_`).
- Archivos: `Tipo_NombreCandidato.ext`.
- Evitar caracteres inválidos de SharePoint: `" * : < > ? / \ |`.

## 5. Mapeo Forms → resolución de plantillas (Código)

En Power Automate, el `Switch` de la Etapa 1 debe evaluar el **Código** de la familia:

| Respuesta Forms (visible) | Código usado en el flujo |
|---------------------------|--------------------------|
| Administrativa | `ADM` |
| Operativa | `OPE` |
| Comercial | `COM` |
| Tecnológica | `TEC` |
| Gerencial | `GER` |

Rutas resultantes (patrón único):

- `/_Plantillas/Informes/<COD>-informe.xlsx`
- `/_Plantillas/Pautas/<COD>-pauta.docx`
