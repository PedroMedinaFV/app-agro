import { AuditoriaEventoResumen } from '@agro/tipos';
import { prisma } from '../../prisma';

type ListarAuditoriaFiltros = {
  clienteId?: string;
  entidad?: string;
  accion?: string;
  usuarioId?: string;
  limite?: number;
};

function normalizarLimite(limite?: number) {
  if (!limite || !Number.isFinite(limite)) {
    return 100;
  }

  return Math.min(Math.max(Math.trunc(limite), 1), 300);
}

export async function listarEventosAuditoria(filtros: ListarAuditoriaFiltros) {
  const limite = normalizarLimite(filtros.limite);
  const where = {
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
    ...(filtros.entidad ? { entidad: filtros.entidad } : {}),
    ...(filtros.accion ? { accion: filtros.accion } : {}),
    ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
  };

  const [eventos, total] = await Promise.all([
    prisma.auditoriaEvento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limite,
    }),
    prisma.auditoriaEvento.count({ where }),
  ]);

  const usuarios = await prisma.usuario.findMany({
    where: {
      id: {
        in: [...new Set(eventos.map((evento) => evento.usuarioId).filter(Boolean) as string[])],
      },
    },
    select: { id: true, email: true, nombre: true },
  });
  const usuariosPorId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));

  return {
    eventos: eventos.map((evento): AuditoriaEventoResumen => {
      const usuario = evento.usuarioId ? usuariosPorId.get(evento.usuarioId) : undefined;

      return {
        id: evento.id,
        clienteId: evento.clienteId || undefined,
        usuarioId: evento.usuarioId || undefined,
        usuarioEmail: usuario?.email,
        usuarioNombre: usuario?.nombre || undefined,
        entidad: evento.entidad,
        entidadId: evento.entidadId,
        accion: evento.accion,
        origen: evento.origen,
        motivo: evento.motivo || undefined,
        valoresAntes: evento.valoresAntes ?? undefined,
        valoresDespues: evento.valoresDespues ?? undefined,
        metadata: evento.metadata ?? undefined,
        ip: evento.ip || undefined,
        userAgent: evento.userAgent || undefined,
        createdAt: evento.createdAt.toISOString(),
      };
    }),
    total,
    limite,
  };
}
