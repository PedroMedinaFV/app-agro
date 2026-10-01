import type { Request } from 'express';
import { Router } from 'express';
import type { CerrarRecorridaCampoRequest, CrearRecorridaCampoRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import {
  cerrarRecorridaCampoPersistida,
  crearRecorridaCampoPersistida,
  obtenerRecorridaCampoDetallePersistida,
  obtenerRecorridasCampoPersistidas,
} from '../services/recorridas/recorridasPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; rol?: string; clienteId?: string };
};

function obtenerUsuario(req: Request) {
  const request = req as RequestConUsuario;

  return {
    id: request.user?.sub,
    clienteId: request.user?.clienteId,
    email: request.user?.email,
    rol: request.user?.rol,
  };
}

router.get('/', requierePermiso('recorridas:leer'), async (req, res, next) => {
  try {
    const usuario = obtenerUsuario(req);

    if (!usuario.clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    res.json(await obtenerRecorridasCampoPersistidas(usuario.clienteId, usuario));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requierePermiso('recorridas:leer'), async (req, res, next) => {
  try {
    res.json(await obtenerRecorridaCampoDetallePersistida(req.params.id, obtenerUsuario(req)));
  } catch (error) {
    next(error);
  }
});

router.post('/', requierePermiso('recorridas:crear'), async (req, res, next) => {
  try {
    res.status(201).json(await crearRecorridaCampoPersistida(req.body as CrearRecorridaCampoRequest, obtenerUsuario(req)));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cerrar', requierePermiso('recorridas:cerrar'), async (req, res, next) => {
  try {
    res.json(await cerrarRecorridaCampoPersistida(req.params.id, req.body as CerrarRecorridaCampoRequest, obtenerUsuario(req)));
  } catch (error) {
    next(error);
  }
});

export default router;
