import { Request, Router } from 'express';
import type { CerrarPlanificacionRequest, CopiarProtocoloRequest, GuardarPlanificacionRequest, GuardarProtocoloRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { guardarPlanificacionDemo, guardarProtocoloDemo, obtenerPlanificacionDemo, obtenerProtocolosDemo } from '../services/planificacion/mockPlanificacion';
import { cerrarPlanificacionPersistida, guardarPlanificacionPersistida, obtenerPlanificacionesPersistidas } from '../services/planificacion/planificacionesPrisma';
import { copiarProtocoloPersistido, guardarProtocoloPersistido, obtenerProtocolosPersistidos } from '../services/planificacion/protocolosPrisma';
import { obtenerDestinosReferenciaPersistidos, obtenerPreciosReferenciaPersistidos } from '../services/preciosReferencia/preciosReferenciaPrisma';
import { obtenerGastosComercialesPersistidos } from '../services/gastosComerciales/gastosComercialesPrisma';
import { obtenerConceptosGastosComercialesPersistidos, obtenerConceptosGastosComercialesSemilla } from '../services/gastosComerciales/conceptosGastosComerciales';
import { obtenerLaboresReferenciaPersistidas } from '../services/labores/laboresReferenciaPrisma';

const router = Router();
type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; clienteId?: string };
};

router.get('/snapshot', requierePermiso('planificacion:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = request.user?.clienteId || (req.query.clienteId as string | undefined) || 'cliente-demo';
    const demo = obtenerPlanificacionDemo(clienteId);
    const planificacionesPersistidas = await obtenerPlanificacionesPersistidas(clienteId);
    const preciosPersistidos = await obtenerPreciosReferenciaPersistidos(clienteId);
    const destinosPersistidos = await obtenerDestinosReferenciaPersistidos(clienteId);
    const gastosPersistidos = await obtenerGastosComercialesPersistidos(clienteId);
    const conceptosPersistidos = await obtenerConceptosGastosComercialesPersistidos(clienteId);
    const laboresPersistidas = await obtenerLaboresReferenciaPersistidas(clienteId);

    res.json({
      ...demo,
      planificaciones: planificacionesPersistidas.length ? planificacionesPersistidas : demo.planificaciones,
      preciosReferencia: preciosPersistidos.length ? preciosPersistidos : demo.preciosReferencia,
      destinosReferencia: destinosPersistidos.length ? destinosPersistidos : demo.destinosReferencia,
      conceptosGastosComerciales: conceptosPersistidos.length ? conceptosPersistidos : demo.conceptosGastosComerciales || obtenerConceptosGastosComercialesSemilla(clienteId),
      gastosComercialesReferencia: gastosPersistidos.length ? gastosPersistidos : demo.gastosComercialesReferencia,
      laboresReferencia: laboresPersistidas.length ? laboresPersistidas : demo.laboresReferencia,
      sincronizadoEn: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requierePermiso('planificacion:editar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await guardarPlanificacionPersistida(req.params.id, req.body as GuardarPlanificacionRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    try {
      res.json(guardarPlanificacionDemo(req.params.id, req.body as GuardarPlanificacionRequest));
    } catch (fallbackError) {
      next(error || fallbackError);
    }
  }
});

router.post('/:id/cerrar', requierePermiso('planificacion:cerrar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await cerrarPlanificacionPersistida(req.params.id, req.body as CerrarPlanificacionRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/protocolos/snapshot', requierePermiso('planificacion:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = request.user?.clienteId || (req.query.clienteId as string | undefined) || 'cliente-demo';
    const persistidos = await obtenerProtocolosPersistidos(clienteId);

    res.json(persistidos.protocolos.length ? persistidos : obtenerProtocolosDemo(clienteId));
  } catch (error) {
    next(error);
  }
});

router.post('/protocolos', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const body = req.body as GuardarProtocoloRequest;

    res.status(201).json(await guardarProtocoloPersistido(body.protocolo.id, body, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

router.put('/protocolos/:id', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await guardarProtocoloPersistido(req.params.id, req.body as GuardarProtocoloRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    try {
      res.json(guardarProtocoloDemo(req.params.id, req.body as GuardarProtocoloRequest));
    } catch (fallbackError) {
      next(error || fallbackError);
    }
  }
});

router.post('/protocolos/:id/copiar', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.status(201).json(await copiarProtocoloPersistido(req.params.id, req.body as CopiarProtocoloRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
