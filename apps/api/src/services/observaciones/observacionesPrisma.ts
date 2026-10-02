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
import {
  crearErrorValidacion,
  limpiarTextoVisible,
  validarAdjuntosObservacion,
  validarDatosBasicosObservacion,
} from './validacionesObservaciones';

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
  recorridaId: string | null;
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

type RecorridaRow = {
  id: string;
  clienteId: string;
  campoAppId: string;
  loteAppId: string | null;
  estado: string;
};

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
    recorridaId: row.recorridaId || undefined,
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

async function validarRequestObservacion(clienteId: string, request: CrearObservacionRequest, usuario: UsuarioOperacion) {
  const datosBasicos = validarDatosBasicosObservacion(request);

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

  const recorrida = request.recorridaId
    ? await prisma.$queryRaw<RecorridaRow[]>`
      SELECT "id", "clienteId", "campoAppId", "loteAppId", "estado"
      FROM "RecorridaCampo"
      WHERE "id" = ${request.recorridaId}
      LIMIT 1
    `
    : [];

  if (request.recorridaId && (
    !recorrida[0]
    || recorrida[0].clienteId !== clienteId
    || recorrida[0].campoAppId !== request.campoAppId
    || (recorrida[0].loteAppId && recorrida[0].loteAppId !== request.loteAppId)
  )) {
    throw crearErrorValidacion('La recorrida seleccionada no pertenece al campo o lote indicado.', 403);
  }

  if (recorrida[0] && (recorrida[0].estado === 'cerrada' || recorrida[0].estado === 'cancelada')) {
    throw crearErrorValidacion('No se pueden agregar observaciones a una recorrida cerrada o cancelada.');
  }

  return {
    campo: campo[0],
    lote: lote[0],
    fechaEvento: datosBasicos.fechaEvento,
    adjuntos: validarAdjuntosObservacion(request.adjuntos),
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
        "recorridaId",
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
        ${request.recorridaId || null},
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

    if (request.recorridaId) {
      await tx.$executeRaw`
        UPDATE "RecorridaCampo"
        SET
          "cantidadObservaciones" = (
            SELECT COUNT(*)::int
            FROM "ObservacionCampo"
            WHERE "recorridaId" = ${request.recorridaId}
          ),
          "severidadMaxima" = (
            SELECT CASE
              WHEN COUNT(*) FILTER (WHERE "severidad" = 'alta') > 0 THEN 'alta'
              WHEN COUNT(*) FILTER (WHERE "severidad" = 'media') > 0 THEN 'media'
              WHEN COUNT(*) FILTER (WHERE "severidad" = 'baja') > 0 THEN 'baja'
              ELSE NULL
            END
            FROM "ObservacionCampo"
            WHERE "recorridaId" = ${request.recorridaId}
          ),
          "updatedAt" = NOW()
        WHERE "id" = ${request.recorridaId}
          AND "clienteId" = ${clienteId}
      `;
    }

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
