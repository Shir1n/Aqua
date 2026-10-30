export function validarLogin(
  correo: string,
  contrasena: string
): boolean {
  return correo.trim() !== "" && contrasena.trim() !== "";
}