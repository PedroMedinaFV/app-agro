import { randomUUID } from 'node:crypto';
import { AsignacionCampoUsuario, AsignarCamposUsuarioInput } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria } from '../planificacion/auditoria';

type UsuarioAutorizado = {
  sub: string;
  rol?: string;
  clienteId?: string;
};

type UsuarioCampoErpRow = {
  id: string;
  clienteId: string;
  usuarioId: string;
  campoErpId: string;
  asignadoPor: string | null;
  createdAt: Date;
};

function mapearAsignacion(row: UsuarioCampoErpRow): AsignacionCampoUsuario {
  return {
    id: row.id,
    clienteId: row.clienteId,
    usuarioId: row.usuarioId,
    campoErpId: row.campoErpId,
    asignadoPor: row.asignadoPor || undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

export function camposDemoAsignados(usuario: UsuarioAutorizado) {
  if (usuario.rol === 'admin' || usuario.rol === 'planificador' || usuario.rol === 'responsable_compras') {
    return null;
  }

  return ['empresa:mock:campo:241'];
}

export async function obtenerCamposAsignados(usuario: UsuarioAutorizado) {
  if (usuario.rol === 'admin' || usuario.rol === 'planificador' || usuario.rol === 'responsable_compras') {
    return null;
  }

  if (!usuario.clienteId) {
    return camposDemoAsignados(usuario);
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ campoErpId: string }>>`
      SELECT "campoErpId"
      FROM "UsuarioCampoErp"
      WHERE "clienteId" = ${usuario.clienteId} AND "usuarioId" = ${usuario.sub}
    `;

    if (!rows.length && usuario.sub.startsWith('demo-')) {
      return camposDemoAsignados(usuario);
    }

    return rows.map((row) => row.campoErpId);
  } catch (error) {
    return camposDemoAsignados(usuario);
  }
}

export async function listarAsignacionesUsuario(clienteId: string, usuarioId: string) {
  const rows = await prisma.$queryRaw<UsuarioCampoErpRow[]>`
    SELECT *
    FROM "UsuarioCampoErp"
    WHERE "clienteId" = ${clienteId} AND "usuarioId" = ${usuarioId}
    ORDER BY "createdAt" DESC
  `;

  return rows.map(mapearAsignacion);
}

export async function reemplazarAsignacionesUsuario(input: AsignarCamposUsuarioInput, asignadoPor?: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: input.usuarioId } });

  if (!usuario || usuario.clienteId !== input.clienteId) {
    throw crearErrorValidacion('El usuario no pertenece al cliente indicado.', 403);
  }

  if (input.camposErpIds.length > 0) {
    const camposValidos = await prisma.erpCampo.findMany({
      where: {
        erpId: { in: input.camposErpIds },
        empresaErpId: {
          in: await prisma.clienteEmpresaErp.findMany({
            where: { clienteId: input.clienteId },
            select: { empresaErpId: true },
          }).then((empresas) => empresas.map((empresa) => empresa.empresaErpId)),
        },
      },
      select: { erpId: true },
    });
    const camposValidosSet = new Set(camposValidos.map((campo) => campo.erpId));
    const camposInvalidos = input.camposErpIds.filter((campoErpId) => !camposValidosSet.has(campoErpId));

    if (camposInvalidos.length > 0) {
      throw crearErrorValidacion('Hay campos seleccionados que no pertenecen al cliente o no estan vinculados al ERP.', 403);
    }
  }

  const asignacionesAntes = await listarAsignacionesUsuario(input.clienteId, input.usuarioId);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "UsuarioCampoErp"
      WHERE "clienteId" = ${input.clienteId} AND "usuarioId" = ${input.usuarioId}
    `;

    for (const campoErpId of input.camposErpIds) {
      await tx.$executeRaw`
        INSERT INTO "UsuarioCampoErp" ("id", "clienteId", "usuarioId", "campoErpId", "asignadoPor")
        VALUES (${randomUUID()}, ${input.clienteId}, ${input.usuarioId}, ${campoErpId}, ${asignadoPor || null})
        ON CONFLICT ("clienteId", "usuarioId", "campoErpId") DO NOTHING
      `;
    }

    await registrarAuditoria(tx, {
      clienteId: input.clienteId,
      usuario: { id: asignadoPor, clienteId: input.clienteId },
      entidad: 'UsuarioCampoErp',
      entidadId: input.usuarioId,
      accion: 'reemplazar_asignaciones',
      origen: 'web',
      motivo: 'Asignacion de campos operativos a usuario.',
      valoresAntes: asignacionesAntes,
      valoresDespues: input.camposErpIds,
      metadata: { camposAsignados: input.camposErpIds.length } as Prisma.InputJsonValue,
    });
  });

  return listarAsignacionesUsuario(input.clienteId, input.usuarioId);
}
