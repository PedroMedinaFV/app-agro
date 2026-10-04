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

  const usuarioExistente = await obtenerUsuarioPorEmail(email);
  if (usuarioExistente) {
    return res.status(400).json({ error: 'El correo ya está registrado' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = await crearUsuario({
    email,
    nombre,
    password: passwordHash,
  });

  const token = crearTokenSesion(usuario);

  res.status(201).json({
    mensaje: 'Usuario creado',
    token,
    usuario: serializarUsuarioSesion(usuario),
    origen: 'email',
    permisos: obtenerPermisosRol(usuario.rol),
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const usuario = await obtenerUsuarioPorEmail(email);
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (!usuario.password) {
    return res.status(401).json({ error: 'Esta cuenta usa inicio de sesion Microsoft' });
  }

  const passwordValida = await bcrypt.compare(password, usuario.password);
  if (!passwordValida) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = crearTokenSesion(usuario);

  res.json({
    mensaje: 'Login correcto',
    token,
    usuario: serializarUsuarioSesion(usuario),
    origen: 'email',
    permisos: obtenerPermisosRol(usuario.rol),
  });
});

router.post('/microsoft', async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Falta idToken de Microsoft' });
    }

    const respuesta = await resolverLoginMicrosoft(idToken);
    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

export default router;
