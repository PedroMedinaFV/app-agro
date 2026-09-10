import type { EstadioFenologicoReferencia } from '@agro/tipos';
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../prisma';
import { estadiosReferenciaDemo } from './mockPlanificacion';

type ClientePrisma = PrismaClient | Prisma.TransactionClient;
type EstadioSemilla = (typeof estadiosReferenciaDemo)[number] & {
  actividadErpId?: string;
  empresaErpId?: string;
};

function crearEstadioId(clienteId: string, idEstadio: number) {
  return clienteId === 'cliente-demo'
    ? `estadio-semilla-${idEstadio}`
    : `estadio-${clienteId}-semilla-${idEstadio}`;
}

function mapearEstadio(registro: {
  id: string;
  idEstadio: number;
  actividadErpId: string | null;
  codigo: string;
  nombre: string;
  ordenCronologico: number;
  empresaErpId: string | null;
  activo: boolean;
  origen: string;
}): EstadioFenologicoReferencia {
  return {
    id: registro.id,
    idEstadio: registro.idEstadio,
    actividadErpId: registro.actividadErpId || undefined,
    codigo: registro.codigo,
    nombre: registro.nombre,
    ordenCronologico: registro.ordenCronologico,
    empresaErpId: registro.empresaErpId || undefined,
    activo: registro.activo,
    origen: registro.origen === 'erp' ? 'erp' : 'semilla',
  };
}

/**
 * Los estadios aun no vienen del ERP. Se persisten como semilla por cliente
 * para que protocolos y etapas siempre referencien registros reales.
 */
export async function asegurarEstadiosReferenciaSemilla(clienteId: string, client: ClientePrisma = prisma) {
  const estadios = [];

  for (const estadioBase of estadiosReferenciaDemo) {
    const estadio = estadioBase as EstadioSemilla;

    const guardado = await client.estadioFenologicoReferencia.upsert({
      where: {
        clienteId_idEstadio: {
          clienteId,
          idEstadio: estadio.idEstadio,
        },
      },
      update: {
        codigo: estadio.codigo,
        nombre: estadio.nombre,
        ordenCronologico: estadio.ordenCronologico,
        actividadErpId: estadio.actividadErpId,
        empresaErpId: estadio.empresaErpId,
        activo: estadio.activo,
        origen: estadio.origen,
      },
      create: {
        id: crearEstadioId(clienteId, estadio.idEstadio),
        clienteId,
        idEstadio: estadio.idEstadio,
        codigo: estadio.codigo,
        nombre: estadio.nombre,
        ordenCronologico: estadio.ordenCronologico,
        actividadErpId: estadio.actividadErpId,
        empresaErpId: estadio.empresaErpId,
        activo: estadio.activo,
        origen: estadio.origen,
      },
    });

    estadios.push(mapearEstadio(guardado));
  }

  return estadios.sort((a, b) => a.ordenCronologico - b.ordenCronologico || a.idEstadio - b.idEstadio);
}

export async function obtenerEstadiosReferenciaPersistidos(clienteId: string, client: ClientePrisma = prisma) {
  const registros = await client.estadioFenologicoReferencia.findMany({
    where: { clienteId, activo: true },
    orderBy: [{ ordenCronologico: 'asc' }, { idEstadio: 'asc' }],
  });

  return registros.map(mapearEstadio);
}
