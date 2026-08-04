import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const campos = await prisma.campo.findMany({
    include: { pais: true, usuario: true },
  });
  res.json(campos);
});

router.post('/', async (req, res) => {
  const { nombre, paisId, usuarioId } = req.body;
  const campo = await prisma.campo.create({
    data: { nombre, paisId, usuarioId },
  });
  res.status(201).json(campo);
});

export default router;
