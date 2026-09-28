# Proyecto: Automatización del Proceso de Evaluación Psicolaboral

Automatización del flujo completo de evaluación psicolaboral en el área de Reclutamiento y Selección, desde la solicitud hasta la generación del informe, usando Power Automate, SharePoint/OneDrive y Copilot Studio.

> **Nota:** Microsoft Forms fue reemplazado por un formulario web React (`formulario/`) porque no se dispone de licencia de Forms. La entrada ahora llega por trigger HTTP a Power Automate.

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [Plan de Implementación](plan-implementacion.md) | Objetivos, etapas, hitos y criterios de aceptación |
| [Formulario de entrada (React)](formulario-react.md) | Formulario web + trigger HTTP (reemplaza Forms) |
| [Formulario y estructura de datos](formulario-y-datos.md) | Campos, catálogo de familias y modelo de datos |
| [Etapa 1](etapas/etapa-1-flujo-carpetas.md) | Automatización de carpeta + plantillas |
| [Etapa 2](etapas/etapa-2-integracion-informe.md) | Copilot → Excel del informe |
| [Etapa 3](etapas/etapa-3-asistente-entrevista.md) | Agente Copilot de entrevista |

## Estructura de artefactos

- `formulario/` — Formulario web React (Vite + TypeScript) que envía la solicitud.
- `docs/` — Documentación técnica y de implementación.
- `plantillas/` — Plantillas base (informe Excel y pauta de entrevista Word) por familia de cargo.

## Stack

- Power Automate (trigger HTTP request)
- React + TypeScript (formulario de entrada)
- SharePoint Online / OneDrive for Business
- Copilot Studio
