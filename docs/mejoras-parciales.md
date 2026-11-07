# Mejoras parciales incorporadas

- Se agregó tabla `historial_solicitudes` (se crea automáticamente al iniciar backend).
- Se registra creación y actualización de solicitudes.
- Se agregó `GET /api/solicitudes/:id/historial` (confirmar prefijo según montaje en `src/index.js`).
- Se agregó estilo gris para la barra lateral y variables de tema oscuro.

## Pendiente / no implementado
- Rediseño completo de menú y pantalla de inicio con fondo animado.
- Mejoras del formulario de solicitudes.
- Registro de nuevas cuentas.
- Verificación de correo con código.
- Login existente y cuatro cuentas iniciales no se modificaron.

## Validación
No se ejecutó una compilación completa ni pruebas de integración en este entorno. Revisar la ruta del endpoint según el montaje real y ejecutar instalación/build antes de presentar.
