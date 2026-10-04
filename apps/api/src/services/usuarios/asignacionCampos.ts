import { randomUUID } from 'node:crypto';
import { AsignacionCampoUsuario, AsignarCamposUsuarioInput } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria } from '../planificacion/auditoria';
import {
  camposAsignadosPorDefecto,
  crearErrorValidacion,
  rolTieneTodosLosCampos,
} from './validacionesUsuarios';

type UsuarioAutorizado = {
  sub: string;
  rol?: string;
  clienteId?: string;
};

export type UsuarioCampoErpRow = {
  id: string;
  clienteId: string;
  usuarioId: string;
  campoErpId: string;
  asignadoPor: string | null;
  createdAt: Date;
};

type UsuarioAsignable = {
  clienteId: string | null;
};

type ReemplazarAsignacionesUsuarioDeps = {
  buscarUsuario: (usuarioId: string) => Promise<UsuarioAsignable | null>;
  listarEmpresasCliente: (clienteId: string) => Promise<Array<{ empresaErpId: string }>>;
  listarCamposValidos: (camposErpIds: string[], empresasErpIds: string[]) => Promise<Array<{ erpId: string }>>;
  listarAsignaciones: (clienteId: string, usuarioId: string) => Promise<AsignacionCampoUsuario[]>;
  ejecutarTransaccion: <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
  registrarAuditoria: typeof registrarAuditoria;
  generarId: () => string;
};

const depsReemplazarAsignacionesUsuario: ReemplazarAsignacionesUsuarioDeps = {
  buscarUsuario: (usuarioId) => prisma.usuario.findUnique({ where: { id: usuarioId } }),
  listarEmpresasCliente: (clienteId) => prisma.clienteEmpresaErp.findMany({
    where: { clienteId },
    select: { empresaErpId: true },
  }),
  listarCamposValidos: (camposErpIds, empresasErpIds) => prisma.erpCampo.findMany({
    where: {
      erpId: { in: camposErpIds },
      empresaErpId: { in: empresasErpIds },
    },
    select: { erpId: true },
  }),
  listarAsignaciones: listarAsignacionesUsuario,
  ejecutarTransaccion: (callback) => prisma.$transaction(callback),
  registrarAuditoria,
  generarId: randomUUID,
};

export function mapearAsignacionUsuarioCampo(row: UsuarioCampoErpRow): AsignacionCampoUsuario {
  return {
    id: row.id,
    clienteId: row.clienteId,
    usuarioId: row.usuarioId,
    campoErpId: row.campoErpId,
    asignadoPor: row.asignadoPor || undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export { camposAsignadosPorDefecto };

export async function obtenerCamposAsignados(usuario: UsuarioAutorizado) {
  if (rolTieneTodosLosCampos(usuario.rol)) {
    return null;
  }

  if (!usuario.clienteId) {
    return camposAsignadosPorDefecto(usuario);
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ campoErpId: string }>>`
      SELECT "campoErpId"
      FROM "UsuarioCampoErp"
      WHERE "clienteId" = ${usuario.clienteId} AND "usuarioId" = ${usuario.sub}
    `;

    return rows.map((row) => row.campoErpId);
  } catch (error) {
    return camposAsignadosPorDefecto(usuario);
  }
}

export async function listarAsignacionesUsuario(clienteId: string, usuarioId: string) {
  const rows = await prisma.$queryRaw<UsuarioCampoErpRow[]>`
    SELECT *
    FROM "UsuarioCampoErp"
    WHERE "clienteId" = ${clienteId} AND "usuarioId" = ${usuarioId}
    ORDER BY "createdAt" DESC
  `;

  return rows.map(mapearAsignacionUsuarioCampo);
}

export async function reemplazarAsignacionesUsuarioConDeps(
  input: AsignarCamposUsuarioInput,
  asignadoPor: string | undefined,
  deps: ReemplazarAsignacionesUsuarioDeps = depsReemplazarAsignacionesUsuario,
) {
  const usuario = await deps.buscarUsuario(input.usuarioId);

  if (!usuario || usuario.clienteId !== input.clienteId) {
    throw crearErrorValidacion('El usuario no pertenece al cliente indicado.', 403);
  }

  if (input.camposErpIds.length > 0) {
    const empresas = await deps.listarEmpresasCliente(input.clienteId);
    const camposValidos = await deps.listarCamposValidos(
      input.camposErpIds,
      empresas.map((empresa) => empresa.empresaErpId),
    );
    const camposValidosSet = new Set(camposValidos.map((campo) => campo.erpId));
    const camposInvalidos = input.camposErpIds.filter((campoErpId) => !camposValidosSet.has(campoErpId));

    if (camposInvalidos.length > 0) {
      throw crearErrorValidacion('Hay campos seleccionados que no pertenecen al cliente o no estan vinculados al ERP.', 403);
    }
  }

  const asignacionesAntes = await deps.listarAsignaciones(input.clienteId, input.usuarioId);

  await deps.ejecutarTransaccion(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "UsuarioCampoErp"
      WHERE "clienteId" = ${input.clienteId} AND "usuarioId" = ${input.usuarioId}
    `;

    for (const campoErpId of input.camposErpIds) {
      await tx.$executeRaw`
        INSERT INTO "UsuarioCampoErp" ("id", "clienteId", "usuarioId", "campoErpId", "asignadoPor")
        VALUES (${deps.generarId()}, ${input.clienteId}, ${input.usuarioId}, ${campoErpId}, ${asignadoPor || null})
        ON CONFLICT ("clienteId", "usuarioId", "campoErpId") DO NOTHING
      `;
    }

    await deps.registrarAuditoria(tx, {
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

  return deps.listarAsignaciones(input.clienteId, input.usuarioId);
}

export async function reemplazarAsignacionesUsuario(input: AsignarCamposUsuarioInput, asignadoPor?: string) {
  return reemplazarAsignacionesUsuarioConDeps(input, asignadoPor);
}
