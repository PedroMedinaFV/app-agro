import { randomUUID } from 'node:crypto';
import path from 'node:path';
import zlib from 'node:zlib';
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

type GeoJsonGeometry =
  | { type: 'Point'; coordinates: [number, number] | [number, number, number] }
  | { type: 'LineString'; coordinates: Array<[number, number] | [number, number, number]> }
  | { type: 'Polygon'; coordinates: Array<Array<[number, number] | [number, number, number]>> };

type GeoJsonFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: GeoJsonGeometry;
};

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
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

async function descargarSupabaseStorage(bucket: string, storagePath: string) {
  const { supabaseUrl, serviceRoleKey } = obtenerConfigStorage();
  const respuesta = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(storagePath)}`, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => 'No se pudo descargar el archivo geografico.');
    throw crearErrorValidacion(detalle || 'No se pudo descargar el archivo geografico.', respuesta.status);
  }

  return Buffer.from(await respuesta.arrayBuffer());
}

function normalizarSignedUploadUrl(supabaseUrl: string, data: Record<string, unknown>) {
  const rawUrl = String(data.signedURL || data.signedUrl || data.url || '');

  if (!rawUrl) {
    throw crearErrorValidacion('Supabase Storage no devolvio URL firmada.', 502);
  }

  return rawUrl.startsWith('http') ? rawUrl : `${supabaseUrl}${rawUrl}`;
}

function limpiarXml(valor: string) {
  return valor.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function leerCoordenadasKml(contenido: string) {
  return limpiarXml(contenido)
    .trim()
    .split(/\s+/)
    .map((punto) => {
      const [lonRaw, latRaw, altRaw] = punto.split(',');
      const lon = Number(lonRaw);
      const lat = Number(latRaw);
      const alt = altRaw === undefined || altRaw === '' ? undefined : Number(altRaw);

      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        return undefined;
      }

      return Number.isFinite(alt) ? [lon, lat, alt] as [number, number, number] : [lon, lat] as [number, number];
    })
    .filter((coordenada): coordenada is [number, number] | [number, number, number] => Boolean(coordenada));
}

function cerrarAnillo(coordenadas: Array<[number, number] | [number, number, number]>) {
  if (coordenadas.length < 3) {
    return coordenadas;
  }

  const primera = coordenadas[0];
  const ultima = coordenadas[coordenadas.length - 1];

  if (primera[0] === ultima[0] && primera[1] === ultima[1]) {
    return coordenadas;
  }

  return [...coordenadas, primera];
}

function extraerBloques(kml: string, etiqueta: string) {
  const bloques: string[] = [];
  const regex = new RegExp(`<${etiqueta}\\b[^>]*>([\\s\\S]*?)<\\/${etiqueta}>`, 'gi');
  let match = regex.exec(kml);

  while (match) {
    bloques.push(match[1]);
    match = regex.exec(kml);
  }

  return bloques;
}

function extraerPrimerTexto(bloque: string, etiqueta: string) {
  const match = new RegExp(`<${etiqueta}\\b[^>]*>([\\s\\S]*?)<\\/${etiqueta}>`, 'i').exec(bloque);

  return match ? limpiarXml(match[1]).trim() : undefined;
}

function parsearKmlAGeoJson(kml: string): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [];
  const placemarks = extraerBloques(kml, 'Placemark');
  const contenedores = placemarks.length ? placemarks : [kml];

  for (const bloque of contenedores) {
    const nombre = extraerPrimerTexto(bloque, 'name');

    for (const polygon of extraerBloques(bloque, 'Polygon')) {
      const anillos: Array<Array<[number, number] | [number, number, number]>> = [];

      for (const boundary of extraerBloques(polygon, 'outerBoundaryIs')) {
        const coordenadas = extraerPrimerTexto(boundary, 'coordinates');
        const puntos = coordenadas ? cerrarAnillo(leerCoordenadasKml(coordenadas)) : [];

        if (puntos.length >= 4) {
          anillos.push(puntos);
        }
      }

      for (const boundary of extraerBloques(polygon, 'innerBoundaryIs')) {
        const coordenadas = extraerPrimerTexto(boundary, 'coordinates');
        const puntos = coordenadas ? cerrarAnillo(leerCoordenadasKml(coordenadas)) : [];

        if (puntos.length >= 4) {
          anillos.push(puntos);
        }
      }

      if (anillos.length) {
        features.push({
          type: 'Feature',
          properties: nombre ? { nombre } : {},
          geometry: { type: 'Polygon', coordinates: anillos },
        });
      }
    }

    for (const lineString of extraerBloques(bloque, 'LineString')) {
      const coordenadas = extraerPrimerTexto(lineString, 'coordinates');
      const puntos = coordenadas ? leerCoordenadasKml(coordenadas) : [];

      if (puntos.length >= 2) {
        features.push({
          type: 'Feature',
          properties: nombre ? { nombre } : {},
          geometry: { type: 'LineString', coordinates: puntos },
        });
      }
    }

    for (const point of extraerBloques(bloque, 'Point')) {
      const coordenadas = extraerPrimerTexto(point, 'coordinates');
      const puntos = coordenadas ? leerCoordenadasKml(coordenadas) : [];

      if (puntos[0]) {
        features.push({
          type: 'Feature',
          properties: nombre ? { nombre } : {},
          geometry: { type: 'Point', coordinates: puntos[0] },
        });
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

function extraerKmlDesdeKmz(buffer: Buffer) {
  const firmaEocd = 0x06054b50;
  const firmaCentral = 0x02014b50;
  const firmaLocal = 0x04034b50;
  const inicioBusqueda = Math.max(0, buffer.length - 65557);
  let eocdOffset = -1;

  for (let indice = buffer.length - 22; indice >= inicioBusqueda; indice -= 1) {
    if (buffer.readUInt32LE(indice) === firmaEocd) {
      eocdOffset = indice;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw crearErrorValidacion('El archivo KMZ no tiene una estructura ZIP valida.');
  }

  const totalEntradas = buffer.readUInt16LE(eocdOffset + 10);
  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  let cursor = centralOffset;

  for (let entrada = 0; entrada < totalEntradas; entrada += 1) {
    if (buffer.readUInt32LE(cursor) !== firmaCentral) {
      throw crearErrorValidacion('No se pudo leer el indice del archivo KMZ.');
    }

    const metodoCompresion = buffer.readUInt16LE(cursor + 10);
    const tamanioComprimido = buffer.readUInt32LE(cursor + 20);
    const largoNombre = buffer.readUInt16LE(cursor + 28);
    const largoExtra = buffer.readUInt16LE(cursor + 30);
    const largoComentario = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const nombre = buffer.subarray(cursor + 46, cursor + 46 + largoNombre).toString('utf8');

    cursor += 46 + largoNombre + largoExtra + largoComentario;

    if (!nombre.toLowerCase().endsWith('.kml')) {
      continue;
    }

    if (buffer.readUInt32LE(localOffset) !== firmaLocal) {
      throw crearErrorValidacion('No se pudo leer el KML interno del KMZ.');
    }

    const localNombre = buffer.readUInt16LE(localOffset + 26);
    const localExtra = buffer.readUInt16LE(localOffset + 28);
    const inicioDatos = localOffset + 30 + localNombre + localExtra;
    const datos = buffer.subarray(inicioDatos, inicioDatos + tamanioComprimido);

    if (metodoCompresion === 0) {
      return datos.toString('utf8');
    }

    if (metodoCompresion === 8) {
      return zlib.inflateRawSync(datos).toString('utf8');
    }

    throw crearErrorValidacion('El KML interno del KMZ usa una compresion no soportada.');
  }

  throw crearErrorValidacion('El archivo KMZ no contiene un KML.');
}

function calcularAreaAnilloHa(coordenadas: Array<[number, number] | [number, number, number]>) {
  if (coordenadas.length < 4) {
    return 0;
  }

  const radioTierra = 6378137;
  const latitudMedia = coordenadas.reduce((total, punto) => total + punto[1], 0) / coordenadas.length;
  const factorLatitud = Math.cos((latitudMedia * Math.PI) / 180);
  const puntosMetros = coordenadas.map((punto) => ({
    x: radioTierra * (punto[0] * Math.PI / 180) * factorLatitud,
    y: radioTierra * (punto[1] * Math.PI / 180),
  }));
  let area = 0;

  for (let indice = 0; indice < puntosMetros.length - 1; indice += 1) {
    area += puntosMetros[indice].x * puntosMetros[indice + 1].y - puntosMetros[indice + 1].x * puntosMetros[indice].y;
  }

  return Math.abs(area / 2) / 10000;
}

function calcularSuperficieGeoJsonHa(geoJson: GeoJsonFeatureCollection) {
  return geoJson.features.reduce((total, feature) => {
    if (feature.geometry.type !== 'Polygon') {
      return total;
    }

    const [exterior, ...interiores] = feature.geometry.coordinates;
    const areaExterior = calcularAreaAnilloHa(exterior);
    const areaInterior = interiores.reduce((subtotal, anillo) => subtotal + calcularAreaAnilloHa(anillo), 0);

    return total + Math.max(0, areaExterior - areaInterior);
  }, 0);
}

async function procesarArchivoGeografico(archivo: Pick<LoteArchivoGeografico, 'tipo' | 'storageBucket' | 'storagePath'>) {
  const buffer = await descargarSupabaseStorage(archivo.storageBucket, archivo.storagePath);
  const kml = archivo.tipo === 'kmz' ? extraerKmlDesdeKmz(buffer) : buffer.toString('utf8');
  const geoJson = parsearKmlAGeoJson(kml);

  if (!geoJson.features.length) {
    throw crearErrorValidacion('No se encontraron geometrias validas en el archivo.');
  }

  return {
    geoJson,
    superficieCalculadaHa: calcularSuperficieGeoJsonHa(geoJson),
  };
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
  let archivoParaGuardar = archivo;

  if (!archivo.geometriaGeoJson) {
    try {
      const procesamiento = await procesarArchivoGeografico(archivo);

      archivoParaGuardar = {
        ...archivo,
        estado: 'procesado',
        geometriaGeoJson: procesamiento.geoJson,
        superficieCalculadaHa: Number(procesamiento.superficieCalculadaHa.toFixed(2)),
        observaciones: archivo.observaciones || 'Archivo geografico procesado automaticamente.',
      };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo procesar el archivo geografico.';

      archivoParaGuardar = {
        ...archivo,
        estado: 'rechazado',
        geometriaGeoJson: undefined,
        superficieCalculadaHa: undefined,
        observaciones: mensaje,
      };
    }
  }

  return prisma.$transaction(async (tx) => {
    const existentePorId = await tx.$queryRaw<ArchivoGeograficoRow[]>`
      SELECT *
      FROM "LoteArchivoGeografico"
      WHERE "id" = ${archivoParaGuardar.id}
      LIMIT 1
    `;

    if (existentePorId[0] && existentePorId[0].clienteId !== clienteId) {
      throw crearErrorValidacion('El archivo geografico no pertenece al cliente.', 403);
    }

    const existente = existentePorId[0] ? [existentePorId[0]] : [];
    const geometriaGeoJson = archivoParaGuardar.geometriaGeoJson === undefined
      ? null
      : archivoParaGuardar.geometriaGeoJson as Prisma.InputJsonValue;

    if (archivo.esPrincipal) {
      await tx.$executeRaw`
        UPDATE "LoteArchivoGeografico"
        SET "esPrincipal" = false
        WHERE "clienteId" = ${clienteId}
          AND "loteAppId" = ${loteAppId}
          AND "id" <> ${archivoParaGuardar.id}
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
        ${archivoParaGuardar.id},
        ${clienteId},
        ${loteAppId},
        ${archivoParaGuardar.nombreArchivo},
        ${archivoParaGuardar.tipo},
        ${archivoParaGuardar.mimeType},
        ${archivoParaGuardar.tamanioBytes},
        ${archivoParaGuardar.storageBucket},
        ${archivoParaGuardar.storagePath},
        ${archivoParaGuardar.estado},
        ${archivoParaGuardar.esPrincipal},
        ${geometriaGeoJson},
        ${archivoParaGuardar.superficieCalculadaHa ?? null},
        ${archivoParaGuardar.observaciones ?? null},
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
      WHERE "id" = ${archivoParaGuardar.id}
        AND "clienteId" = ${clienteId}
      LIMIT 1
    `;
    const archivoMapeado = mapearArchivo(guardado[0]);

    await registrarAuditoria(tx, {
      clienteId,
      usuario,
      entidad: 'LoteArchivoGeografico',
      entidadId: archivoParaGuardar.id,
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
