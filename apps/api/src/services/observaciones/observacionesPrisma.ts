import { randomUUID } from 'node:crypto';
import type {
  CrearObservacionRequest,
  CrearObservacionResponse,
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

function mapearObservacion(row: ObservacionRow): ObservacionCampo {
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

  return { observaciones: registros.map(mapearObservacion) };
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
        return {
          observacion: mapearObservacion(existenteMovil[0]),
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
    const observacion = mapearObservacion(creado[0]);

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
