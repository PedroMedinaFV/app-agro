import { AuditoriaEventoResumen } from '@agro/tipos';
import { prisma } from '../../prisma';

type ListarAuditoriaFiltros = {
  clienteId?: string;
  entidad?: string;
  accion?: string;
  usuarioId?: string;
  limite?: number;
};

type AuditoriaCliente = Pick<typeof prisma, 'auditoriaEvento' | 'usuario'>;

type AuditoriaEventoRow = {
  id: string;
  clienteId: string | null;
  usuarioId: string | null;
  entidad: string;
  entidadId: string;
  accion: string;
  origen: string;
  motivo: string | null;
  valoresAntes: unknown;
  valoresDespues: unknown;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
};

type AuditoriaUsuarioRow = {
  id: string;
  email: string;
  nombre: string | null;
};

export function normalizarLimiteAuditoria(limite?: number) {
  if (!limite || !Number.isFinite(limite)) {
    return 100;
  }

  return Math.min(Math.max(Math.trunc(limite), 1), 300);
}

export function construirWhereAuditoria(filtros: ListarAuditoriaFiltros) {
  return {
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
    ...(filtros.entidad ? { entidad: filtros.entidad } : {}),
    ...(filtros.accion ? { accion: filtros.accion } : {}),
    ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
  };
}

export function mapearEventoAuditoria(
  evento: AuditoriaEventoRow,
  usuariosPorId: Map<string, AuditoriaUsuarioRow>,
): AuditoriaEventoResumen {
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
}

export async function listarEventosAuditoriaConCliente(client: AuditoriaCliente, filtros: ListarAuditoriaFiltros) {
  const limite = normalizarLimiteAuditoria(filtros.limite);
  const where = construirWhereAuditoria(filtros);

  const [eventos, total] = await Promise.all([
    client.auditoriaEvento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limite,
    }),
    client.auditoriaEvento.count({ where }),
  ]);

  const usuarios = await client.usuario.findMany({
    where: {
      id: {
        in: [...new Set(eventos.map((evento) => evento.usuarioId).filter(Boolean) as string[])],
      },
    },
    select: { id: true, email: true, nombre: true },
  });
  const usuariosPorId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));

  return {
    eventos: eventos.map((evento) => mapearEventoAuditoria(evento, usuariosPorId)),
    total,
    limite,
  };
}

export async function listarEventosAuditoria(filtros: ListarAuditoriaFiltros) {
  return listarEventosAuditoriaConCliente(prisma, filtros);
}
