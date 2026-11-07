# Correo SMTP de SIGMA-Aqua

1. Copia `backend/.env.example` a `backend/.env`.
2. Completa `SMTP_USER`, `SMTP_FROM` y `SMTP_PASSWORD` con credenciales **propias**.
3. Para Gmail, habilita la verificación en dos pasos y crea una contraseña de aplicación si está disponible.
4. Usa `SMTP_HOST=smtp.gmail.com` y `SMTP_PORT=465`.
5. Reinicia backend y prueba registro con correo al que tengas acceso.
6. Revisa Spam; un SMTP aceptado no garantiza entrega.

**Seguridad:** Nunca compartas `.env`. Una contraseña de aplicación apareció en el `.env.example` original del ZIP recibido: se sustituyó por un marcador en esta entrega. **Revoca esa contraseña en Google y genera una nueva.**

Consulta `SOLUCION_DE_PROBLEMAS.md` para errores concretos.
