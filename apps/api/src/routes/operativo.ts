import type { Request } from 'express';
import { Router } from 'express';
import { requierePermiso } from '../middleware/permisos';
import { obtenerFichaLoteOperativo } from '../services/operativo/fichasLotesPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; rol?: string; clienteId?: string };
};

router.get('/lotes/:loteAppId/ficha', requierePermiso('lotes:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await obtenerFichaLoteOperativo(req.params.loteAppId, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      rol: request.user?.rol,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
