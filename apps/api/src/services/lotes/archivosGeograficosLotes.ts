import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type {
  ArchivosGeograficosLoteResponse,
  CrearUrlSubidaAdjuntoRequest,
  CrearUrlSubidaAdjuntoResponse,
  GuardarArchivoGeograficoLoteRequest,
  GuardarArchivoGeograficoLoteResponse,
  LoteArchivoGeografico,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type ArchivoGeograficoRow = {
  id: string;
  clienteId: string;
  loteAppId: string;
  nombreArchivo: string;
  tipo: string;
  mimeType: string;
  tamanioBytes: number;
  storageBucket: string;
  storagePath: string;
  estado: string;
  esPrincipal: boolean;
  geometriaGeoJson: unknown | null;
  superficieCalculadaHa: number | null;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function obtenerConfigStorage() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw crearErrorValidacion('Falta configurar Supabase Storage en backend.', 503);
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    serviceRoleKey,
    bucket: process.env.LOTE_GEOGRAFIA_BUCKET || 'lotes-geograficos',
    uploadExpiresSeconds: Number(process.env.LOTE_GEOGRAFIA_UPLOAD_EXPIRES_SECONDS || 600),
    maxBytes: Number(process.env.LOTE_GEOGRAFIA_MAX_BYTES || 25 * 1024 * 1024),
  };
}

function obtenerTipoArchivo(nombreArchivo: string, mimeType: string): 'kml' | 'kmz' {
  const extension = path.extname(nombreArchivo).toLowerCase();

  if (extension === '.kml' || mimeType === 'application/vnd.google-earth.kml+xml') {
    return 'kml';
  }

  if (extension === '.kmz' || mimeType === 'application/vnd.google-earth.kmz') {
    return 'kmz';
  }

  throw crearErrorValidacion('Solo se permiten archivos KML o KMZ.');
}

function validarArchivo(datos: CrearUrlSubidaAdjuntoRequest) {
  const { maxBytes } = obtenerConfigStorage();
  const mimeType = datos.mimeType.trim().toLowerCase();
  const nombreArchivo = limpiarTextoVisible(datos.nombreArchivo);
  const tipo = obtenerTipoArchivo(nombreArchivo, mimeType);
  const mimePermitidos = new Set([
    'application/vnd.google-earth.kml+xml',
    'application/vnd.google-earth.kmz',
    'application/xml',
    'text/xml',
    'application/zip',
    'application/octet-stream',
  ]);

  if (!nombreArchivo || nombreArchivo.length > 160 || nombreArchivo.includes('/') || nombreArchivo.includes('\\')) {
    throw crearErrorValidacion('El nombre del archivo geografico no es valido.');
  }

  if (!mimePermitidos.has(mimeType)) {
    throw crearErrorValidacion('El tipo de archivo geografico no esta permitido.');
  }

  if (!Number.isInteger(datos.tamanioBytes) || datos.tamanioBytes <= 0 || datos.tamanioBytes > maxBytes) {
    throw crearErrorValidacion(`El archivo geografico supera el limite permitido de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  if (datos.checksumSha256 && !/^[a-fA-F0-9]{64}$/.test(datos.checksumSha256)) {
    throw crearErrorValidacion('El checksum del archivo geografico no es valido.');
  }

  return { nombreArchivo, mimeType, tipo };
}

function encodeStoragePath(storagePath: string) {
  return storagePath.split('/').map(encodeURIComponent).join('/');
}

async function llamarSupabaseStorage<T>(pathStorageApi: string, body: unknown): Promise<T> {
  const { supabaseUrl, serviceRoleKey } = obtenerConfigStorage();
  const respuesta = await fetch(`${supabaseUrl}/storage/v1${pathStorageApi}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const contenido = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const detalle = typeof contenido === 'object' && contenido && 'message' in contenido
      ? String((contenido as { message?: string }).message)
      : 'Supabase Storage rechazo la solicitud.';

    throw crearErrorValidacion(detalle, respuesta.status);
  }

  return contenido as T;
}

function normalizarSignedUploadUrl(supabaseUrl: string, data: Record<string, unknown>) {
  const rawUrl = String(data.signedURL || data.signedUrl || data.url || '');

  if (!rawUrl) {
    throw crearErrorValidacion('Supabase Storage no devolvio URL firmada.', 502);
  }

  return rawUrl.startsWith('http') ? rawUrl : `${supabaseUrl}${rawUrl}`;
}

function mapearArchivo(row: ArchivoGeograficoRow): LoteArchivoGeografico {
  return {
    id: row.id,
    clienteId: row.clienteId,
    loteAppId: row.loteAppId,
    nombreArchivo: row.nombreArchivo,
    tipo: row.tipo as LoteArchivoGeografico['tipo'],
    mimeType: row.mimeType,
    tamanioBytes: Number(row.tamanioBytes),
    storageBucket: row.storageBucket,
    storagePath: row.storagePath,
    estado: row.estado as LoteArchivoGeografico['estado'],
    esPrincipal: row.esPrincipal,
    geometriaGeoJson: row.geometriaGeoJson || undefined,
    superficieCalculadaHa: row.superficieCalculadaHa ?? undefined,
    observaciones: row.observaciones || undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function validarLote(clienteId: string, loteAppId: string) {
  const lote = await prisma.loteApp.findFirst({
    where: { id: loteAppId, clienteId },
    select: { id: true },
  });

  if (!lote) {
    throw crearErrorValidacion('El lote no existe o no pertenece al cliente.', 404);
  }
}

export async function crearUrlSubidaArchivoGeograficoLote(
  loteAppId: string,
  request: CrearUrlSubidaAdjuntoRequest,
  usuario: UsuarioAuditoria,
): Promise<CrearUrlSubidaAdjuntoResponse> {
  const clienteId = usuario.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  await validarLote(clienteId, loteAppId);
  const archivo = validarArchivo(request);
  const { bucket, supabaseUrl, uploadExpiresSeconds } = obtenerConfigStorage();
  const storagePath = [
    clienteId,
    'lotes',
    loteAppId,
    `${randomUUID()}.${archivo.tipo}`,
  ].join('/');
  const data = await llamarSupabaseStorage<Record<string, unknown>>(
    `/object/upload/sign/${encodeURIComponent(bucket)}/${encodeStoragePath(storagePath)}`,
    { expiresIn: uploadExpiresSeconds },
  );

  return {
    storageBucket: bucket,
    storagePath,
    signedUploadUrl: normalizarSignedUploadUrl(supabaseUrl, data),
    token: typeof data.token === 'string' ? data.token : undefined,
    expiresAt: new Date(Date.now() + uploadExpiresSeconds * 1000).toISOString(),
  };
}

export async function obtenerArchivosGeograficosLote(
  loteAppId: string,
  clienteId: string,
): Promise<ArchivosGeograficosLoteResponse> {
  await validarLote(clienteId, loteAppId);
  const archivos = await prisma.$queryRaw<ArchivoGeograficoRow[]>`
    SELECT *
    FROM "LoteArchivoGeografico"
    WHERE "clienteId" = ${clienteId}
      AND "loteAppId" = ${loteAppId}
    ORDER BY "esPrincipal" DESC, "createdAt" DESC
  `;

  return { archivos: archivos.map(mapearArchivo) };
}

export async function guardarArchivoGeograficoLote(
  loteAppId: string,
  request: GuardarArchivoGeograficoLoteRequest,
  usuario: UsuarioAuditoria,
): Promise<GuardarArchivoGeograficoLoteResponse> {
  const clienteId = usuario.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  await validarLote(clienteId, loteAppId);
  const archivoValidado = validarArchivo({
    nombreArchivo: request.archivo.nombreArchivo,
    mimeType: request.archivo.mimeType,
    tamanioBytes: request.archivo.tamanioBytes,
  });
  const archivo = {
    ...request.archivo,
    clienteId,
    loteAppId,
    nombreArchivo: archivoValidado.nombreArchivo,
    tipo: archivoValidado.tipo,
    mimeType: archivoValidado.mimeType,
    estado: request.archivo.estado || 'pendiente_procesamiento',
  };

  return prisma.$transaction(async (tx) => {
    const existentePorId = await tx.$queryRaw<ArchivoGeograficoRow[]>`
      SELECT *
      FROM "LoteArchivoGeografico"
      WHERE "id" = ${archivo.id}
      LIMIT 1
    `;

    if (existentePorId[0] && existentePorId[0].clienteId !== clienteId) {
      throw crearErrorValidacion('El archivo geografico no pertenece al cliente.', 403);
    }

    const existente = existentePorId[0] ? [existentePorId[0]] : [];

    if (archivo.esPrincipal) {
      await tx.$executeRaw`
        UPDATE "LoteArchivoGeografico"
        SET "esPrincipal" = false
        WHERE "clienteId" = ${clienteId}
          AND "loteAppId" = ${loteAppId}
          AND "id" <> ${archivo.id}
      `;
    }

    await tx.$executeRaw`
      INSERT INTO "LoteArchivoGeografico" (
        "id",
        "clienteId",
        "loteAppId",
        "nombreArchivo",
        "tipo",
        "mimeType",
        "tamanioBytes",
        "storageBucket",
        "storagePath",
        "estado",
        "esPrincipal",
        "geometriaGeoJson",
        "superficieCalculadaHa",
        "observaciones",
        "createdBy",
        "updatedBy",
        "updatedAt"
      )
      VALUES (
        ${archivo.id},
        ${clienteId},
        ${loteAppId},
        ${archivo.nombreArchivo},
        ${archivo.tipo},
        ${archivo.mimeType},
        ${archivo.tamanioBytes},
        ${archivo.storageBucket},
        ${archivo.storagePath},
        ${archivo.estado},
        ${archivo.esPrincipal},
        ${archivo.geometriaGeoJson === undefined ? Prisma.DbNull : archivo.geometriaGeoJson as Prisma.InputJsonValue},
        ${archivo.superficieCalculadaHa ?? null},
        ${archivo.observaciones ?? null},
        ${usuario.id ?? null},
        ${usuario.id ?? null},
        NOW()
      )
      ON CONFLICT ("id")
      DO UPDATE SET
        "nombreArchivo" = EXCLUDED."nombreArchivo",
        "tipo" = EXCLUDED."tipo",
        "mimeType" = EXCLUDED."mimeType",
        "tamanioBytes" = EXCLUDED."tamanioBytes",
        "storageBucket" = EXCLUDED."storageBucket",
        "storagePath" = EXCLUDED."storagePath",
        "estado" = EXCLUDED."estado",
        "esPrincipal" = EXCLUDED."esPrincipal",
        "geometriaGeoJson" = EXCLUDED."geometriaGeoJson",
        "superficieCalculadaHa" = EXCLUDED."superficieCalculadaHa",
        "observaciones" = EXCLUDED."observaciones",
        "updatedBy" = EXCLUDED."updatedBy",
        "updatedAt" = NOW()
    `;
    const guardado = await tx.$queryRaw<ArchivoGeograficoRow[]>`
      SELECT *
      FROM "LoteArchivoGeografico"
      WHERE "id" = ${archivo.id}
        AND "clienteId" = ${clienteId}
      LIMIT 1
    `;
    const archivoMapeado = mapearArchivo(guardado[0]);

    await registrarAuditoria(tx, {
      clienteId,
      usuario,
      entidad: 'LoteArchivoGeografico',
      entidadId: archivo.id,
      accion: existente[0] ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente[0] ? mapearArchivo(existente[0]) : undefined,
      valoresDespues: archivoMapeado,
    });

    return {
      archivo: archivoMapeado,
      auditado: true,
      mensaje: existente[0] ? 'Archivo geografico actualizado con auditoria.' : 'Archivo geografico vinculado al lote con auditoria.',
    };
  });
}
