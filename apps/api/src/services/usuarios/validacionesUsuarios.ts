import type { GuardarUsuarioAdminRequest, RolUsuario } from '@agro/tipos';

type UsuarioAutorizado = {
  rol?: string;
};

const ROLES_VALIDOS = new Set<RolUsuario>([
  'admin',
  'planificador',
  'responsable_compras',
  'operador_campo',
]);

const ROLES_CON_TODOS_LOS_CAMPOS = new Set<string>([
  'admin',
  'planificador',
  'responsable_compras',
]);

export function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function normalizarEmail(email: string) {
  return limpiarTextoVisible(email).toLowerCase();
}

export function normalizarRol(rol: string): RolUsuario {
  if (ROLES_VALIDOS.has(rol as RolUsuario)) {
    return rol as RolUsuario;
  }

  return 'operador_campo';
}

export function rolTieneTodosLosCampos(rol?: string) {
  return Boolean(rol && ROLES_CON_TODOS_LOS_CAMPOS.has(rol));
}

export function camposAsignadosPorDefecto(usuario: UsuarioAutorizado) {
  if (rolTieneTodosLosCampos(usuario.rol)) {
    return null;
  }

  return [];
}

export function validarPasswordTemporal(passwordTemporal?: string) {
  const password = passwordTemporal?.trim() || undefined;

  if (password && password.length < 8) {
    throw crearErrorValidacion('La contrasena temporal debe tener al menos 8 caracteres.');
  }

  return password;
}

export function validarUsuarioRequest(request: GuardarUsuarioAdminRequest) {
  const email = normalizarEmail(request.email);

  if (!email || !email.includes('@')) {
    throw crearErrorValidacion('El usuario debe tener un email valido.');
  }

  return {
    email,
    nombre: request.nombre ? limpiarTextoVisible(request.nombre) : null,
    rol: normalizarRol(request.rol),
    passwordTemporal: validarPasswordTemporal(request.passwordTemporal),
  };
}
