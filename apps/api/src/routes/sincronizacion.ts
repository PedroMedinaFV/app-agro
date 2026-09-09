import type { Request } from 'express';
import { Router } from 'express';
import { procesarSincronizacion } from '../services/sincronizacionOffline';

const router = Router();

type RequestConUsuario = Request & {
  user?: {
    sub?: string;
    email?: string;
    rol?: string;
    clienteId?: string;
  };
};

router.post('/', async (req, res, next) => {
  const registros = Array.isArray(req.body?.registros)
    ? req.body.registros
    : [{ id: `${Date.now()}`, tipo: req.body?.tipo || 'registro-campo', payload: req.body?.payload || {}, sincronizado: false }];

  try {
    const request = req as RequestConUsuario;
    const resultado = await procesarSincronizacion(registros, {
      id: request.user?.sub,
      email: request.user?.email,
      rol: request.user?.rol,
      clienteId: request.user?.clienteId,
    });

    res.json({
      ok: true,
      mensaje: 'Sincronizacion procesada.',
      resultado,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
