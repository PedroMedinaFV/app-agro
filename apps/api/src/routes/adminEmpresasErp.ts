import { Router } from 'express';
import type { Request } from 'express';
import type { AsignarEmpresasErpClienteInput } from '@agro/tipos';
import { listarEmpresasErpCliente, reemplazarEmpresasErpCliente } from '../services/erp/empresasCliente';
import { listarEmpresasErpImportadas, sincronizarEmpresasErp } from '../services/erp/sincronizarErp';

type RequestConUsuario = Request & { user?: { sub?: string } };

const router = Router();

router.get('/:clienteId/empresas', async (req, res, next) => {
  try {
    res.json({
      empresas: await listarEmpresasErpImportadas(),
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

router.post('/:clienteId/importar', async (req, res, next) => {
  try {
    res.json(await sincronizarEmpresasErp(req.params.clienteId));
  } catch (error) {
    next(error);
  }
});

export default router;
