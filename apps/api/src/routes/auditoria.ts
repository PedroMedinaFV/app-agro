import { Router } from 'express';
import { AuditoriaEventosResponse } from '@agro/tipos';
import { listarEventosAuditoria } from '../services/auditoria/auditoriaPrisma';

const router = Router();

type RequestConUsuario = {
  user?: {
    sub: string;
    rol?: string;
    clienteId?: string;
  };
  query: {
    entidad?: string;
    accion?: string;
    usuarioId?: string;
    limite?: string;
  };
};

router.get('/', async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    if (!request.user?.clienteId) {
      return res.status(403).json({ error: 'No se pudo determinar el cliente para consultar auditoria.' });
    }

    const respuesta: AuditoriaEventosResponse = await listarEventosAuditoria({
      clienteId: request.user.clienteId,
      entidad: request.query.entidad,
      accion: request.query.accion,
      usuarioId: request.query.usuarioId,
      limite: request.query.limite ? Number(request.query.limite) : undefined,
    });

    res.json(respuesta);
  } catch (error) {
    next(error);
  }
});

export default router;
