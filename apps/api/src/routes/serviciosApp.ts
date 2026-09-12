import { Request, Router } from 'express';
import type { GuardarServicioAppRequest } from '@agro/tipos';
import { requiereAlgunPermiso } from '../middleware/permisos';
import { guardarServicioAppPersistido, obtenerServiciosAppPersistidos } from '../services/servicios/serviciosAppPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; clienteId?: string };
};

router.get('/', requiereAlgunPermiso(['planificacion:configurar', 'costos:gestionar']), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = request.user?.clienteId;

    if (!clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    res.json({ servicios: await obtenerServiciosAppPersistidos(clienteId) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requiereAlgunPermiso(['planificacion:configurar', 'costos:gestionar']), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await guardarServicioAppPersistido(req.params.id, req.body as GuardarServicioAppRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
