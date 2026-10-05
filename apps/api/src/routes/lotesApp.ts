import { Request, Router } from 'express';
import type { CrearUrlSubidaAdjuntoRequest, GuardarArchivoGeograficoLoteRequest, GuardarLoteAppRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { crearUrlSubidaArchivoGeograficoLote, guardarArchivoGeograficoLote, obtenerArchivosGeograficosLote } from '../services/lotes/archivosGeograficosLotes';
import { guardarLoteAppPersistido, obtenerLotesAppPersistidos } from '../services/lotes/lotesAppPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; clienteId?: string };
};

type RequestUsuarioLotes = {
  params: { id?: string };
  body?: unknown;
  user?: { sub?: string; email?: string; clienteId?: string };
};

type ObtenerArchivosGeograficosLoteFn = typeof obtenerArchivosGeograficosLote;
type CrearUrlSubidaArchivoGeograficoLoteFn = typeof crearUrlSubidaArchivoGeograficoLote;
type GuardarArchivoGeograficoLoteFn = typeof guardarArchivoGeograficoLote;

export async function resolverObtenerArchivosGeograficosLote(
  request: RequestUsuarioLotes,
  obtenerArchivos: ObtenerArchivosGeograficosLoteFn = obtenerArchivosGeograficosLote,
) {
  const clienteId = request.user?.clienteId;

  if (!clienteId) {
    return { status: 401, body: { error: 'Sesion sin cliente asociado.' } };
  }

  return {
    status: 200,
    body: await obtenerArchivos(request.params.id || '', clienteId),
  };
}

export async function resolverCrearUrlSubidaArchivoGeograficoLote(
  request: RequestUsuarioLotes,
  crearUrlSubida: CrearUrlSubidaArchivoGeograficoLoteFn = crearUrlSubidaArchivoGeograficoLote,
) {
  return {
    status: 200,
    body: await crearUrlSubida(request.params.id || '', request.body as CrearUrlSubidaAdjuntoRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }),
  };
}

export async function resolverGuardarArchivoGeograficoLote(
  request: RequestUsuarioLotes,
  guardarArchivo: GuardarArchivoGeograficoLoteFn = guardarArchivoGeograficoLote,
) {
  return {
    status: 201,
    body: await guardarArchivo(request.params.id || '', request.body as GuardarArchivoGeograficoLoteRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }),
  };
}

router.get('/', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = request.user?.clienteId;

    if (!clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    res.json({ lotes: await obtenerLotesAppPersistidos(clienteId) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await guardarLoteAppPersistido(req.params.id, req.body as GuardarLoteAppRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/archivos-geograficos', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const respuesta = await resolverObtenerArchivosGeograficosLote(req as RequestConUsuario);

    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/archivos-geograficos/upload-url', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const respuesta = await resolverCrearUrlSubidaArchivoGeograficoLote(req as RequestConUsuario);

    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/archivos-geograficos', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const respuesta = await resolverGuardarArchivoGeograficoLote(req as RequestConUsuario);

    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

export default router;
