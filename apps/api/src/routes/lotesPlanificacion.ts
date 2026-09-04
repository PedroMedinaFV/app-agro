import { Request, Router } from 'express';
import type { GuardarLotePlanificacionRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { guardarLotePlanificacionPersistido, obtenerLotesPlanificacionPersistidos } from '../services/lotes/lotesPlanificacionPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; clienteId?: string };
};

router.get('/', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = request.user?.clienteId;

    if (!clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    res.json({ lotes: await obtenerLotesPlanificacionPersistidos(clienteId) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await guardarLotePlanificacionPersistido(req.params.id, req.body as GuardarLotePlanificacionRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
