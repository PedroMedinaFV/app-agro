import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const avances = await prisma.avanceCosecha.findMany();
  res.json(avances);
});

router.post('/', async (req, res) => {
  const { loteId, fecha, tonelaje, humedad, camion, notas } = req.body;
  const avance = await prisma.avanceCosecha.create({
    data: { loteId, fecha: new Date(fecha), tonelaje, humedad, camion, notas },
  });
  res.status(201).json(avance);
});

export default router;
