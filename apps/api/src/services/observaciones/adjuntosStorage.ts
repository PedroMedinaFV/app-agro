import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type {
  CrearUrlLecturaAdjuntoResponse,
  CrearUrlSubidaAdjuntoRequest,
  CrearUrlSubidaAdjuntoResponse,
} from '@agro/tipos';
import { prisma } from '../../prisma';
import { obtenerCamposAsignados } from '../usuarios/asignacionCampos';

type UsuarioOperacion = {
  id?: string;
  email?: string;
  rol?: string;
  clienteId?: string;
};

type AdjuntoLecturaRow = {
  id: string;
  clienteId: string;
  storageBucket: string;
  storagePath: string;
  campoErpId: string | null;
};

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
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
    bucket: process.env.OBSERVACION_ADJUNTO_BUCKET || 'observaciones',
    uploadExpiresSeconds: Number(process.env.OBSERVACION_ADJUNTO_UPLOAD_EXPIRES_SECONDS || 600),
    readExpiresSeconds: Number(process.env.OBSERVACION_ADJUNTO_READ_EXPIRES_SECONDS || 300),
    maxBytes: Number(process.env.OBSERVACION_ADJUNTO_MAX_BYTES || 10 * 1024 * 1024),
  };
}

function validarArchivo(datos: CrearUrlSubidaAdjuntoRequest) {
  const { maxBytes } = obtenerConfigStorage();
  const mimeType = datos.mimeType.trim().toLowerCase();
  const nombreArchivo = datos.nombreArchivo.trim().replace(/\s+/g, ' ');
  const mimePermitidos = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

  if (!nombreArchivo || nombreArchivo.length > 160 || nombreArchivo.includes('/') || nombreArchivo.includes('\\')) {
    throw crearErrorValidacion('El nombre del archivo no es valido.');
  }

  if (!mimePermitidos.has(mimeType)) {
    throw crearErrorValidacion('El tipo de archivo no esta permitido.');
  }

  if (!Number.isInteger(datos.tamanioBytes) || datos.tamanioBytes <= 0 || datos.tamanioBytes > maxBytes) {
    throw crearErrorValidacion(`El archivo supera el limite permitido de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  if (datos.checksumSha256 && !/^[a-fA-F0-9]{64}$/.test(datos.checksumSha256)) {
    throw crearErrorValidacion('El checksum del archivo no es valido.');
  }

  return { nombreArchivo, mimeType };
}

function obtenerExtensionSegura(nombreArchivo: string, mimeType: string) {
  const extensionOriginal = path.extname(nombreArchivo).toLowerCase().replace('.', '');
  const extensionPorMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };

  return extensionPorMime[mimeType] || extensionOriginal || 'bin';
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

export async function crearUrlSubidaAdjuntoObservacion(
  request: CrearUrlSubidaAdjuntoRequest,
  usuario: UsuarioOperacion,
): Promise<CrearUrlSubidaAdjuntoResponse> {
  const clienteId = usuario.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const { bucket, supabaseUrl, uploadExpiresSeconds } = obtenerConfigStorage();
  const archivo = validarArchivo(request);
  const ahora = new Date();
  const extension = obtenerExtensionSegura(archivo.nombreArchivo, archivo.mimeType);
  const storagePath = [
    clienteId,
    'observaciones',
    String(ahora.getUTCFullYear()),
    String(ahora.getUTCMonth() + 1).padStart(2, '0'),
    `${randomUUID()}.${extension}`,
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

export async function crearUrlLecturaAdjuntoObservacion(
  adjuntoId: string,
  usuario: UsuarioOperacion,
): Promise<CrearUrlLecturaAdjuntoResponse> {
  const clienteId = usuario.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const adjuntos = await prisma.$queryRaw<AdjuntoLecturaRow[]>`
    SELECT
      adj."id",
      adj."clienteId",
      adj."storageBucket",
      adj."storagePath",
      obs."campoErpId"
    FROM "ObservacionAdjunto" adj
    INNER JOIN "ObservacionCampo" obs ON obs."id" = adj."observacionId"
    WHERE adj."id" = ${adjuntoId}
      AND adj."clienteId" = ${clienteId}
    LIMIT 1
  `;
  const adjunto = adjuntos[0];

  if (!adjunto) {
    throw crearErrorValidacion('Adjunto no encontrado.', 404);
  }

  if (usuario.rol !== 'admin') {
    const camposAsignados = await obtenerCamposAsignados({
      sub: usuario.id || '',
      rol: usuario.rol,
      clienteId,
    });

    if (camposAsignados && (!adjunto.campoErpId || !camposAsignados.includes(adjunto.campoErpId))) {
      throw crearErrorValidacion('No tienes permisos para ver este adjunto.', 403);
    }
  }

  const { readExpiresSeconds, supabaseUrl } = obtenerConfigStorage();
  const data = await llamarSupabaseStorage<Record<string, unknown>>(
    `/object/sign/${encodeURIComponent(adjunto.storageBucket)}/${encodeStoragePath(adjunto.storagePath)}`,
    { expiresIn: readExpiresSeconds },
  );
  const rawSignedUrl = String(data.signedURL || data.signedUrl || '');

  if (!rawSignedUrl) {
    throw crearErrorValidacion('Supabase Storage no devolvio URL de lectura.', 502);
  }

  return {
    signedUrl: rawSignedUrl.startsWith('http') ? rawSignedUrl : `${supabaseUrl}${rawSignedUrl}`,
    expiresAt: new Date(Date.now() + readExpiresSeconds * 1000).toISOString(),
  };
}
