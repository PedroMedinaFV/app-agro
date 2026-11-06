import { Router } from 'express';
import { requiereClienteRuta } from '../middleware/cliente';
import type { Request } from 'express';
import type { AsignarEmpresasErpClienteInput } from '@agro/tipos';
import { listarEmpresasErpCliente, reemplazarEmpresasErpCliente } from '../services/erp/empresasCliente';
import { listarEmpresasErpImportadas } from '../services/erp/sincronizarErp';
import { importarEmpresasConBloqueo } from '../services/erp/ejecutarSincronizacionErp';

type RequestConUsuario = Request & { user?: { sub?: string } };

const router = Router();
router.use('/:clienteId', requiereClienteRuta);

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
    res.json(await importarEmpresasConBloqueo(req.params.clienteId, { id: (req as RequestConUsuario).user?.sub, clienteId: req.params.clienteId }));
  } catch (error) {
    next(error);
  }
});

export default router;
