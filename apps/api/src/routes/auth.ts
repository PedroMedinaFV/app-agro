import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { obtenerUsuarioPorEmail, crearUsuario } from '../prisma';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'secret-dev';

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

  const token = jwt.sign({ sub: usuario.id, email: usuario.email }, SECRET, { expiresIn: '8h' });

  res.status(201).json({ mensaje: 'Usuario creado', token, usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const usuario = await obtenerUsuarioPorEmail(email);
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const passwordValida = await bcrypt.compare(password, usuario.password);
  if (!passwordValida) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ sub: usuario.id, email: usuario.email }, SECRET, { expiresIn: '8h' });

  res.json({ mensaje: 'Login correcto', token, usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre } });
});

export default router;
