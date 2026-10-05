import type { Request } from 'express';
import { Router } from 'express';
import type { GuardarMapaNdviRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { guardarMapaNdviLote, obtenerMapaNdviPorId, obtenerMapasNdviPorLote, obtenerUltimoMapaNdviPorLote } from '../services/ndvi/mapasNdviPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; rol?: string; clienteId?: string };
};

type RequestNdvi = {
  params: { loteAppId?: string; mapaNdviId?: string };
  body?: unknown;
  user?: { sub?: string; email?: string; rol?: string; clienteId?: string };
};

function obtenerUsuarioOperacion(request: RequestNdvi) {
  return {
    id: request.user?.sub,
    email: request.user?.email,
    clienteId: request.user?.clienteId,
    rol: request.user?.rol,
  };
}

type GuardarMapaNdviLoteFn = typeof guardarMapaNdviLote;
type ObtenerMapasNdviPorLoteFn = typeof obtenerMapasNdviPorLote;
type ObtenerUltimoMapaNdviPorLoteFn = typeof obtenerUltimoMapaNdviPorLote;
type ObtenerMapaNdviPorIdFn = typeof obtenerMapaNdviPorId;

export async function resolverGuardarMapaNdviLote(
  request: RequestNdvi,
  guardarMapa: GuardarMapaNdviLoteFn = guardarMapaNdviLote,
) {
  return {
    status: 201,
    body: await guardarMapa(request.params.loteAppId || '', request.body as GuardarMapaNdviRequest, obtenerUsuarioOperacion(request)),
  };
}

export async function resolverObtenerMapasNdviPorLote(
  request: RequestNdvi,
  obtenerMapas: ObtenerMapasNdviPorLoteFn = obtenerMapasNdviPorLote,
) {
  return {
    status: 200,
    body: await obtenerMapas(request.params.loteAppId || '', obtenerUsuarioOperacion(request)),
  };
}

export async function resolverObtenerUltimoMapaNdviPorLote(
  request: RequestNdvi,
  obtenerUltimoMapa: ObtenerUltimoMapaNdviPorLoteFn = obtenerUltimoMapaNdviPorLote,
) {
  return {
    status: 200,
    body: await obtenerUltimoMapa(request.params.loteAppId || '', obtenerUsuarioOperacion(request)),
  };
}

export async function resolverObtenerMapaNdviPorId(
  request: RequestNdvi,
  obtenerMapa: ObtenerMapaNdviPorIdFn = obtenerMapaNdviPorId,
) {
  return {
    status: 200,
    body: await obtenerMapa(request.params.mapaNdviId || '', obtenerUsuarioOperacion(request)),
  };
}

router.post('/lotes/:loteAppId', requierePermiso('ndvi:gestionar'), async (req, res, next) => {
  try {
    const respuesta = await resolverGuardarMapaNdviLote(req as RequestConUsuario);

    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

router.get('/lotes/:loteAppId', requierePermiso('ndvi:leer'), async (req, res, next) => {
  try {
    const respuesta = await resolverObtenerMapasNdviPorLote(req as RequestConUsuario);

    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

router.get('/lotes/:loteAppId/ultimo', requierePermiso('ndvi:leer'), async (req, res, next) => {
  try {
    const respuesta = await resolverObtenerUltimoMapaNdviPorLote(req as RequestConUsuario);

    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

router.get('/mapas/:mapaNdviId', requierePermiso('ndvi:leer'), async (req, res, next) => {
  try {
    const respuesta = await resolverObtenerMapaNdviPorId(req as RequestConUsuario);

    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

export default router;
