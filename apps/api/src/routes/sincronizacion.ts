import { Router } from 'express';
import { procesarSincronizacion } from '../services/sincronizacionOffline';

const router = Router();

router.post('/', (req, res) => {
  const registros = Array.isArray(req.body?.registros)
    ? req.body.registros
    : [{ id: `${Date.now()}`, tipo: req.body?.tipo || 'registro-campo', payload: req.body?.payload || {}, sincronizado: false }];

  const resultado = procesarSincronizacion(registros);

  res.json({
    ok: true,
    mensaje: 'Registro preparado para sincronización posterior',
    resultado,
  });
});

export default router;
