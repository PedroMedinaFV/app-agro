import { Router } from 'express';
import type { Request } from 'express';
import type { AsignarCamposUsuarioInput } from '@agro/tipos';
import { listarAsignacionesUsuario, reemplazarAsignacionesUsuario } from '../services/usuarios/asignacionCampos';

type RequestConUsuario = Request & { user?: { sub?: string } };

const router = Router();

router.get('/:clienteId/usuarios/:usuarioId/campos', async (req, res, next) => {
  try {
    res.json(await listarAsignacionesUsuario(req.params.clienteId, req.params.usuarioId));
  } catch (error) {
    next(error);
  }
});

router.put('/:clienteId/usuarios/:usuarioId/campos', async (req, res, next) => {
  try {
    const input: AsignarCamposUsuarioInput = {
      clienteId: req.params.clienteId,
      usuarioId: req.params.usuarioId,
      camposErpIds: Array.isArray(req.body?.camposErpIds) ? req.body.camposErpIds : [],
    };

    res.json(await reemplazarAsignacionesUsuario(input, (req as RequestConUsuario).user?.sub));
  } catch (error) {
    next(error);
  }
});

export default router;
