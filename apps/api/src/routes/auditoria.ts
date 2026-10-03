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

type ListarEventosAuditoriaFn = typeof listarEventosAuditoria;

export async function resolverConsultaAuditoria(
  request: RequestConUsuario,
  listarEventos: ListarEventosAuditoriaFn = listarEventosAuditoria,
): Promise<{ status: number; body: AuditoriaEventosResponse | { error: string } }> {
  if (!request.user?.clienteId) {
    return {
      status: 403,
      body: { error: 'No se pudo determinar el cliente para consultar auditoria.' },
    };
  }

  const respuesta: AuditoriaEventosResponse = await listarEventos({
    clienteId: request.user.clienteId,
    entidad: request.query.entidad,
    accion: request.query.accion,
    usuarioId: request.query.usuarioId,
    limite: request.query.limite ? Number(request.query.limite) : undefined,
  });

  return {
    status: 200,
    body: respuesta,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const respuesta = await resolverConsultaAuditoria(req as RequestConUsuario);

    res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

export default router;
