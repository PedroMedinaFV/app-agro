import { Request, Router } from 'express';
import type { ResolverNotificacionVinculacionRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { generarSugerenciasVinculacionErp, listarNotificacionesPendientes, resolverNotificacionVinculacionErp } from '../services/notificaciones/vinculacionesSugeridas';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; clienteId?: string; email?: string };
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

router.post('/vinculaciones/generar', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    const resultado = await generarSugerenciasVinculacionErp(clienteId, {
      id: user?.sub,
      clienteId,
      email: user?.email,
    });

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resolver-vinculacion', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    const body = req.body as ResolverNotificacionVinculacionRequest;

    if (body.decision !== 'aceptar' && body.decision !== 'descartar') {
      return res.status(400).json({ error: 'La decision debe ser aceptar o descartar.' });
    }

    res.json(await resolverNotificacionVinculacionErp(
      clienteId,
      req.params.id,
      body.decision,
      {
        id: user?.sub,
        clienteId,
        email: user?.email,
      },
      body.motivo,
    ));
  } catch (error) {
    next(error);
  }
});

export default router;
