import { randomUUID } from 'node:crypto';
import type { GuardarMapaNdviRequest, GuardarMapaNdviResponse, LoteMapaNdvi, MapasNdviLoteResponse } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { obtenerCamposAsignados } from '../usuarios/asignacionCampos';
import { registrarAuditoria } from '../planificacion/auditoria';

type UsuarioOperacion = {
  id?: string;
  email?: string;
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

function esOrigenMapaNdvi(valor: string): valor is LoteMapaNdvi['origen'] {
  return valor === 'manual' || valor === 'proveedor_api' || valor === 'importacion' || valor === 'proceso_interno';
}

function esEstadoMapaNdvi(valor: string): valor is LoteMapaNdvi['estado'] {
  return valor === 'pendiente_procesamiento' || valor === 'procesado' || valor === 'rechazado' || valor === 'archivado';
}

function validarNumeroOpcional(valor: number | undefined, campo: string, minimo?: number, maximo?: number) {
  if (valor === undefined) {
    return;
  }

  if (!Number.isFinite(valor)) {
    throw crearErrorValidacion(`${campo} debe ser numerico.`);
  }

  if (minimo !== undefined && valor < minimo) {
    throw crearErrorValidacion(`${campo} debe ser mayor o igual a ${minimo}.`);
  }

  if (maximo !== undefined && valor > maximo) {
    throw crearErrorValidacion(`${campo} debe ser menor o igual a ${maximo}.`);
  }
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

export async function guardarMapaNdviLote(
  loteAppId: string,
  request: GuardarMapaNdviRequest,
  usuario: UsuarioOperacion,
): Promise<GuardarMapaNdviResponse> {
  const lote = await obtenerLoteParaNdvi(loteAppId, usuario);
  const mapa = request.mapa;
  const id = mapa.id || randomUUID();
  const fechaImagen = new Date(mapa.fechaImagen);
  const fechaProcesamiento = mapa.fechaProcesamiento ? new Date(mapa.fechaProcesamiento) : null;

  if (Number.isNaN(fechaImagen.getTime())) {
    throw crearErrorValidacion('La fecha de imagen NDVI no es valida.');
  }

  if (fechaImagen.getTime() > Date.now()) {
    throw crearErrorValidacion('La fecha de imagen NDVI no puede ser futura.');
  }

  if (fechaProcesamiento && Number.isNaN(fechaProcesamiento.getTime())) {
    throw crearErrorValidacion('La fecha de procesamiento NDVI no es valida.');
  }

  if (!mapa.proveedor.trim()) {
    throw crearErrorValidacion('El proveedor NDVI es obligatorio.');
  }

  if (!esOrigenMapaNdvi(mapa.origen)) {
    throw crearErrorValidacion('El origen NDVI no es valido.');
  }

  if (!esEstadoMapaNdvi(mapa.estado)) {
    throw crearErrorValidacion('El estado NDVI no es valido.');
  }

  validarNumeroOpcional(mapa.resolucionMetros, 'La resolucion', 0);
  validarNumeroOpcional(mapa.nubosidadPorcentaje, 'La nubosidad', 0, 100);
  validarNumeroOpcional(mapa.ndviPromedio, 'El NDVI promedio', -1, 1);
  validarNumeroOpcional(mapa.ndviMinimo, 'El NDVI minimo', -1, 1);
  validarNumeroOpcional(mapa.ndviMaximo, 'El NDVI maximo', -1, 1);
  validarNumeroOpcional(mapa.ndviDesvio, 'El desvio NDVI', 0);
  validarNumeroOpcional(mapa.superficieAnalizadaHa, 'La superficie analizada', 0);

  if (mapa.ndviMinimo !== undefined && mapa.ndviMaximo !== undefined && mapa.ndviMinimo > mapa.ndviMaximo) {
    throw crearErrorValidacion('El NDVI minimo no puede ser mayor al maximo.');
  }

  return prisma.$transaction(async (tx) => {
    const existentes = await tx.$queryRaw<MapaNdviRow[]>`
      SELECT *
      FROM "LoteMapaNdvi"
      WHERE "id" = ${id}
        AND "clienteId" = ${usuario.clienteId}
      LIMIT 1
    `;
    const existente = existentes[0];

    if (existente) {
      await tx.$executeRaw`
        UPDATE "LoteMapaNdvi"
        SET
          "campaniaErpId" = ${mapa.campaniaErpId || null},
          "fechaImagen" = ${fechaImagen},
          "fechaProcesamiento" = ${fechaProcesamiento},
          "proveedor" = ${mapa.proveedor.trim()},
          "origen" = ${mapa.origen},
          "resolucionMetros" = ${mapa.resolucionMetros ?? null},
          "nubosidadPorcentaje" = ${mapa.nubosidadPorcentaje ?? null},
          "ndviPromedio" = ${mapa.ndviPromedio ?? null},
          "ndviMinimo" = ${mapa.ndviMinimo ?? null},
          "ndviMaximo" = ${mapa.ndviMaximo ?? null},
          "ndviDesvio" = ${mapa.ndviDesvio ?? null},
          "superficieAnalizadaHa" = ${mapa.superficieAnalizadaHa ?? null},
          "storageBucket" = ${mapa.storageBucket || null},
          "storagePathRaster" = ${mapa.storagePathRaster || null},
          "storagePathPreview" = ${mapa.storagePathPreview || null},
          "storagePathTiles" = ${mapa.storagePathTiles || null},
          "bboxGeoJson" = ${mapa.bboxGeoJson === undefined ? Prisma.JsonNull : mapa.bboxGeoJson as Prisma.InputJsonValue},
          "metadata" = ${mapa.metadata === undefined ? Prisma.JsonNull : mapa.metadata as Prisma.InputJsonValue},
          "estado" = ${mapa.estado},
          "activo" = ${mapa.activo ?? true},
          "updatedBy" = ${usuario.id || null},
          "updatedAt" = NOW()
        WHERE "id" = ${id}
          AND "clienteId" = ${usuario.clienteId}
      `;
    } else {
      await tx.$executeRaw`
        INSERT INTO "LoteMapaNdvi" (
          "id",
          "clienteId",
          "loteAppId",
          "loteErpId",
          "campoAppId",
          "campoErpId",
          "campaniaErpId",
          "fechaImagen",
          "fechaProcesamiento",
          "proveedor",
          "origen",
          "resolucionMetros",
          "nubosidadPorcentaje",
          "ndviPromedio",
          "ndviMinimo",
          "ndviMaximo",
          "ndviDesvio",
          "superficieAnalizadaHa",
          "storageBucket",
          "storagePathRaster",
          "storagePathPreview",
          "storagePathTiles",
          "bboxGeoJson",
          "metadata",
          "estado",
          "activo",
          "createdBy",
          "updatedBy"
        )
        VALUES (
          ${id},
          ${usuario.clienteId},
          ${loteAppId},
          ${lote.loteErpId},
          ${lote.campoAppId},
          ${lote.campoErpId},
          ${mapa.campaniaErpId || null},
          ${fechaImagen},
          ${fechaProcesamiento},
          ${mapa.proveedor.trim()},
          ${mapa.origen},
          ${mapa.resolucionMetros ?? null},
          ${mapa.nubosidadPorcentaje ?? null},
          ${mapa.ndviPromedio ?? null},
          ${mapa.ndviMinimo ?? null},
          ${mapa.ndviMaximo ?? null},
          ${mapa.ndviDesvio ?? null},
          ${mapa.superficieAnalizadaHa ?? null},
          ${mapa.storageBucket || null},
          ${mapa.storagePathRaster || null},
          ${mapa.storagePathPreview || null},
          ${mapa.storagePathTiles || null},
          ${mapa.bboxGeoJson === undefined ? Prisma.JsonNull : mapa.bboxGeoJson as Prisma.InputJsonValue},
          ${mapa.metadata === undefined ? Prisma.JsonNull : mapa.metadata as Prisma.InputJsonValue},
          ${mapa.estado},
          ${mapa.activo ?? true},
          ${usuario.id || null},
          ${usuario.id || null}
        )
      `;
    }

    const guardados = await tx.$queryRaw<MapaNdviRow[]>`
      SELECT *
      FROM "LoteMapaNdvi"
      WHERE "id" = ${id}
        AND "clienteId" = ${usuario.clienteId}
      LIMIT 1
    `;
    const guardado = mapearMapaNdvi(guardados[0]);

    await registrarAuditoria(tx, {
      clienteId: usuario.clienteId || '',
      usuario,
      entidad: 'LoteMapaNdvi',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearMapaNdvi(existente) : undefined,
      valoresDespues: guardado,
      metadata: { loteAppId, proveedor: guardado.proveedor } as Prisma.InputJsonValue,
    });

    return {
      mapa: guardado,
      auditado: true,
      mensaje: existente ? 'Mapa NDVI actualizado con auditoria.' : 'Mapa NDVI registrado con auditoria.',
    };
  });
}
