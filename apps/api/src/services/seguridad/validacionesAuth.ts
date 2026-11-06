import { crearErrorValidacion, limpiarTextoVisible, normalizarEmail } from '../usuarios/validacionesUsuarios';

function validarObjeto(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw crearErrorValidacion('El cuerpo de autenticacion debe ser un objeto.');
  }
  return input as Record<string, unknown>;
}

export function validarLoginEmail(input: unknown) {
  const datos = validarObjeto(input);
  if (typeof datos.email !== 'string' || datos.email.trim().length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
    throw crearErrorValidacion('Ingresa un email valido.');
  }
  // No recortar contrasenas: los espacios pueden formar parte de la credencial.
  if (typeof datos.password !== 'string' || !datos.password.length
    || Buffer.byteLength(datos.password, 'utf8') > 72) {
    throw crearErrorValidacion('La contrasena es obligatoria y no debe superar 72 bytes.');
  }
  return { email: normalizarEmail(datos.email), password: datos.password };
}

export function validarRegistroEmail(input: unknown) {
  const datos = validarObjeto(input);
  const credenciales = validarLoginEmail(datos);
  if (credenciales.password.length < 8) {
    throw crearErrorValidacion('La contrasena debe tener al menos 8 caracteres.');
  }
  if (datos.nombre !== undefined && (typeof datos.nombre !== 'string' || datos.nombre.length > 200)) {
    throw crearErrorValidacion('El nombre debe ser texto de hasta 200 caracteres.');
  }
  return { ...credenciales, nombre: typeof datos.nombre === 'string' ? limpiarTextoVisible(datos.nombre) || undefined : undefined };
}

export function validarTokenMicrosoft(input: unknown): string {
  if (typeof input !== 'string' || !input.trim() || input.length > 16384) {
    throw crearErrorValidacion('El idToken de Microsoft debe ser texto no vacio de hasta 16384 caracteres.');
  }
  return input;
}
