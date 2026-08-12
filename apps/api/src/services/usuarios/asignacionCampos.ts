import { randomUUID } from 'node:crypto';
import { AsignacionCampoUsuario, AsignarCamposUsuarioInput } from '@agro/tipos';
import { prisma } from '../../prisma';

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

export function camposDemoAsignados(usuario: UsuarioAutorizado) {
  if (usuario.rol === 'admin') {
    return null;
  }

  return ['empresa:mock:campo:241'];
}

export async function obtenerCamposAsignados(usuario: UsuarioAutorizado) {
  if (usuario.rol === 'admin') {
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
  await prisma.$executeRaw`
    DELETE FROM "UsuarioCampoErp"
    WHERE "clienteId" = ${input.clienteId} AND "usuarioId" = ${input.usuarioId}
  `;

  for (const campoErpId of input.camposErpIds) {
    await prisma.$executeRaw`
      INSERT INTO "UsuarioCampoErp" ("id", "clienteId", "usuarioId", "campoErpId", "asignadoPor")
      VALUES (${randomUUID()}, ${input.clienteId}, ${input.usuarioId}, ${campoErpId}, ${asignadoPor || null})
      ON CONFLICT ("clienteId", "usuarioId", "campoErpId") DO NOTHING
    `;
  }

  return listarAsignacionesUsuario(input.clienteId, input.usuarioId);
}
