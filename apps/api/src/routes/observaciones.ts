import { Request, Router } from 'express';
import type { CrearObservacionRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { crearObservacionPersistida, obtenerObservacionesPersistidas } from '../services/observaciones/observacionesPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; rol?: string; clienteId?: string };
};

router.get('/', requierePermiso('observaciones:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = request.user?.clienteId;

    if (!clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    res.json(await obtenerObservacionesPersistidas(clienteId, {
      id: request.user?.sub,
      clienteId,
      email: request.user?.email,
      rol: request.user?.rol,
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/', requierePermiso('observaciones:crear'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.status(201).json(await crearObservacionPersistida(req.body as CrearObservacionRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
      rol: request.user?.rol,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
