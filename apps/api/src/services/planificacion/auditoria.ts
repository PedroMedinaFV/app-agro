import { Prisma } from '@prisma/client';

export type UsuarioAuditoria = {
  id?: string;
  clienteId?: string;
  email?: string;
};

export async function registrarAuditoria(
  tx: Prisma.TransactionClient,
  datos: {
    clienteId: string;
    usuario?: UsuarioAuditoria;
    entidad: string;
    entidadId: string;
    accion: string;
    origen: string;
    motivo?: string;
    valoresAntes?: unknown;
    valoresDespues?: unknown;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await tx.auditoriaEvento.create({
    data: {
      clienteId: datos.clienteId,
      usuarioId: datos.usuario?.id,
      entidad: datos.entidad,
      entidadId: datos.entidadId,
      accion: datos.accion,
      origen: datos.origen,
      motivo: datos.motivo,
      valoresAntes: datos.valoresAntes === undefined ? Prisma.JsonNull : datos.valoresAntes as Prisma.InputJsonValue,
      valoresDespues: datos.valoresDespues === undefined ? Prisma.JsonNull : datos.valoresDespues as Prisma.InputJsonValue,
      metadata: datos.metadata || (datos.usuario?.email ? { email: datos.usuario.email } : Prisma.JsonNull),
    },
  });
}
