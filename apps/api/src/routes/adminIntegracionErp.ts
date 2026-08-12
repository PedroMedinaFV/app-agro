import { Router } from 'express';
import type { Request } from 'express';
import type { IntegracionErpInput } from '@agro/tipos';
import { obtenerSnapshotErp } from '../services/erp/clienteErp';
import { guardarIntegracionErp, obtenerIntegracionErpPublica } from '../services/erp/configuracionErp';

type RequestConUsuario = Request & { user?: { sub?: string } };

const router = Router();

router.get('/:clienteId', async (req, res, next) => {
  try {
    res.json(await obtenerIntegracionErpPublica(req.params.clienteId));
  } catch (error) {
    next(error);
  }
});

router.put('/:clienteId', async (req, res, next) => {
  try {
    const input = {
      ...(req.body as IntegracionErpInput),
      clienteId: req.params.clienteId,
    };
    const usuarioId = (req as RequestConUsuario).user?.sub;

    res.json(await guardarIntegracionErp(input, usuarioId));
  } catch (error) {
    next(error);
  }
});

router.post('/:clienteId/probar', async (req, res, next) => {
  try {
    const snapshot = await obtenerSnapshotErp(req.params.clienteId);

    res.json({
      ok: true,
      campos: snapshot.campos.length,
      lotes: snapshot.lotes.length,
      actividades: snapshot.actividades.length,
      especies: snapshot.especies.length,
      empresas: snapshot.empresas.length,
      sincronizadoEn: snapshot.sincronizadoEn,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
