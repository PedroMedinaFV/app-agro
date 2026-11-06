import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { obtenerPermisosRol } from '@agro/tipos';
import type { RolUsuario } from '@agro/tipos';
import { prisma, obtenerUsuarioPorEmail, crearUsuario } from '../prisma';
import { validarIdTokenMicrosoft, type MicrosoftIdentity } from '../services/microsoftIdentity';
import { crearTokenSesion } from '../services/seguridad/sesionJwt';
import { validarLoginEmail, validarRegistroEmail, validarTokenMicrosoft } from '../services/seguridad/validacionesAuth';
import { rutaAsincrona } from '../middleware/rutaAsincrona';

export { crearTokenSesion } from '../services/seguridad/sesionJwt';

type UsuarioSesion = {
  id: string;
  email: string;
  nombre?: string | null;
  rol?: string;
  clienteId?: string | null;
  microsoftId?: string | null;
  password?: string | null;
};

export type ResolverRegistroEmailDeps = {
  buscarUsuarioPorEmail: (email: string) => Promise<UsuarioSesion | null>;
  hashPassword: (password: string) => Promise<string>;
  crearUsuarioEmail: (input: { email: string; nombre?: string; password: string }) => Promise<UsuarioSesion>;
};

export type ResolverLoginEmailDeps = {
  buscarUsuarioPorEmail: (email: string) => Promise<UsuarioSesion | null>;
  compararPassword: (password: string, passwordHash: string) => Promise<boolean>;
};

export type ResolverLoginMicrosoftDeps = {
  validarIdToken: (idToken: string) => Promise<MicrosoftIdentity>;
  buscarUsuarioPorEmail: (email: string) => Promise<UsuarioSesion | null>;
  actualizarUsuarioMicrosoft: (input: { id: string; nombre?: string; microsoftId: string }) => Promise<UsuarioSesion>;
};

function serializarUsuarioSesion(usuario: UsuarioSesion) {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol as RolUsuario,
    clienteId: usuario.clienteId || undefined,
  };
}

const depsRegistroEmail: ResolverRegistroEmailDeps = {
  buscarUsuarioPorEmail: obtenerUsuarioPorEmail,
  hashPassword: (password) => bcrypt.hash(password, 10),
  crearUsuarioEmail: crearUsuario,
};

const depsLoginEmail: ResolverLoginEmailDeps = {
  buscarUsuarioPorEmail: obtenerUsuarioPorEmail,
  compararPassword: bcrypt.compare,
};

const depsLoginMicrosoft: ResolverLoginMicrosoftDeps = {
  validarIdToken: validarIdTokenMicrosoft,
  buscarUsuarioPorEmail: (email) => prisma.usuario.findUnique({ where: { email } }),
  actualizarUsuarioMicrosoft: ({ id, nombre, microsoftId }) => prisma.usuario.update({
    where: { id },
    data: {
      nombre,
      microsoftId,
    },
  }),
};

export async function resolverRegistroEmail(
  input: unknown,
  deps: ResolverRegistroEmailDeps = depsRegistroEmail,
) {
  const datos = validarRegistroEmail(input);
  const usuarioExistente = await deps.buscarUsuarioPorEmail(datos.email);
  if (usuarioExistente) {
    return { status: 400, body: { error: 'El correo ya está registrado' } };
  }

  const passwordHash = await deps.hashPassword(datos.password);
  const usuario = await deps.crearUsuarioEmail({
    email: datos.email,
    nombre: datos.nombre,
    password: passwordHash,
  });
  const token = crearTokenSesion(usuario);

  return {
    status: 201,
    body: {
      mensaje: 'Usuario creado',
      token,
      usuario: serializarUsuarioSesion(usuario),
      origen: 'email',
      permisos: obtenerPermisosRol(usuario.rol),
    },
  };
}

export async function resolverLoginEmail(
  input: unknown,
  deps: ResolverLoginEmailDeps = depsLoginEmail,
) {
  const datos = validarLoginEmail(input);
  const usuario = await deps.buscarUsuarioPorEmail(datos.email);
  if (!usuario) {
    return { status: 401, body: { error: 'Credenciales inválidas' } };
  }

  if (!usuario.password) {
    return { status: 401, body: { error: 'Esta cuenta usa inicio de sesion Microsoft' } };
  }

  const passwordValida = await deps.compararPassword(datos.password, usuario.password);
  if (!passwordValida) {
    return { status: 401, body: { error: 'Credenciales inválidas' } };
  }

  const token = crearTokenSesion(usuario);

  return {
    status: 200,
    body: {
      mensaje: 'Login correcto',
      token,
      usuario: serializarUsuarioSesion(usuario),
      origen: 'email',
      permisos: obtenerPermisosRol(usuario.rol),
    },
  };
}

export async function resolverLoginMicrosoft(
  idToken: unknown,
  deps: ResolverLoginMicrosoftDeps = depsLoginMicrosoft,
) {
  if (!idToken) {
    return { status: 400, body: { error: 'Falta idToken de Microsoft' } };
  }

  const identidad = await deps.validarIdToken(validarTokenMicrosoft(idToken));
  const email = identidad.email.trim().toLowerCase();
  const usuarioExistente = await deps.buscarUsuarioPorEmail(email);

  if (!usuarioExistente || !usuarioExistente.clienteId) {
    return { status: 403, body: { error: 'El usuario Microsoft no esta habilitado en Agro App. Solicita el alta a un administrador.' } };
  }

  if (usuarioExistente.microsoftId && usuarioExistente.microsoftId !== identidad.microsoftId) {
    return { status: 403, body: { error: 'El email ya esta enlazado a otra identidad Microsoft.' } };
  }

  const usuario = await deps.actualizarUsuarioMicrosoft({
    id: usuarioExistente.id,
    nombre: identidad.nombre,
    microsoftId: identidad.microsoftId,
  });
  const token = crearTokenSesion(usuario);

  return {
    status: 200,
    body: {
      mensaje: 'Login Microsoft correcto',
      token,
      usuario: serializarUsuarioSesion(usuario),
      origen: 'microsoft',
      permisos: obtenerPermisosRol(usuario.rol),
    },
  };
}

type ResolversAuth = {
  registro: typeof resolverRegistroEmail;
  login: typeof resolverLoginEmail;
  microsoft: typeof resolverLoginMicrosoft;
};

export function crearRouterAuth(resolvers: ResolversAuth = {
  registro: resolverRegistroEmail,
  login: resolverLoginEmail,
  microsoft: resolverLoginMicrosoft,
}) {
  const router = Router();
  router.post('/registro', rutaAsincrona(async (req, res) => {
    const respuesta = await resolvers.registro(req.body);
    res.status(respuesta.status).json(respuesta.body);
  }));
  router.post('/login', rutaAsincrona(async (req, res) => {
    const respuesta = await resolvers.login(req.body);
    res.status(respuesta.status).json(respuesta.body);
  }));
  router.post('/microsoft', rutaAsincrona(async (req, res) => {
    const respuesta = await resolvers.microsoft(req.body?.idToken);
    res.status(respuesta.status).json(respuesta.body);
  }));
  return router;
}

export default crearRouterAuth();
