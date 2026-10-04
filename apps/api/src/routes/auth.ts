import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { obtenerPermisosRol } from '@agro/tipos';
import type { RolUsuario } from '@agro/tipos';
import { prisma, obtenerUsuarioPorEmail, crearUsuario } from '../prisma';
import { validarIdTokenMicrosoft, type MicrosoftIdentity } from '../services/microsoftIdentity';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'secret-dev';

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

export function crearTokenSesion(usuario: { id: string; email: string; rol?: string; clienteId?: string | null }) {
  return jwt.sign(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol || 'operador_campo', clienteId: usuario.clienteId || undefined },
    SECRET,
    { expiresIn: '8h' },
  );
}

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
  input: { email: string; nombre?: string; password: string },
  deps: ResolverRegistroEmailDeps = depsRegistroEmail,
) {
  const usuarioExistente = await deps.buscarUsuarioPorEmail(input.email);
  if (usuarioExistente) {
    return { status: 400, body: { error: 'El correo ya está registrado' } };
  }

  const passwordHash = await deps.hashPassword(input.password);
  const usuario = await deps.crearUsuarioEmail({
    email: input.email,
    nombre: input.nombre,
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
  input: { email: string; password: string },
  deps: ResolverLoginEmailDeps = depsLoginEmail,
) {
  const usuario = await deps.buscarUsuarioPorEmail(input.email);
  if (!usuario) {
    return { status: 401, body: { error: 'Credenciales inválidas' } };
  }

  if (!usuario.password) {
    return { status: 401, body: { error: 'Esta cuenta usa inicio de sesion Microsoft' } };
  }

  const passwordValida = await deps.compararPassword(input.password, usuario.password);
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
  idToken: string | undefined,
  deps: ResolverLoginMicrosoftDeps = depsLoginMicrosoft,
) {
  if (!idToken) {
    return { status: 400, body: { error: 'Falta idToken de Microsoft' } };
  }

  const identidad = await deps.validarIdToken(idToken);
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

router.post('/registro', async (req, res) => {
  const { email, nombre, password } = req.body;
  const respuesta = await resolverRegistroEmail({ email, nombre, password });
  res.status(respuesta.status).json(respuesta.body);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const respuesta = await resolverLoginEmail({ email, password });
  res.status(respuesta.status).json(respuesta.body);
});

router.post('/microsoft', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const respuesta = await resolverLoginMicrosoft(idToken);
    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

export default router;
