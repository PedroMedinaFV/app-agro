import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { obtenerPermisosRol } from '@agro/tipos';
import type { LoginDemoRequest, RolUsuario, SesionUsuario } from '@agro/tipos';
import { prisma, obtenerUsuarioPorEmail, crearUsuario } from '../prisma';
import { validarIdTokenMicrosoft } from '../services/microsoftIdentity';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'secret-dev';

function crearTokenSesion(usuario: { id: string; email: string; rol?: string; clienteId?: string | null }) {
  return jwt.sign(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol || 'usuario', clienteId: usuario.clienteId || undefined },
    SECRET,
    { expiresIn: '8h' },
  );
}

router.post('/demo', (req, res) => {
  const { email = 'demo@agroapp.local', nombre = 'Usuario Demo', rol = 'usuario', clienteId = 'cliente-demo' } = req.body as LoginDemoRequest;
  const rolSesion: RolUsuario = rol === 'admin' ? 'admin' : 'usuario';
  const usuario = {
    id: rolSesion === 'admin' ? 'demo-admin' : 'demo-user',
    email,
    nombre,
    rol: rolSesion,
    clienteId,
  };

  // El modo demo permite validar web/mobile sin bloquear al equipo por PostgreSQL o Microsoft Entra.
  const respuesta: SesionUsuario = {
    token: crearTokenSesion(usuario),
    usuario,
    origen: 'demo',
    permisos: obtenerPermisosRol(rolSesion),
  };

  res.json(respuesta);
});

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
    usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol === 'admin' ? 'admin' : 'usuario', clienteId: usuario.clienteId || undefined },
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
    usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol === 'admin' ? 'admin' : 'usuario', clienteId: usuario.clienteId || undefined },
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

    const usuario = await prisma.usuario.upsert({
      where: { email: identidad.email },
      update: {
        nombre: identidad.nombre,
        microsoftId: identidad.microsoftId,
      },
      create: {
        email: identidad.email,
        nombre: identidad.nombre,
        microsoftId: identidad.microsoftId,
      },
    });

    const token = crearTokenSesion(usuario);

    res.json({
      mensaje: 'Login Microsoft correcto',
      token,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol === 'admin' ? 'admin' : 'usuario', clienteId: usuario.clienteId || undefined },
      origen: 'microsoft',
      permisos: obtenerPermisosRol(usuario.rol),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
