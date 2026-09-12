import { Prisma } from '@prisma/client';
import type {
  EstadoSincronizacionErp,
  PadronErpSincronizable,
  SincronizacionErpHistorialItem,
} from '@agro/tipos';
import { randomUUID } from 'node:crypto';
import { padronesErpSincronizables } from '@agro/tipos';
import { prisma } from '../../prisma';
import { listarEmpresasErpCliente } from './empresasCliente';

type SincronizacionRow = {
  id: string;
  clienteId: string;
  usuarioId: string | null;
  estado: string;
  itemsSolicitados: unknown;
  itemsEjecutados: unknown;
  resultado: unknown | null;
  error: string | null;
  iniciadoEn: Date;
  finalizadoEn: Date | null;
};

type DetalleRow = {
  id: string;
  sincronizacionId: string;
  empresaErpId: string;
  padron: string;
  registros: number;
  omitidos: number;
  estado: string;
  error: string | null;
  createdAt: Date;
};

type ConteoEmpresa = {
  empresaErpId: string;
  registros: number;
};

const padronesPorEmpresa = new Set<PadronErpSincronizable>(['campos', 'lotes', 'cultivos']);

function normalizarItems(items?: PadronErpSincronizable[]) {
  const seleccionados = new Set(items?.length ? items : padronesErpSincronizables);

  if (seleccionados.has('cultivos')) {
    seleccionados.add('campanias');
    seleccionados.add('actividades');
    seleccionados.add('especies');
    seleccionados.add('lotes');
  }

  if (seleccionados.has('lotes')) {
    seleccionados.add('campos');
  }

  if (seleccionados.has('campos')) {
    seleccionados.add('lotes');
    seleccionados.add('zonas');
  }

  if (seleccionados.has('insumos') || seleccionados.has('servicios')) {
    seleccionados.add('unidadesMedida');
  }

  if (seleccionados.has('insumos')) {
    seleccionados.add('tiposInsumo');
  }

  if (seleccionados.has('servicios')) {
    seleccionados.add('tiposServicio');
  }

  return Array.from(seleccionados);
}

function asegurarPadrones(items: unknown): PadronErpSincronizable[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item): item is PadronErpSincronizable =>
    typeof item === 'string' && padronesErpSincronizables.includes(item as PadronErpSincronizable),
  );
}

function mapearDetalle(row: DetalleRow) {
  return {
    id: row.id,
    sincronizacionId: row.sincronizacionId,
    empresaErpId: row.empresaErpId,
    padron: row.padron as PadronErpSincronizable,
    registros: row.registros,
    omitidos: row.omitidos,
    estado: row.estado as EstadoSincronizacionErp,
    error: row.error || undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapearSincronizacion(row: SincronizacionRow, detalles: DetalleRow[]): SincronizacionErpHistorialItem {
  return {
    id: row.id,
    clienteId: row.clienteId,
    usuarioId: row.usuarioId || undefined,
    estado: row.estado as EstadoSincronizacionErp,
    itemsSolicitados: asegurarPadrones(row.itemsSolicitados),
    itemsEjecutados: asegurarPadrones(row.itemsEjecutados),
    resultado: row.resultado || undefined,
    error: row.error || undefined,
    iniciadoEn: row.iniciadoEn.toISOString(),
    finalizadoEn: row.finalizadoEn?.toISOString(),
    detalles: detalles.map(mapearDetalle),
  };
}

export async function iniciarSincronizacionErpHistorial(clienteId: string, usuarioId: string | undefined, items?: PadronErpSincronizable[]) {
  const itemsSolicitados = items?.length ? items : padronesErpSincronizables;
  const itemsEjecutados = normalizarItems(items);
  const sincronizacionId = randomUUID();
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "ErpSincronizacion" ("id", "clienteId", "usuarioId", "estado", "itemsSolicitados", "itemsEjecutados", "updatedAt")
    VALUES (
      ${sincronizacionId},
      ${clienteId},
      ${usuarioId || null},
      'en_proceso',
      ${JSON.stringify(itemsSolicitados)}::jsonb,
      ${JSON.stringify(itemsEjecutados)}::jsonb,
      NOW()
    )
    RETURNING "id"
  `;

  return {
    id: rows[0].id,
    itemsEjecutados,
  };
}

async function contarPadronGlobal(padron: PadronErpSincronizable): Promise<number> {
  if (padron === 'empresas') return prisma.erpEmpresa.count();
  if (padron === 'zonas') return prisma.erpZona.count({ where: { empresaErpId: 'global' } });
  if (padron === 'actividades') return prisma.erpActividad.count({ where: { empresaErpId: 'global' } });
  if (padron === 'especies') return prisma.erpEspecie.count({ where: { empresaErpId: 'global' } });
  if (padron === 'campanias') return prisma.erpCampania.count({ where: { empresaErpId: 'global' } });
  if (padron === 'insumos') return prisma.erpInsumo.count({ where: { empresaErpId: 'global' } });
  if (padron === 'tiposInsumo') return prisma.erpTipoInsumo.count({ where: { empresaErpId: 'global' } });
  if (padron === 'servicios') return prisma.erpServicio.count({ where: { empresaErpId: 'global' } });
  if (padron === 'tiposServicio') return prisma.erpTipoServicio.count({ where: { empresaErpId: 'global' } });
  if (padron === 'unidadesMedida') return prisma.erpUnidadMedida.count({ where: { empresaErpId: 'global' } });
  if (padron === 'monedas') return prisma.erpMoneda.count({ where: { empresaErpId: 'global' } });
  if (padron === 'puertos') return prisma.erpPuerto.count({ where: { empresaErpId: 'global' } });

  return 0;
}

async function contarPadronPorEmpresa(padron: PadronErpSincronizable, empresaErpIds: string[]): Promise<ConteoEmpresa[]> {
  if (!empresaErpIds.length) {
    return [];
  }

  if (padron === 'campos') {
    return prisma.$queryRaw<ConteoEmpresa[]>`
      SELECT "empresaErpId", COUNT(*)::int AS "registros"
      FROM "ErpCampo"
      WHERE "empresaErpId" IN (${Prisma.join(empresaErpIds)})
      GROUP BY "empresaErpId"
    `;
  }

  if (padron === 'lotes') {
    return prisma.$queryRaw<ConteoEmpresa[]>`
      SELECT "empresaErpId", COUNT(*)::int AS "registros"
      FROM "ErpLote"
      WHERE "empresaErpId" IN (${Prisma.join(empresaErpIds)})
      GROUP BY "empresaErpId"
    `;
  }

  if (padron === 'cultivos') {
    return prisma.$queryRaw<ConteoEmpresa[]>`
      SELECT "empresaErpId", COUNT(*)::int AS "registros"
      FROM "ErpCultivo"
      WHERE "empresaErpId" IN (${Prisma.join(empresaErpIds)})
      GROUP BY "empresaErpId"
    `;
  }

  return [];
}

export async function finalizarSincronizacionErpHistorial(
  sincronizacionId: string,
  clienteId: string,
  itemsEjecutados: PadronErpSincronizable[],
  resultado: unknown,
) {
  const empresasSeleccionadas = await listarEmpresasErpCliente(clienteId);
  const empresaErpIds = empresasSeleccionadas.map((empresa) => empresa.empresaErpId);
  const detalles: Array<{
    empresaErpId: string;
    padron: PadronErpSincronizable;
    registros: number;
    omitidos: number;
  }> = [];

  for (const padron of itemsEjecutados) {
    if (padronesPorEmpresa.has(padron)) {
      const conteos = await contarPadronPorEmpresa(padron, empresaErpIds);
      const conteosPorEmpresa = new Map(conteos.map((conteo) => [conteo.empresaErpId, conteo.registros]));

      for (const empresaErpId of empresaErpIds) {
        detalles.push({
          empresaErpId,
          padron,
          registros: conteosPorEmpresa.get(empresaErpId) || 0,
          omitidos: padron === 'lotes' ? Number((resultado as { omitidos?: { lotesSinCampo?: number } })?.omitidos?.lotesSinCampo || 0) : 0,
        });
      }
      continue;
    }

    detalles.push({
      empresaErpId: 'global',
      padron,
      registros: await contarPadronGlobal(padron),
      omitidos: 0,
    });
  }

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "ErpSincronizacion"
      SET "estado" = 'completada',
          "resultado" = ${JSON.stringify(resultado)}::jsonb,
          "finalizadoEn" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = ${sincronizacionId}
    `,
    prisma.$executeRaw`
      INSERT INTO "ErpSincronizacionDetalle" ("id", "sincronizacionId", "empresaErpId", "padron", "registros", "omitidos", "estado")
      VALUES ${Prisma.join(detalles.map((detalle) => Prisma.sql`(${randomUUID()}, ${sincronizacionId}, ${detalle.empresaErpId}, ${detalle.padron}, ${detalle.registros}, ${detalle.omitidos}, 'completada')`))}
    `,
  ]);
}

export async function fallarSincronizacionErpHistorial(sincronizacionId: string, error: unknown) {
  const mensaje = error instanceof Error ? error.message : 'Error desconocido durante la sincronizacion ERP.';

  await prisma.$executeRaw`
    UPDATE "ErpSincronizacion"
    SET "estado" = 'error',
        "error" = ${mensaje},
        "finalizadoEn" = NOW(),
        "updatedAt" = NOW()
    WHERE "id" = ${sincronizacionId}
  `;
}

export async function listarHistorialSincronizacionesErp(clienteId: string, limite = 10) {
  const sincronizaciones = await prisma.$queryRaw<SincronizacionRow[]>`
    SELECT "id", "clienteId", "usuarioId", "estado", "itemsSolicitados", "itemsEjecutados", "resultado", "error", "iniciadoEn", "finalizadoEn"
    FROM "ErpSincronizacion"
    WHERE "clienteId" = ${clienteId}
    ORDER BY "iniciadoEn" DESC
    LIMIT ${limite}
  `;
  const ids = sincronizaciones.map((sincronizacion) => sincronizacion.id);
  const detalles = ids.length
    ? await prisma.$queryRaw<DetalleRow[]>`
      SELECT "id", "sincronizacionId", "empresaErpId", "padron", "registros", "omitidos", "estado", "error", "createdAt"
      FROM "ErpSincronizacionDetalle"
      WHERE "sincronizacionId" IN (${Prisma.join(ids)})
      ORDER BY "empresaErpId" ASC, "padron" ASC
    `
    : [];
  const detallesPorSync = new Map<string, DetalleRow[]>();

  for (const detalle of detalles) {
    detallesPorSync.set(detalle.sincronizacionId, [...(detallesPorSync.get(detalle.sincronizacionId) || []), detalle]);
  }

  return {
    sincronizaciones: sincronizaciones.map((sincronizacion) =>
      mapearSincronizacion(sincronizacion, detallesPorSync.get(sincronizacion.id) || []),
    ),
  };
}
