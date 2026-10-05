import type { Request } from 'express';
import { Router } from 'express';
import { requierePermiso } from '../middleware/permisos';
import { obtenerFichaLoteOperativo } from '../services/operativo/fichasLotesPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; rol?: string; clienteId?: string };
};

type ResolverFichaLoteOperativoRequest = {
  params: { loteAppId?: string };
  user?: { sub?: string; rol?: string; clienteId?: string };
};

type ObtenerFichaLoteOperativoFn = typeof obtenerFichaLoteOperativo;

export async function resolverFichaLoteOperativo(
  request: ResolverFichaLoteOperativoRequest,
  obtenerFicha: ObtenerFichaLoteOperativoFn = obtenerFichaLoteOperativo,
) {
  return {
    status: 200,
    body: await obtenerFicha(request.params.loteAppId || '', {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      rol: request.user?.rol,
    }),
  };
}

router.get('/lotes/:loteAppId/ficha', requierePermiso('lotes:leer'), async (req, res, next) => {
  try {
    const respuesta = await resolverFichaLoteOperativo(req as RequestConUsuario);

    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

export default router;
