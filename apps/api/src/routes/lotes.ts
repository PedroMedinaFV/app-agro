import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const lotes = await prisma.lote.findMany({
    include: { campo: true, cultivo: true },
  });
  res.json(lotes);
});

router.post('/', async (req, res) => {
  const { nombre, area, campoId, tipoSemilla, cultivoId } = req.body;
  const lote = await prisma.lote.create({
    data: { nombre, area, campoId, tipoSemilla, cultivoId },
  });
  res.status(201).json(lote);
});

export default router;
