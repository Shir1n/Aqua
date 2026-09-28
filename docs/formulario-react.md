# Formulario de entrada (React) → Power Automate

Reemplaza a Microsoft Forms (no se dispone de licencia). Es un formulario web React (Vite + TypeScript) que envía la solicitud a un flujo Power Automate mediante un **trigger HTTP**.

## Arquitectura

```
Analista ──► formulario React (src/App.tsx)
                │  POST JSON (fetched)
                ▼
   Power Automate "Cuando se recibe una solicitud HTTP" (trigger)
                ▼
            Etapa 1 (carpeta + plantillas)
```

## Cómo se maneja el CV

El analista **sube el CV a OneDrive/SharePoint** y pega el **enlace** en el campo `linkCV` (texto). No se suben archivos al formulario. El flujo luego descarga/copia el CV desde ese enlace.

## Payload JSON que envía el formulario

```json
{
  "nombreCandidato": "María González",
  "familiaCargo": "Administrativa",
  "codigoFamilia": "ADM",
  "nombreCargo": "Analista Contable",
  "linkCV": "https://tenant.sharepoint.com/sites/RRHH/Docs/CV_MariaG.pdf",
  "correoAnalista": "analista@empresa.com",
  "comentarios": ""
}
```

## Configuración del trigger HTTP en Power Automate

1. Crear flujo **"Flujo de nube automatizado"** → desencadenador **"Cuando se recibe una solicitud HTTP" (When a HTTP request is received)**.
2. En el desencadenador, click **"Usar una carga de ejemplo para generar el esquema"** y pegar el JSON de arriba.
   - Esto autogenera el **Esquema JSON** y expone los campos en el editor.
3. **Guardar** el flujo. Aparecerá la **URL HTTP POST** del trigger (formato: `https://prod-XX.westeurope.logic.azure.com/workflows/...`).
4. Copiar esa URL y ponerla en `.env` del formulario como `VITE_FLOW_URL`.

### Esquema JSON generado (referencia)

```json
{
  "type": "object",
  "properties": {
    "nombreCandidato": { "type": "string" },
    "familiaCargo": { "type": "string" },
    "codigoFamilia": { "type": "string" },
    "nombreCargo": { "type": "string" },
    "linkCV": { "type": "string" },
    "correoAnalista": { "type": "string" },
    "comentarios": { "type": "string" }
  }
}
```

## Configuración del formulario React

1. Instalar dependencias: `npm install`.
2. Crear `.env` copiando `.env.example` y asignar la URL real del trigger.
3. Desarrollo local: `npm run dev`.
4. Build producción: `npm run build` → carpeta `dist/` (alojar en SharePoint/Static web app).

## Campo `codigoFamilia`

El formulario ya calcula y envía el **código** de la familia (ADM/OPE/COM/TEC/GER). El flujo **no necesita Switch**: usa directamente `body.codigoFamilia` para armar las rutas de plantilla:

- `/_Plantillas/Informes/{codigoFamilia}-informe.xlsx`
- `/_Plantillas/Pautas/{codigoFamilia}-pauta.docx`
