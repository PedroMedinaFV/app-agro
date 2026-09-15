import { Request, Router } from 'express';
import type { CrearUrlSubidaAdjuntoRequest, GuardarArchivoGeograficoLoteRequest, GuardarLoteAppRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { crearUrlSubidaArchivoGeograficoLote, guardarArchivoGeograficoLote, obtenerArchivosGeograficosLote } from '../services/lotes/archivosGeograficosLotes';
import { guardarLoteAppPersistido, obtenerLotesAppPersistidos } from '../services/lotes/lotesAppPrisma';

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
    const request = req as RequestConUsuario;
    const clienteId = request.user?.clienteId;

    if (!clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    res.json(await obtenerArchivosGeograficosLote(req.params.id, clienteId));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/archivos-geograficos/upload-url', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await crearUrlSubidaArchivoGeograficoLote(req.params.id, req.body as CrearUrlSubidaAdjuntoRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/archivos-geograficos', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.status(201).json(await guardarArchivoGeograficoLote(req.params.id, req.body as GuardarArchivoGeograficoLoteRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
