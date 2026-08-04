import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const cultivos = await prisma.cultivo.findMany();
  res.json(cultivos);
});

router.post('/', async (req, res) => {
  const { nombre } = req.body;
  const cultivo = await prisma.cultivo.create({
    data: { nombre },
  });
  res.status(201).json(cultivo);
});

export default router;
