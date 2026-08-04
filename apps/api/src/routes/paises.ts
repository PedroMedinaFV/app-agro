import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const paises = await prisma.pais.findMany();
  res.json(paises);
});

router.post('/', async (req, res) => {
  const { nombre, codigo } = req.body;
  const pais = await prisma.pais.create({
    data: { nombre, codigo },
  });
  res.status(201).json(pais);
});

export default router;
