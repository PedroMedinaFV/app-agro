import type { LoteMapaNdvi, MapasNdviLoteResponse } from '@agro/tipos';
import { prisma } from '../../prisma';
import { obtenerCamposAsignados } from '../usuarios/asignacionCampos';

type UsuarioOperacion = {
  id?: string;
  rol?: string;
  clienteId?: string;
};

type LoteNdviRow = {
  loteId: string;
  loteErpId: string | null;
  campoAppId: string;
  campoErpId: string | null;
};

type MapaNdviRow = {
  id: string;
  clienteId: string;
  loteAppId: string;
  loteErpId: string | null;
  campoAppId: string;
  campoErpId: string | null;
  campaniaErpId: string | null;
  fechaImagen: Date;
  fechaProcesamiento: Date | null;
  proveedor: string;
  origen: string;
  resolucionMetros: number | null;
  nubosidadPorcentaje: number | null;
  ndviPromedio: number | null;
  ndviMinimo: number | null;
  ndviMaximo: number | null;
  ndviDesvio: number | null;
  superficieAnalizadaHa: number | null;
  storageBucket: string | null;
  storagePathRaster: string | null;
  storagePathPreview: string | null;
  storagePathTiles: string | null;
  bboxGeoJson: unknown | null;
  metadata: unknown | null;
  estado: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function mapearMapaNdvi(row: MapaNdviRow): LoteMapaNdvi {
  return {
    id: row.id,
    clienteId: row.clienteId,
    loteAppId: row.loteAppId,
    loteErpId: row.loteErpId || undefined,
    campoAppId: row.campoAppId,
    campoErpId: row.campoErpId || undefined,
    campaniaErpId: row.campaniaErpId || undefined,
    fechaImagen: row.fechaImagen.toISOString(),
    fechaProcesamiento: row.fechaProcesamiento?.toISOString(),
    proveedor: row.proveedor,
    origen: row.origen as LoteMapaNdvi['origen'],
    resolucionMetros: row.resolucionMetros ?? undefined,
    nubosidadPorcentaje: row.nubosidadPorcentaje ?? undefined,
    ndviPromedio: row.ndviPromedio ?? undefined,
    ndviMinimo: row.ndviMinimo ?? undefined,
    ndviMaximo: row.ndviMaximo ?? undefined,
    ndviDesvio: row.ndviDesvio ?? undefined,
    superficieAnalizadaHa: row.superficieAnalizadaHa ?? undefined,
    storageBucket: row.storageBucket || undefined,
    storagePathRaster: row.storagePathRaster || undefined,
    storagePathPreview: row.storagePathPreview || undefined,
    storagePathTiles: row.storagePathTiles || undefined,
    bboxGeoJson: row.bboxGeoJson || undefined,
    metadata: row.metadata || undefined,
    estado: row.estado as LoteMapaNdvi['estado'],
    activo: row.activo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function validarAlcanceCampo(usuario: UsuarioOperacion, campoErpId: string | null) {
  const camposAsignados = await obtenerCamposAsignados({
    sub: usuario.id || '',
    rol: usuario.rol,
    clienteId: usuario.clienteId,
  });

  if (camposAsignados && (!campoErpId || !camposAsignados.includes(campoErpId))) {
    throw crearErrorValidacion('No tienes permisos para consultar mapas NDVI de este lote.', 403);
  }
}

async function obtenerLoteParaNdvi(loteAppId: string, usuario: UsuarioOperacion) {
  if (!usuario.clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const registros = await prisma.$queryRaw<LoteNdviRow[]>`
    SELECT
      lote."id" AS "loteId",
      lote."loteErpId",
      campo."id" AS "campoAppId",
      campo."campoErpId"
    FROM "LoteApp" lote
    INNER JOIN "CampoApp" campo ON campo."id" = lote."campoAppId"
    WHERE lote."id" = ${loteAppId}
      AND lote."clienteId" = ${usuario.clienteId}
    LIMIT 1
  `;
  const lote = registros[0];

  if (!lote) {
    throw crearErrorValidacion('Lote no encontrado.', 404);
  }

  await validarAlcanceCampo(usuario, lote.campoErpId);

  return lote;
}

export async function obtenerMapasNdviPorLote(
  loteAppId: string,
  usuario: UsuarioOperacion,
): Promise<MapasNdviLoteResponse> {
  await obtenerLoteParaNdvi(loteAppId, usuario);

  const registros = await prisma.$queryRaw<MapaNdviRow[]>`
    SELECT *
    FROM "LoteMapaNdvi"
    WHERE "clienteId" = ${usuario.clienteId}
      AND "loteAppId" = ${loteAppId}
      AND "activo" = true
    ORDER BY "fechaImagen" DESC, "createdAt" DESC
  `;
  const historial = registros.map(mapearMapaNdvi);
  const ultimo = historial.find((mapa) => mapa.estado === 'procesado') || historial[0];

  return {
    loteAppId,
    ultimo,
    historial,
  };
}

export async function obtenerUltimoMapaNdviPorLote(loteAppId: string, usuario: UsuarioOperacion) {
  await obtenerLoteParaNdvi(loteAppId, usuario);

  const registros = await prisma.$queryRaw<MapaNdviRow[]>`
    SELECT *
    FROM "LoteMapaNdvi"
    WHERE "clienteId" = ${usuario.clienteId}
      AND "loteAppId" = ${loteAppId}
      AND "activo" = true
      AND "estado" = 'procesado'
    ORDER BY "fechaImagen" DESC, "createdAt" DESC
    LIMIT 1
  `;

  return registros[0] ? mapearMapaNdvi(registros[0]) : null;
}

export async function obtenerMapaNdviPorId(mapaNdviId: string, usuario: UsuarioOperacion) {
  if (!usuario.clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const registros = await prisma.$queryRaw<MapaNdviRow[]>`
    SELECT mapa.*
    FROM "LoteMapaNdvi" mapa
    INNER JOIN "CampoApp" campo ON campo."id" = mapa."campoAppId"
    WHERE mapa."id" = ${mapaNdviId}
      AND mapa."clienteId" = ${usuario.clienteId}
    LIMIT 1
  `;
  const mapa = registros[0];

  if (!mapa) {
    throw crearErrorValidacion('Mapa NDVI no encontrado.', 404);
  }

  await validarAlcanceCampo(usuario, mapa.campoErpId);

  return mapearMapaNdvi(mapa);
}
