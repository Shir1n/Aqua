import { expect, test, describe } from "vitest";
import { validarLogin } from "./validarLogin";

describe("Validación del login de SIGMA-Aqua", () => {

  test("rechaza los campos vacíos", () => {
    expect(validarLogin("", "")).toBe(false);
  });

  test("rechaza el correo vacío", () => {
    expect(validarLogin("", "123456")).toBe(false);
  });

  test("rechaza la contraseña vacía", () => {
    expect(validarLogin("admin@aqua.test", "")).toBe(false);
  });

  test("rechaza los campos que solo contienen espacios", () => {
    expect(validarLogin("   ", "123456")).toBe(false);
  });

  test("acepta los campos completos", () => {
    expect(validarLogin("admin@aqua.test", "123456")).toBe(true);
  });
});
