import type { Request } from 'express';
import { Router } from 'express';
import type { GuardarMapaNdviRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { guardarMapaNdviLote, obtenerMapaNdviPorId, obtenerMapasNdviPorLote, obtenerUltimoMapaNdviPorLote } from '../services/ndvi/mapasNdviPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; rol?: string; clienteId?: string };
};

function obtenerUsuarioOperacion(req: Request) {
  const request = req as RequestConUsuario;

  return {
    id: request.user?.sub,
    email: request.user?.email,
    clienteId: request.user?.clienteId,
    rol: request.user?.rol,
  };
}

router.post('/lotes/:loteAppId', requierePermiso('ndvi:gestionar'), async (req, res, next) => {
  try {
    res.status(201).json(await guardarMapaNdviLote(req.params.loteAppId, req.body as GuardarMapaNdviRequest, obtenerUsuarioOperacion(req)));
  } catch (error) {
    next(error);
  }
});

router.get('/lotes/:loteAppId', requierePermiso('ndvi:leer'), async (req, res, next) => {
  try {
    res.json(await obtenerMapasNdviPorLote(req.params.loteAppId, obtenerUsuarioOperacion(req)));
  } catch (error) {
    next(error);
  }
});

router.get('/lotes/:loteAppId/ultimo', requierePermiso('ndvi:leer'), async (req, res, next) => {
  try {
    res.json(await obtenerUltimoMapaNdviPorLote(req.params.loteAppId, obtenerUsuarioOperacion(req)));
  } catch (error) {
    next(error);
  }
});

router.get('/mapas/:mapaNdviId', requierePermiso('ndvi:leer'), async (req, res, next) => {
  try {
    res.json(await obtenerMapaNdviPorId(req.params.mapaNdviId, obtenerUsuarioOperacion(req)));
  } catch (error) {
    next(error);
  }
});

export default router;
