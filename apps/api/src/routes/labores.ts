import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const labores = await prisma.labor.findMany();
  res.json(labores);
});

router.post('/', async (req, res) => {
  const { loteId, tipo, fecha, notas } = req.body;
  const labor = await prisma.labor.create({
    data: { loteId, tipo, fecha: new Date(fecha), notas },
  });
  res.status(201).json(labor);
});

export default router;
