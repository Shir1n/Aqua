# Plantillas por familia de cargo

Al recibir una solicitud, el backend copia a la carpeta del candidato
(`backend/data/solicitudes/<id>_<Nombre>/`) el informe y la pauta de su familia de cargo.
Si falta una plantilla, la solicitud se crea igual y la respuesta incluye una advertencia.

| Familia de cargo | Código | Informe (Excel) | Pauta de entrevista (Word) |
|---|---|---|---|
| Profesional A | `PRA` | `Informes/PRA-informe.xlsx` | `Pautas/PRA-pauta.docx` |
| Profesional B C | `PBC` | `Informes/PBC-informe.xlsx` | `Pautas/PBC-pauta.docx` |
| Técnico A | `TEA` | `Informes/TEA-informe.xlsx` | `Pautas/TEA-pauta.docx` |
| Técnico B C | `TBC` | `Informes/TBC-informe.xlsx` | `Pautas/TBC-pauta.docx` |
| Operario Calificado | `OPC` | `Informes/OPC-informe.xlsx` | `Pautas/OPC-pauta.docx` |
| Supervisor B | `SUP` | `Informes/SUP-informe.xlsx` | `Pautas/SUP-pauta.docx` |
| Jefatura | `JEF` | `Informes/JEF-informe.xlsx` | `Pautas/JEF-pauta.docx` |

Los códigos están definidos en `backend/src/carpetas.js` (`CODIGOS_FAMILIA`).

## Contenido

**Informe (`Informes/<COD>-informe.xlsx`)**
- Hoja `Informe`: sigue el mapeo de `docs/etapas/etapa-2-integracion-informe.md`
  (A1 título, A2 candidato, A3 cargo/familia, B5–B10 secciones, B12–B14 datos de la evaluación).
  Cada celda tiene un **nombre definido** (`Antecedentes`, `Motivacion`, `Fortalezas`, `Oportunidades`,
  `Conclusiones`, `Recomendacion`, `FechaEvaluacion`, `Evaluador`…) para que la automatización escriba por nombre.
  `Recomendacion` tiene lista desplegable: Recomendado / Recomendado con observaciones / No recomendado.
- Hoja `Competencias`: las 5 competencias de la familia, nivel 1–5 (validado), evidencia y promedio automático.

**Pauta (`Pautas/<COD>-pauta.docx`)**
Datos de la entrevista, instrucciones (método STAR), apertura, trayectoria, motivación,
2 preguntas conductuales por competencia con tabla de evidencia y nivel, aspectos a indagar, cierre
y espacio para apuntes/transcripción.

> Las competencias y preguntas son una **propuesta inicial**: deben validarse con el equipo de
> evaluación psicolaboral de AquaChile. Se pueden editar directamente en Excel/Word sin tocar el código,
> siempre que se mantengan los nombres de archivo y las celdas con nombre del informe.
