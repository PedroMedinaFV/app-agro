import { randomUUID } from 'node:crypto';
import type {
  CrearPrecipitacionRequest,
  CrearPrecipitacionResponse,
  OrigenPrecipitacion,
  PrecipitacionCampo,
  PrecipitacionesResponse,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { obtenerCamposAsignados } from '../usuarios/asignacionCampos';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';

type UsuarioOperacion = UsuarioAuditoria & {
  rol?: string;
};

type PrecipitacionRow = {
  id: string;
  clienteId: string;
  usuarioId: string | null;
  campoPlanificacionId: string;
  campoErpId: string | null;
  lotePlanificacionId: string | null;
  loteErpId: string | null;
  milimetros: number;
  fechaEvento: Date;
  observaciones: string | null;
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
  campoPlanificacionId: string;
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

function mapearPrecipitacion(row: PrecipitacionRow): PrecipitacionCampo {
  return {
    id: row.id,
    clienteId: row.clienteId,
    usuarioId: row.usuarioId || undefined,
    campoPlanificacionId: row.campoPlanificacionId,
    campoErpId: row.campoErpId || undefined,
    lotePlanificacionId: row.lotePlanificacionId || undefined,
    loteErpId: row.loteErpId || undefined,
    milimetros: row.milimetros,
    fechaEvento: row.fechaEvento.toISOString(),
    observaciones: row.observaciones || undefined,
    origen: row.origen as OrigenPrecipitacion,
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
    throw crearErrorValidacion('No tienes permisos para cargar precipitaciones en este campo.', 403);
  }
}

async function validarRequestPrecipitacion(clienteId: string, request: CrearPrecipitacionRequest, usuario: UsuarioOperacion) {
  if (!['web', 'mobile', 'api'].includes(request.origen)) {
    throw crearErrorValidacion('El origen de la precipitacion no es valido.');
  }

  if (!request.campoPlanificacionId) {
    throw crearErrorValidacion('La precipitacion debe tener campo.');
  }

  if (!Number.isFinite(request.milimetros) || request.milimetros <= 0) {
    throw crearErrorValidacion('Los milimetros deben ser mayores a cero.');
  }

  if (request.milimetros > 1000) {
    throw crearErrorValidacion('Los milimetros informados superan el maximo permitido para una carga manual.');
  }

  const fechaEvento = new Date(request.fechaEvento);
  if (Number.isNaN(fechaEvento.getTime())) {
    throw crearErrorValidacion('La fecha del evento no es valida.');
  }

  const campo = await prisma.$queryRaw<CampoRow[]>`
    SELECT "id", "clienteId", "campoErpId"
    FROM "CampoPlanificacion"
    WHERE "id" = ${request.campoPlanificacionId}
    LIMIT 1
  `;

  if (!campo[0] || campo[0].clienteId !== clienteId) {
    throw crearErrorValidacion('El campo seleccionado no pertenece al cliente.', 403);
  }

  await validarAlcanceCampo(usuario, campo[0]);

  const lote = request.lotePlanificacionId
    ? await prisma.$queryRaw<LoteRow[]>`
      SELECT "id", "clienteId", "campoPlanificacionId", "loteErpId"
      FROM "LotePlanificacion"
      WHERE "id" = ${request.lotePlanificacionId}
      LIMIT 1
    `
    : [];

  if (request.lotePlanificacionId && (!lote[0] || lote[0].clienteId !== clienteId || lote[0].campoPlanificacionId !== request.campoPlanificacionId)) {
    throw crearErrorValidacion('El lote seleccionado no pertenece al campo indicado.', 403);
  }

  return {
    campo: campo[0],
    lote: lote[0],
    fechaEvento,
  };
}

export async function obtenerPrecipitacionesPersistidas(
  clienteId: string,
  usuario: UsuarioOperacion,
): Promise<PrecipitacionesResponse> {
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
  const registros = await prisma.$queryRaw<PrecipitacionRow[]>`
    SELECT *
    FROM "PrecipitacionCampo"
    WHERE "clienteId" = ${clienteId}
    ${filtroCampos}
    ORDER BY "fechaEvento" DESC, "createdAt" DESC
    LIMIT 500
  `;

  return { precipitaciones: registros.map(mapearPrecipitacion) };
}

export async function crearPrecipitacionPersistida(
  request: CrearPrecipitacionRequest,
  usuario: UsuarioOperacion,
): Promise<CrearPrecipitacionResponse> {
  const clienteId = usuario.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const validacion = await validarRequestPrecipitacion(clienteId, request, usuario);
  const id = randomUUID();
  const observaciones = request.observaciones ? limpiarTextoVisible(request.observaciones) : null;

  return prisma.$transaction(async (tx) => {
    const usuarioExistente = usuario.id
      ? await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "Usuario"
        WHERE "id" = ${usuario.id}
        LIMIT 1
      `
      : [];
    const usuarioId = usuarioExistente[0]?.id || null;
    const creado = await tx.$queryRaw<PrecipitacionRow[]>`
      INSERT INTO "PrecipitacionCampo" (
        "id",
        "clienteId",
        "usuarioId",
        "campoPlanificacionId",
        "campoErpId",
        "lotePlanificacionId",
        "loteErpId",
        "milimetros",
        "fechaEvento",
        "observaciones",
        "origen",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${clienteId},
        ${usuarioId},
        ${request.campoPlanificacionId},
        ${validacion.campo.campoErpId},
        ${request.lotePlanificacionId || null},
        ${validacion.lote?.loteErpId || null},
        ${request.milimetros},
        ${validacion.fechaEvento},
        ${observaciones},
        ${request.origen},
        NOW()
      )
      RETURNING *
    `;
    const precipitacion = mapearPrecipitacion(creado[0]);

    await registrarAuditoria(tx, {
      clienteId,
      usuario,
      entidad: 'PrecipitacionCampo',
      entidadId: id,
      accion: 'crear',
      origen: request.origen,
      motivo: 'Carga de precipitacion operativa.',
      valoresDespues: precipitacion,
    });

    return {
      precipitacion,
      auditado: true,
      mensaje: 'Precipitacion registrada con auditoria.',
    };
  });
}
