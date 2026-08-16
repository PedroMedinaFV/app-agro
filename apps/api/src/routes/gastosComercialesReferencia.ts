import { Request, Router } from 'express';
import type { GuardarGastosComercialesReferenciaRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { guardarGastoComercialPersistido } from '../services/gastosComerciales/gastosComercialesPrisma';

const router = Router();
type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; clienteId?: string };
};

router.put('/:id', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await guardarGastoComercialPersistido(req.params.id, req.body as GuardarGastosComercialesReferenciaRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
