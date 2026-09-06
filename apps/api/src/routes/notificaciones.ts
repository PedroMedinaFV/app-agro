import { Request, Router } from 'express';
import { requierePermiso } from '../middleware/permisos';
import { listarNotificacionesPendientes } from '../services/notificaciones/vinculacionesSugeridas';

const router = Router();

type RequestConUsuario = Request & {
  user?: { clienteId?: string };
};

router.get('/', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const clienteId = (req as RequestConUsuario).user?.clienteId;

    if (!clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    res.json({ notificaciones: await listarNotificacionesPendientes(clienteId) });
  } catch (error) {
    next(error);
  }
});

export default router;
