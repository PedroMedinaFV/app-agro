import { Router } from 'express';
import type { Request } from 'express';
import type { AsignarEmpresasErpClienteInput } from '@agro/tipos';
import { listarEmpresasErpCliente, reemplazarEmpresasErpCliente } from '../services/erp/empresasCliente';
import { obtenerEmpresasSistemaErp } from '../services/erp/clienteErp';

type RequestConUsuario = Request & { user?: { sub?: string } };

const router = Router();

router.get('/:clienteId/empresas', async (req, res, next) => {
  try {
    res.json({
      empresas: await obtenerEmpresasSistemaErp(req.params.clienteId),
      seleccionadas: await listarEmpresasErpCliente(req.params.clienteId),
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:clienteId/empresas', async (req, res, next) => {
  try {
    const input: AsignarEmpresasErpClienteInput = {
      clienteId: req.params.clienteId,
      empresasErpIds: Array.isArray(req.body?.empresasErpIds) ? req.body.empresasErpIds : [],
    };

    res.json(await reemplazarEmpresasErpCliente(input, (req as RequestConUsuario).user?.sub));
  } catch (error) {
    next(error);
  }
});

export default router;
