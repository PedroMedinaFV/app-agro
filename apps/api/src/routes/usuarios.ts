import { Request, Router } from 'express';
import type { GuardarUsuarioAdminRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { guardarUsuarioAdmin, obtenerUsuariosAdmin } from '../services/usuarios/usuariosAdminPrisma';

const router = Router();

type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; clienteId?: string };
};

router.get('/', requierePermiso('usuarios:gestionar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = request.user?.clienteId;

    if (!clienteId) {
      return res.status(401).json({ error: 'Sesion sin cliente asociado.' });
    }

    res.json(await obtenerUsuariosAdmin(clienteId));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requierePermiso('usuarios:gestionar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await guardarUsuarioAdmin(req.params.id, req.body as GuardarUsuarioAdminRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
