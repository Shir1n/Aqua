# Cuentas y registro (versión consolidada)

- Registro: `/register`; requiere correo real y código SMTP de seis dígitos.
- El código expira en 10 minutos.
- El registro público solo permite `Analista` o `Evaluador`; los roles elevados los asigna un administrador.
- Las cuentas de ejemplo `admin@aqua.test`, `camila@aqua.test`, `maria.victoria@aqua.test` y `jefatura@aqua.test` **no tienen una contraseña universal en el código**.
- Las contraseñas son hashes en `backend/data/aqua.db` y no se pueden recuperar en texto claro.
- Si se instala desde cero, el seed crea usuarios sin `password_hash`; hay que establecer contraseñas con un procedimiento autorizado.
- Ver `SOLUCION_DE_PROBLEMAS.md` para diagnóstico.
