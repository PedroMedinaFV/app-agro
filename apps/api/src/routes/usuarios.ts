import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const usuarios = await prisma.usuario.findMany();
  res.json(usuarios);
});

router.post('/registro', async (req, res) => {
  const { email, nombre, password } = req.body;

  const usuario = await prisma.usuario.create({
    data: {
      email,
      nombre,
      password,
    },
  });

  res.status(201).json(usuario);
});

export default router;
