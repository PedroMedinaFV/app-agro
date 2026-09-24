import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { obtenerPermisosRol } from '@agro/tipos';
import type { RolUsuario } from '@agro/tipos';
import { prisma, obtenerUsuarioPorEmail, crearUsuario } from '../prisma';
import { validarIdTokenMicrosoft } from '../services/microsoftIdentity';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'secret-dev';

function crearTokenSesion(usuario: { id: string; email: string; rol?: string; clienteId?: string | null }) {
  return jwt.sign(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol || 'operador_campo', clienteId: usuario.clienteId || undefined },
    SECRET,
    { expiresIn: '8h' },
  );
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
    usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol as RolUsuario, clienteId: usuario.clienteId || undefined },
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
    usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol as RolUsuario, clienteId: usuario.clienteId || undefined },
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

    const identidad = await validarIdTokenMicrosoft(idToken);
    const email = identidad.email.trim().toLowerCase();
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });

    if (!usuarioExistente || !usuarioExistente.clienteId) {
      return res.status(403).json({ error: 'El usuario Microsoft no esta habilitado en Agro App. Solicita el alta a un administrador.' });
    }

    if (usuarioExistente.microsoftId && usuarioExistente.microsoftId !== identidad.microsoftId) {
      return res.status(403).json({ error: 'El email ya esta enlazado a otra identidad Microsoft.' });
    }

    const usuario = await prisma.usuario.update({
      where: { id: usuarioExistente.id },
      data: {
        nombre: identidad.nombre,
        microsoftId: identidad.microsoftId,
      },
    });

    const token = crearTokenSesion(usuario);

    res.json({
      mensaje: 'Login Microsoft correcto',
      token,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol as RolUsuario, clienteId: usuario.clienteId || undefined },
      origen: 'microsoft',
      permisos: obtenerPermisosRol(usuario.rol),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
