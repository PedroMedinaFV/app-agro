import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const monitoreos = await prisma.monitoreo.findMany();
  res.json(monitoreos);
});

router.post('/', async (req, res) => {
  const { loteId, tipo, severidad, notas, coordenadas, fecha } = req.body;
  const monitoreo = await prisma.monitoreo.create({
    data: { loteId, tipo, severidad, notas, coordenadas, fecha: new Date(fecha) },
  });
  res.status(201).json(monitoreo);
});

export default router;
