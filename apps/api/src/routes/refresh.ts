import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'secret-dev';

router.post('/', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Falta token' });
  }

  try {
    const payload = jwt.verify(token, SECRET) as { sub: string; email: string };
    const nuevoToken = jwt.sign({ sub: payload.sub, email: payload.email }, SECRET, { expiresIn: '8h' });
    res.json({ token: nuevoToken });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;
