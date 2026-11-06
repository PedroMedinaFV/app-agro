import { Router } from 'express';
import { crearTokenSesion, verificarTokenSesion } from '../services/seguridad/sesionJwt';

const router = Router();

router.post('/', (req, res) => {
  const token = req.body?.token;

  if (!token) {
    return res.status(401).json({ error: 'Falta token' });
  }

  try {
    const payload = verificarTokenSesion(token);
    const nuevoToken = crearTokenSesion({ id: payload.sub, email: payload.email, rol: payload.rol, clienteId: payload.clienteId });
    res.json({ token: nuevoToken });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;
