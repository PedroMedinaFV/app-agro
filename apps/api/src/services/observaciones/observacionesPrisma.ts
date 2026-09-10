import { randomUUID } from 'node:crypto';
import type {
  AdjuntoObservacion,
  CrearAdjuntoObservacionInput,
  CrearObservacionRequest,
  CrearObservacionResponse,
  EstadoAdjuntoObservacion,
  ObservacionCampo,
  ObservacionesResponse,
  OrigenObservacion,
  SeveridadObservacion,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import { obtenerCamposAsignados } from '../usuarios/asignacionCampos';

type UsuarioOperacion = UsuarioAuditoria & {
  rol?: string;
};

type ObservacionRow = {
  id: string;
  clienteId: string;
  usuarioId: string | null;
  campoAppId: string;
  campoErpId: string | null;
  loteAppId: string | null;
  loteErpId: string | null;
  registroMovilId: string | null;
  titulo: string;
  descripcion: string;
  severidad: string;
  latitud: number | null;
  longitud: number | null;
  fechaEvento: Date;
  origen: string;
  createdAt: Date;
  updatedAt: Date;
};

type ObservacionAdjuntoRow = {
  id: string;
  clienteId: string;
  observacionId: string;
  storageBucket: string;
  storagePath: string;
  nombreArchivo: string;
  mimeType: string;
  tamanioBytes: number;
  checksumSha256: string | null;
  estado: string;
  createdAt: Date;
  updatedAt: Date;
};

type CampoRow = {
  id: string;
  clienteId: string;
  campoErpId: string | null;
};

type LoteRow = {
  id: string;
  clienteId: string;
  campoAppId: string;
  loteErpId: string | null;
};

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function obtenerConfiguracionAdjuntos() {
  return {
    bucketDefault: process.env.OBSERVACION_ADJUNTO_BUCKET || 'observaciones',
    maxCantidad: Number(process.env.OBSERVACION_ADJUNTO_MAX_CANTIDAD || 5),
    maxBytes: Number(process.env.OBSERVACION_ADJUNTO_MAX_BYTES || 10 * 1024 * 1024),
  };
}

function mapearAdjunto(row: ObservacionAdjuntoRow): AdjuntoObservacion {
  return {
    id: row.id,
    observacionId: row.observacionId,
    storageBucket: row.storageBucket,
    storagePath: row.storagePath,
    nombreArchivo: row.nombreArchivo,
    mimeType: row.mimeType,
    tamanioBytes: row.tamanioBytes,
    checksumSha256: row.checksumSha256 || undefined,
    estado: row.estado as EstadoAdjuntoObservacion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapearObservacion(row: ObservacionRow, adjuntos: AdjuntoObservacion[] = []): ObservacionCampo {
  return {
    id: row.id,
    clienteId: row.clienteId,
    usuarioId: row.usuarioId || undefined,
    campoAppId: row.campoAppId,
    campoErpId: row.campoErpId || undefined,
    loteAppId: row.loteAppId || undefined,
    loteErpId: row.loteErpId || undefined,
    registroMovilId: row.registroMovilId || undefined,
    titulo: row.titulo,
    descripcion: row.descripcion,
    severidad: row.severidad as SeveridadObservacion,
    latitud: row.latitud ?? undefined,
    longitud: row.longitud ?? undefined,
    fechaEvento: row.fechaEvento.toISOString(),
    origen: row.origen as OrigenObservacion,
    adjuntos,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function validarAlcanceCampo(usuario: UsuarioOperacion, campo: CampoRow) {
  if (usuario.rol === 'admin') {
    return;
  }

  const camposAsignados = await obtenerCamposAsignados({
    sub: usuario.id || '',
    rol: usuario.rol,
    clienteId: usuario.clienteId,
  });

  if (!camposAsignados) {
    return;
  }

  if (!campo.campoErpId || !camposAsignados.includes(campo.campoErpId)) {
    throw crearErrorValidacion('No tienes permisos para cargar observaciones en este campo.', 403);
  }
}

function validarCoordenada(valor: number | undefined, minimo: number, maximo: number, nombre: string) {
  if (valor === undefined) {
    return;
  }

  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) {
    throw crearErrorValidacion(`${nombre} no es valida.`);
  }
}

function validarAdjuntos(request: CrearAdjuntoObservacionInput[] | undefined) {
  const { bucketDefault, maxCantidad, maxBytes } = obtenerConfiguracionAdjuntos();
  const mimePermitidos = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
  const adjuntos = request || [];

  if (adjuntos.length > maxCantidad) {
    throw crearErrorValidacion(`Una observacion puede tener hasta ${maxCantidad} adjunto(s).`);
  }

  return adjuntos.map((adjunto) => {
    const storageBucket = limpiarTextoVisible(adjunto.storageBucket || bucketDefault);
    const storagePath = adjunto.storagePath.trim();
    const nombreArchivo = limpiarTextoVisible(adjunto.nombreArchivo);
    const mimeType = adjunto.mimeType.trim().toLowerCase();
    const estado = adjunto.estado || 'disponible';

    if (!storageBucket || storageBucket.includes('/') || storageBucket.includes('\\')) {
      throw crearErrorValidacion('El bucket del adjunto no es valido.');
    }

    if (
      !storagePath ||
      storagePath.startsWith('/') ||
      storagePath.includes('..') ||
      storagePath.includes('\\') ||
      !/^[a-zA-Z0-9/_\-.]+$/.test(storagePath)
    ) {
      throw crearErrorValidacion('La ruta de storage del adjunto no es valida.');
    }

    if (!nombreArchivo || nombreArchivo.length > 160) {
      throw crearErrorValidacion('El nombre del adjunto no es valido.');
    }

    if (!mimePermitidos.has(mimeType)) {
      throw crearErrorValidacion('El tipo de archivo del adjunto no esta permitido.');
    }

    if (!Number.isInteger(adjunto.tamanioBytes) || adjunto.tamanioBytes <= 0 || adjunto.tamanioBytes > maxBytes) {
      throw crearErrorValidacion(`El adjunto supera el limite permitido de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    }

    if (adjunto.checksumSha256 && !/^[a-fA-F0-9]{64}$/.test(adjunto.checksumSha256)) {
      throw crearErrorValidacion('El checksum del adjunto no es valido.');
    }

    if (!['pendiente_subida', 'disponible', 'rechazado'].includes(estado)) {
      throw crearErrorValidacion('El estado del adjunto no es valido.');
    }

    return {
      storageBucket,
      storagePath,
      nombreArchivo,
      mimeType,
      tamanioBytes: adjunto.tamanioBytes,
      checksumSha256: adjunto.checksumSha256 || null,
      estado,
    };
  });
}

async function validarRequestObservacion(clienteId: string, request: CrearObservacionRequest, usuario: UsuarioOperacion) {
  if (!['web', 'mobile', 'api'].includes(request.origen)) {
    throw crearErrorValidacion('El origen de la observacion no es valido.');
  }

  if (!request.campoAppId) {
    throw crearErrorValidacion('La observacion debe tener campo.');
  }

  if (!request.titulo.trim()) {
    throw crearErrorValidacion('La observacion debe tener titulo.');
  }

  if (!request.descripcion.trim()) {
    throw crearErrorValidacion('La observacion debe tener descripcion.');
  }

  if (request.severidad && !['baja', 'media', 'alta'].includes(request.severidad)) {
    throw crearErrorValidacion('La severidad de la observacion no es valida.');
  }

  validarCoordenada(request.latitud, -90, 90, 'La latitud');
  validarCoordenada(request.longitud, -180, 180, 'La longitud');

  if ((request.latitud === undefined) !== (request.longitud === undefined)) {
    throw crearErrorValidacion('Latitud y longitud deben informarse juntas.');
  }

  const fechaEvento = new Date(request.fechaEvento);
  if (Number.isNaN(fechaEvento.getTime())) {
    throw crearErrorValidacion('La fecha del evento no es valida.');
  }

  const campo = await prisma.$queryRaw<CampoRow[]>`
    SELECT "id", "clienteId", "campoErpId"
    FROM "CampoApp"
    WHERE "id" = ${request.campoAppId}
    LIMIT 1
  `;

  if (!campo[0] || campo[0].clienteId !== clienteId) {
    throw crearErrorValidacion('El campo seleccionado no pertenece al cliente.', 403);
  }

  await validarAlcanceCampo(usuario, campo[0]);

  const lote = request.loteAppId
    ? await prisma.$queryRaw<LoteRow[]>`
      SELECT "id", "clienteId", "campoAppId", "loteErpId"
      FROM "LoteApp"
      WHERE "id" = ${request.loteAppId}
      LIMIT 1
    `
    : [];

  if (request.loteAppId && (!lote[0] || lote[0].clienteId !== clienteId || lote[0].campoAppId !== request.campoAppId)) {
    throw crearErrorValidacion('El lote seleccionado no pertenece al campo indicado.', 403);
  }

  return {
    campo: campo[0],
    lote: lote[0],
    fechaEvento,
    adjuntos: validarAdjuntos(request.adjuntos),
  };
}

export async function obtenerObservacionesPersistidas(
  clienteId: string,
  usuario: UsuarioOperacion,
): Promise<ObservacionesResponse> {
  const camposAsignados = await obtenerCamposAsignados({
    sub: usuario.id || '',
    rol: usuario.rol,
    clienteId,
  });
  const filtroCampos = camposAsignados
    ? camposAsignados.length > 0
      ? Prisma.sql`AND "campoErpId" IN (${Prisma.join(camposAsignados)})`
      : Prisma.sql`AND 1 = 0`
    : Prisma.empty;
  const registros = await prisma.$queryRaw<ObservacionRow[]>`
    SELECT *
    FROM "ObservacionCampo"
    WHERE "clienteId" = ${clienteId}
    ${filtroCampos}
    ORDER BY "fechaEvento" DESC, "createdAt" DESC
    LIMIT 500
  `;

  const ids = registros.map((registro) => registro.id);
  const adjuntos = ids.length
    ? await prisma.$queryRaw<ObservacionAdjuntoRow[]>`
      SELECT *
      FROM "ObservacionAdjunto"
      WHERE "observacionId" IN (${Prisma.join(ids)})
      ORDER BY "createdAt" ASC
    `
    : [];
  const adjuntosPorObservacion = new Map<string, AdjuntoObservacion[]>();

  for (const adjunto of adjuntos) {
    const existentes = adjuntosPorObservacion.get(adjunto.observacionId) || [];
    existentes.push(mapearAdjunto(adjunto));
    adjuntosPorObservacion.set(adjunto.observacionId, existentes);
  }

  return {
    observaciones: registros.map((registro) => mapearObservacion(registro, adjuntosPorObservacion.get(registro.id) || [])),
  };
}

export async function crearObservacionPersistida(
  request: CrearObservacionRequest,
  usuario: UsuarioOperacion,
): Promise<CrearObservacionResponse> {
  const clienteId = usuario.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const validacion = await validarRequestObservacion(clienteId, request, usuario);
  const id = randomUUID();
  const titulo = limpiarTextoVisible(request.titulo);
  const descripcion = limpiarTextoVisible(request.descripcion);
  const severidad = request.severidad || 'media';

  return prisma.$transaction(async (tx) => {
    if (request.registroMovilId) {
      const existenteMovil = await tx.$queryRaw<ObservacionRow[]>`
        SELECT *
        FROM "ObservacionCampo"
        WHERE "clienteId" = ${clienteId}
          AND "registroMovilId" = ${request.registroMovilId}
        LIMIT 1
      `;

      if (existenteMovil[0]) {
        const adjuntosExistentes = await tx.$queryRaw<ObservacionAdjuntoRow[]>`
          SELECT *
          FROM "ObservacionAdjunto"
          WHERE "observacionId" = ${existenteMovil[0].id}
          ORDER BY "createdAt" ASC
        `;

        return {
          observacion: mapearObservacion(existenteMovil[0], adjuntosExistentes.map(mapearAdjunto)),
          auditado: true,
          mensaje: 'Observacion ya sincronizada previamente.',
        };
      }
    }

    const usuarioExistente = usuario.id
      ? await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "Usuario"
        WHERE "id" = ${usuario.id}
        LIMIT 1
      `
      : [];
    const usuarioId = usuarioExistente[0]?.id || null;
    const creado = await tx.$queryRaw<ObservacionRow[]>`
      INSERT INTO "ObservacionCampo" (
        "id",
        "clienteId",
        "usuarioId",
        "campoAppId",
        "campoErpId",
        "loteAppId",
        "loteErpId",
        "registroMovilId",
        "titulo",
        "descripcion",
        "severidad",
        "latitud",
        "longitud",
        "fechaEvento",
        "origen",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${clienteId},
        ${usuarioId},
        ${request.campoAppId},
        ${validacion.campo.campoErpId},
        ${request.loteAppId || null},
        ${validacion.lote?.loteErpId || null},
        ${request.registroMovilId || null},
        ${titulo},
        ${descripcion},
        ${severidad},
        ${request.latitud ?? null},
        ${request.longitud ?? null},
        ${validacion.fechaEvento},
        ${request.origen},
        NOW()
      )
      RETURNING *
    `;
    const adjuntosCreados = validacion.adjuntos.length
      ? await tx.$queryRaw<ObservacionAdjuntoRow[]>`
        INSERT INTO "ObservacionAdjunto" (
          "id",
          "clienteId",
          "observacionId",
          "storageBucket",
          "storagePath",
          "nombreArchivo",
          "mimeType",
          "tamanioBytes",
          "checksumSha256",
          "estado",
          "updatedAt"
        )
        VALUES ${Prisma.join(validacion.adjuntos.map((adjunto) => Prisma.sql`(
          ${randomUUID()},
          ${clienteId},
          ${id},
          ${adjunto.storageBucket},
          ${adjunto.storagePath},
          ${adjunto.nombreArchivo},
          ${adjunto.mimeType},
          ${adjunto.tamanioBytes},
          ${adjunto.checksumSha256},
          ${adjunto.estado},
          NOW()
        )`))}
        RETURNING *
      `
      : [];
    const observacion = mapearObservacion(creado[0], adjuntosCreados.map(mapearAdjunto));

    await registrarAuditoria(tx, {
      clienteId,
      usuario,
      entidad: 'ObservacionCampo',
      entidadId: id,
      accion: 'crear',
      origen: request.origen,
      motivo: 'Carga de observacion operativa.',
      valoresDespues: observacion,
    });

    return {
      observacion,
      auditado: true,
      mensaje: 'Observacion registrada con auditoria.',
    };
  });
}
