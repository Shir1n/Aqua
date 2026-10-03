# Proyecto: Automatización del Proceso de Evaluación Psicolaboral

Automatización del flujo completo de evaluación psicolaboral en el área de Reclutamiento y Selección, desde la solicitud hasta la generación del informe, usando Power Automate, SharePoint/OneDrive y Copilot Studio.

> **Nota:** Microsoft Forms fue reemplazado por un formulario web React (`solicitud/`) porque no se dispone de licencia de Forms. La entrada llega al backend Express (`POST /api/solicitud`) y se persiste en SQLite.

## Avances

El proyecto parte de una plantilla base entregada por el docente. Sobre ese esqueleto, hasta ahora el equipo ha avanzado principalmente en el **frontend**:

- **Diseño visual del panel** con React y Bootstrap: menú lateral, topbar, modo oscuro y estilos de las pantallas (Dashboard, Candidatos, Solicitudes).
- **Pantalla de Login** rediseñada visualmente (imagen de fondo, logo, campos de usuario/contraseña, mostrar contraseña, "recordarme").
- **Login funcional de forma provisoria (hardcodeado):** al presionar "Ingresar" se guarda un usuario fijo y se navega al Dashboard. Aún no valida contra el backend.

### Tecnologías agregadas por el equipo

| Herramienta | Uso |
|---|---|
| **React 19** + **React DOM** | Construcción de la interfaz por componentes |
| **Bootstrap 5.3.3** | Estilos visuales del panel |
| **React Router DOM 7** | Navegación entre pantallas |
| **Vite 8** | Servidor de desarrollo y empaquetado |

### Pendiente

- Conectar el Login con el backend (`POST /api/auth/login`) para validar usuarios reales.
- Continuar con las etapas de automatización (Power Automate, SharePoint/OneDrive, Copilot Studio).

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [Plan de Implementación](plan-implementacion.md) | Objetivos, etapas, hitos y criterios de aceptación |
| [Solicitud de entrada (React)](solicitud-react.md) | Formulario web → backend (reemplaza Forms) |
| [Solicitud y estructura de datos](solicitud-y-datos.md) | Campos, catálogo de familias y modelo de datos |
| [Etapa 1](etapas/etapa-1-flujo-carpetas.md) | Automatización de carpeta + plantillas |
| [Etapa 2](etapas/etapa-2-integracion-informe.md) | Copilot → Excel del informe |
| [Etapa 3](etapas/etapa-3-asistente-entrevista.md) | Agente Copilot de entrevista |

## Estructura de artefactos

- `solicitud/` — Formulario web React (Vite + TypeScript) que envía la solicitud al backend.
- `backend/` — API Express + SQLite (candidatos, solicitudes, evaluaciones, usuarios).
- `frontend/` — Panel web (dashboard, candidatos, solicitudes).
- `docs/` — Documentación técnica y de implementación.
- `plantillas/` — Plantillas base (informe Excel y pauta de entrevista Word) por familia de cargo.

## Stack

- Backend: Node.js + Express + SQLite (`node:sqlite`, `multer`)
- Frontend: React + TypeScript (Vite)
- Objetivo de automatización: Power Automate, SharePoint Online / OneDrive for Business, Copilot Studio
