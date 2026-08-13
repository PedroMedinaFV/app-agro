import { Router } from 'express';
import type { GuardarPlanificacionRequest, GuardarProtocoloRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { guardarPlanificacionDemo, guardarProtocoloDemo, obtenerPlanificacionDemo, obtenerProtocolosDemo } from '../services/planificacion/mockPlanificacion';

const router = Router();

router.get('/snapshot', requierePermiso('planificacion:leer'), (req, res) => {
  res.json(obtenerPlanificacionDemo(req.query.clienteId as string | undefined));
});

router.put('/:id', requierePermiso('planificacion:editar'), (req, res, next) => {
  try {
    res.json(guardarPlanificacionDemo(req.params.id, req.body as GuardarPlanificacionRequest));
  } catch (error) {
    next(error);
  }
});

router.get('/protocolos/snapshot', requierePermiso('planificacion:leer'), (req, res) => {
  res.json(obtenerProtocolosDemo(req.query.clienteId as string | undefined));
});

router.put('/protocolos/:id', requierePermiso('planificacion:configurar'), (req, res, next) => {
  try {
    res.json(guardarProtocoloDemo(req.params.id, req.body as GuardarProtocoloRequest));
  } catch (error) {
    next(error);
  }
});

export default router;
