import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const analisis = await prisma.analisisSuelo.findMany();
  res.json(analisis);
});

router.post('/', async (req, res) => {
  const { loteId, ph, materiaOrganica, nitrogeno, fosforo, potasio, notas, fecha } = req.body;
  const resultado = await prisma.analisisSuelo.create({
    data: {
      loteId,
      ph,
      materiaOrganica,
      nitrogeno,
      fosforo,
      potasio,
      notas,
      fecha: new Date(fecha),
    },
  });
  res.status(201).json(resultado);
});

export default router;
