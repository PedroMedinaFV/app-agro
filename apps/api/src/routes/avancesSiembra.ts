import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const avances = await prisma.avanceSiembra.findMany();
  res.json(avances);
});

router.post('/', async (req, res) => {
  const { loteId, fecha, area } = req.body;
  const avance = await prisma.avanceSiembra.create({
    data: { loteId, fecha: new Date(fecha), area },
  });
  res.status(201).json(avance);
});

export default router;
