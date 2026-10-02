import { randomUUID } from 'node:crypto';
import type {
  CerrarRecorridaCampoRequest,
  CrearRecorridaCampoRequest,
  CrearRecorridaCampoResponse,
  EstadoRecorridaCampo,
  ObjetivoRecorridaCampo,
  RecorridaCampo,
  RecorridaCampoDetalleResponse,
  RecorridasCampoResponse,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import { obtenerCamposAsignados } from '../usuarios/asignacionCampos';
import {
  crearErrorValidacion,
  limpiarTextoVisible,
  validarCierreRecorrida,
  validarDatosBasicosRecorrida,
} from './validacionesRecorridas';

type UsuarioOperacion = UsuarioAuditoria & {
  rol?: string;
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
  usuarioId: string | null;
  campoAppId: string;
  campoErpId: string | null;
  loteAppId: string | null;
  loteErpId: string | null;
  campaniaErpId: string | null;
  titulo: string;
  objetivo: string;
  estado: string;
  fechaInicio: Date;
  fechaCierre: Date | null;
  observaciones: string | null;
  origen: string;
  cantidadObservaciones: number;
  severidadMaxima: string | null;
  createdAt: Date;
  updatedAt: Date;
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

function mapearRecorrida(row: RecorridaRow): RecorridaCampo {
  return {
    id: row.id,
    clienteId: row.clienteId,
    usuarioId: row.usuarioId || undefined,
    campoAppId: row.campoAppId,
    campoErpId: row.campoErpId || undefined,
    loteAppId: row.loteAppId || undefined,
    loteErpId: row.loteErpId || undefined,
    campaniaErpId: row.campaniaErpId || undefined,
    titulo: row.titulo,
    objetivo: row.objetivo as ObjetivoRecorridaCampo,
    estado: row.estado as EstadoRecorridaCampo,
    fechaInicio: row.fechaInicio.toISOString(),
    fechaCierre: row.fechaCierre?.toISOString(),
    observaciones: row.observaciones || undefined,
    origen: row.origen as RecorridaCampo['origen'],
    cantidadObservaciones: row.cantidadObservaciones,
    severidadMaxima: row.severidadMaxima as RecorridaCampo['severidadMaxima'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapearObservacion(row: ObservacionRow): RecorridaCampoDetalleResponse['observaciones'][number] {
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
    severidad: row.severidad as RecorridaCampoDetalleResponse['observaciones'][number]['severidad'],
    latitud: row.latitud ?? undefined,
    longitud: row.longitud ?? undefined,
    fechaEvento: row.fechaEvento.toISOString(),
    origen: row.origen as RecorridaCampoDetalleResponse['observaciones'][number]['origen'],
    adjuntos: [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function validarAlcanceCampo(usuario: UsuarioOperacion, campo: CampoRow) {
  const camposAsignados = await obtenerCamposAsignados({
    sub: usuario.id || '',
    rol: usuario.rol,
    clienteId: usuario.clienteId,
  });

  if (camposAsignados && (!campo.campoErpId || !camposAsignados.includes(campo.campoErpId))) {
    throw crearErrorValidacion('No tienes permisos sobre este campo.', 403);
  }
}

async function validarCampoLote(clienteId: string, campoAppId: string, loteAppId: string | undefined, usuario: UsuarioOperacion) {
  const campos = await prisma.$queryRaw<CampoRow[]>`
    SELECT "id", "clienteId", "campoErpId"
    FROM "CampoApp"
    WHERE "id" = ${campoAppId}
    LIMIT 1
  `;
  const campo = campos[0];

  if (!campo || campo.clienteId !== clienteId) {
    throw crearErrorValidacion('El campo seleccionado no pertenece al cliente.', 403);
  }

  await validarAlcanceCampo(usuario, campo);

  const lotes = loteAppId
    ? await prisma.$queryRaw<LoteRow[]>`
      SELECT "id", "clienteId", "campoAppId", "loteErpId"
      FROM "LoteApp"
      WHERE "id" = ${loteAppId}
      LIMIT 1
    `
    : [];
  const lote = lotes[0];

  if (loteAppId && (!lote || lote.clienteId !== clienteId || lote.campoAppId !== campoAppId)) {
    throw crearErrorValidacion('El lote seleccionado no pertenece al campo indicado.', 403);
  }

  return { campo, lote };
}

export async function obtenerRecorridasCampoPersistidas(clienteId: string, usuario: UsuarioOperacion): Promise<RecorridasCampoResponse> {
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
  const recorridas = await prisma.$queryRaw<RecorridaRow[]>`
    SELECT *
    FROM "RecorridaCampo"
    WHERE "clienteId" = ${clienteId}
    ${filtroCampos}
    ORDER BY "fechaInicio" DESC, "createdAt" DESC
    LIMIT 500
  `;

  return { recorridas: recorridas.map(mapearRecorrida) };
}

export async function obtenerRecorridaCampoDetallePersistida(id: string, usuario: UsuarioOperacion): Promise<RecorridaCampoDetalleResponse> {
  if (!usuario.clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const recorridas = await prisma.$queryRaw<RecorridaRow[]>`
    SELECT *
    FROM "RecorridaCampo"
    WHERE "id" = ${id}
      AND "clienteId" = ${usuario.clienteId}
    LIMIT 1
  `;
  const recorrida = recorridas[0];

  if (!recorrida) {
    throw crearErrorValidacion('Recorrida no encontrada.', 404);
  }

  await validarCampoLote(usuario.clienteId, recorrida.campoAppId, recorrida.loteAppId || undefined, usuario);

  const observaciones = await prisma.$queryRaw<ObservacionRow[]>`
    SELECT *
    FROM "ObservacionCampo"
    WHERE "clienteId" = ${usuario.clienteId}
      AND "recorridaId" = ${id}
    ORDER BY "fechaEvento" DESC, "createdAt" DESC
  `;

  return {
    recorrida: mapearRecorrida(recorrida),
    observaciones: observaciones.map(mapearObservacion),
  };
}

export async function crearRecorridaCampoPersistida(
  request: CrearRecorridaCampoRequest,
  usuario: UsuarioOperacion,
): Promise<CrearRecorridaCampoResponse> {
  const clienteId = usuario.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const datosBasicos = validarDatosBasicosRecorrida(request);
  const { campo, lote } = await validarCampoLote(clienteId, request.campoAppId, request.loteAppId, usuario);
  const id = randomUUID();

  return prisma.$transaction(async (tx) => {
    const creado = await tx.$queryRaw<RecorridaRow[]>`
      INSERT INTO "RecorridaCampo" (
        "id",
        "clienteId",
        "usuarioId",
        "campoAppId",
        "campoErpId",
        "loteAppId",
        "loteErpId",
        "campaniaErpId",
        "titulo",
        "objetivo",
        "estado",
        "fechaInicio",
        "observaciones",
        "origen",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${clienteId},
        ${usuario.id || null},
        ${request.campoAppId},
        ${campo.campoErpId},
        ${request.loteAppId || null},
        ${lote?.loteErpId || null},
        ${request.campaniaErpId || null},
        ${datosBasicos.titulo},
        ${datosBasicos.objetivo},
        ${datosBasicos.estado},
        ${datosBasicos.fechaInicio},
        ${datosBasicos.observaciones},
        ${request.origen},
        NOW()
      )
      RETURNING *
    `;
    const recorrida = mapearRecorrida(creado[0]);

    await registrarAuditoria(tx, {
      clienteId,
      usuario,
      entidad: 'RecorridaCampo',
      entidadId: id,
      accion: 'crear',
      origen: request.origen,
      motivo: 'Creacion de recorrida operativa.',
      valoresDespues: recorrida,
    });

    return {
      recorrida,
      auditado: true,
      mensaje: 'Recorrida creada con auditoria.',
    };
  });
}

export async function cerrarRecorridaCampoPersistida(id: string, request: CerrarRecorridaCampoRequest, usuario: UsuarioOperacion) {
  if (!usuario.clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const existentes = await prisma.$queryRaw<RecorridaRow[]>`
    SELECT *
    FROM "RecorridaCampo"
    WHERE "id" = ${id}
      AND "clienteId" = ${usuario.clienteId}
    LIMIT 1
  `;
  const existente = existentes[0];

  if (!existente) {
    throw crearErrorValidacion('Recorrida no encontrada.', 404);
  }

  await validarCampoLote(usuario.clienteId, existente.campoAppId, existente.loteAppId || undefined, usuario);
  const fechaCierre = validarCierreRecorrida(existente.estado as EstadoRecorridaCampo, request.fechaCierre);

  return prisma.$transaction(async (tx) => {
    const actualizado = await tx.$queryRaw<RecorridaRow[]>`
      UPDATE "RecorridaCampo"
      SET
        "estado" = 'cerrada',
        "fechaCierre" = ${fechaCierre},
        "observaciones" = ${request.observaciones ? limpiarTextoVisible(request.observaciones) : existente.observaciones},
        "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "clienteId" = ${usuario.clienteId}
      RETURNING *
    `;
    const recorrida = mapearRecorrida(actualizado[0]);

    await registrarAuditoria(tx, {
      clienteId: usuario.clienteId || '',
      usuario,
      entidad: 'RecorridaCampo',
      entidadId: id,
      accion: 'cerrar',
      origen: request.origen,
      motivo: 'Cierre de recorrida operativa.',
      valoresAntes: mapearRecorrida(existente),
      valoresDespues: recorrida,
    });

    return {
      recorrida,
      auditado: true,
      mensaje: 'Recorrida cerrada con auditoria.',
    };
  });
}
