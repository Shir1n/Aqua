# Cuentas y registro (versión consolidada)

- Registro: `/register`; requiere correo real y código SMTP de seis dígitos.
- El código expira en 10 minutos.
- El registro público solo permite `Analista` o `Evaluador`; los roles elevados los asigna un administrador.
- Las cuentas de ejemplo `admin@aqua.test`, `camila@aqua.test`, `maria.victoria@aqua.test` y `jefatura@aqua.test` **no tienen una contraseña universal en el código**.
- Las contraseñas son hashes en `backend/data/aqua.db` y no se pueden recuperar en texto claro.
- Al iniciar el backend, toda cuenta sin contraseña (por ejemplo, las del seed en una instalación nueva) recibe una contraseña aleatoria. Se muestra una sola vez en la consola del backend y se guarda en `backend/data/credenciales-iniciales.txt` (ignorado por git). Cámbiala tras el primer ingreso desde el perfil.
- El administrador puede, en **Administración de usuarios** (`/usuarios`), crear usuarios con contraseña (sin SMTP) y restablecer la contraseña de cualquier otro usuario (mínimo 12 caracteres; se cierran sus sesiones).
- Alternativa por consola: `node backend/scripts/establecer-clave.js correo@dominio.cl`.
- Ver `SOLUCION_DE_PROBLEMAS.md` para diagnóstico.
- Todas las contraseñas (registro, cambio desde el perfil y las que asigna el administrador) deben tener entre 12 y 128 caracteres.
- En el login, **Recordarme** mantiene la sesión al cerrar el navegador; sin marcarlo, la sesión termina al cerrarlo. **¿Olvidaste tu contraseña?** indica pedir el restablecimiento a un administrador.
- El correo del registro se configura en `backend/.env`, a partir de `backend/.env.example` (ver `INSTRUCCIONES_CORREO.md`).
