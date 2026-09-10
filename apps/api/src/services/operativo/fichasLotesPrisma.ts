import type {
  CampoApp,
  CultivoOperativoResumen,
  FichaLoteOperativoResponse,
  LoteApp,
  PlanificacionOperativaLineaResumen,
  ZonaApp,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { obtenerCamposAsignados } from '../usuarios/asignacionCampos';

type UsuarioOperacion = {
  id?: string;
  rol?: string;
  clienteId?: string;
};

type LoteFichaRow = {
  loteId: string;
  loteClienteId: string;
  loteCampoAppId: string;
  loteErpId: string | null;
  loteNombre: string;
  loteCodigoInterno: string | null;
  loteSuperficieTotal: number;
  loteSuperficieProductiva: number;
  loteEstadoVinculacion: string;
  loteCreatedAt: Date;
  loteUpdatedAt: Date;
  campoId: string;
  campoClienteId: string;
  campoEmpresaErpId: string;
  campoErpId: string | null;
  campoNombre: string;
  campoCodigoInterno: string | null;
  campoZonaAppId: string | null;
  campoZonaErpId: string | null;
  campoEstadoVinculacion: string;
  campoCreatedAt: Date;
  campoUpdatedAt: Date;
  zonaId: string | null;
  zonaClienteId: string | null;
  zonaEmpresaErpId: string | null;
  zonaErpId: string | null;
  zonaNombre: string | null;
  zonaCodigoInterno: string | null;
  zonaEstadoVinculacion: string | null;
  zonaCreatedAt: Date | null;
  zonaUpdatedAt: Date | null;
};

type CultivoRow = {
  id: string;
  erpId: string;
  nombre: string;
  campaniaNombre: string | null;
  actividadNombre: string | null;
  hectareas: number;
  hectareasSembradas: number;
  hectareasCosechadas: number;
  activo: boolean;
  actualizadoEn: Date;
};

type PlanificacionLineaRow = {
  id: string;
  planificacionId: string;
  planificacionNombre: string;
  estadoPlanificacion: string;
  actividadNombre: string | null;
  protocoloNombre: string | null;
  destinoVenta: string;
  hectareasPlanificadas: number;
  rindeEstimado: number;
  margenBrutoEstimado: number;
};

type PrecipitacionResumenRow = {
  cantidadRegistros: bigint;
  milimetrosUltimos30Dias: number | null;
  ultimoEvento: Date | null;
};

type ObservacionResumenRow = {
  cantidadRegistros: bigint;
  cantidadAlta: bigint;
};

type ObservacionUltimaRow = {
  id: string;
  titulo: string;
  severidad: string;
  fechaEvento: Date;
  cantidadAdjuntos: bigint;
};

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function mapearCampo(row: LoteFichaRow): CampoApp {
  return {
    id: row.campoId,
    clienteId: row.campoClienteId,
    empresaErpId: row.campoEmpresaErpId,
    campoErpId: row.campoErpId || undefined,
    nombre: row.campoNombre,
    codigoInterno: row.campoCodigoInterno || undefined,
    zonaAppId: row.campoZonaAppId || undefined,
    zonaErpId: row.campoZonaErpId || undefined,
    estadoVinculacion: row.campoEstadoVinculacion as CampoApp['estadoVinculacion'],
    createdAt: row.campoCreatedAt.toISOString(),
    updatedAt: row.campoUpdatedAt.toISOString(),
  };
}

function mapearLote(row: LoteFichaRow): LoteApp {
  return {
    id: row.loteId,
    clienteId: row.loteClienteId,
    campoAppId: row.loteCampoAppId,
    loteErpId: row.loteErpId || undefined,
    nombre: row.loteNombre,
    codigoInterno: row.loteCodigoInterno || undefined,
    superficieTotal: row.loteSuperficieTotal,
    superficieProductiva: row.loteSuperficieProductiva,
    estadoVinculacion: row.loteEstadoVinculacion as LoteApp['estadoVinculacion'],
    createdAt: row.loteCreatedAt.toISOString(),
    updatedAt: row.loteUpdatedAt.toISOString(),
  };
}

function mapearZona(row: LoteFichaRow): ZonaApp | undefined {
  if (!row.zonaId || !row.zonaClienteId || !row.zonaEmpresaErpId || !row.zonaNombre || !row.zonaEstadoVinculacion || !row.zonaCreatedAt || !row.zonaUpdatedAt) {
    return undefined;
  }

  return {
    id: row.zonaId,
    clienteId: row.zonaClienteId,
    empresaErpId: row.zonaEmpresaErpId,
    zonaErpId: row.zonaErpId || undefined,
    nombre: row.zonaNombre,
    codigoInterno: row.zonaCodigoInterno || undefined,
    estadoVinculacion: row.zonaEstadoVinculacion as ZonaApp['estadoVinculacion'],
    createdAt: row.zonaCreatedAt.toISOString(),
    updatedAt: row.zonaUpdatedAt.toISOString(),
  };
}

function mapearCultivo(row: CultivoRow): CultivoOperativoResumen {
  return {
    id: row.id,
    erpId: row.erpId,
    nombre: row.nombre,
    campaniaNombre: row.campaniaNombre || undefined,
    actividadNombre: row.actividadNombre || undefined,
    hectareas: row.hectareas,
    hectareasSembradas: row.hectareasSembradas,
    hectareasCosechadas: row.hectareasCosechadas,
    activo: row.activo,
    actualizadoEn: row.actualizadoEn.toISOString(),
  };
}

function mapearLinea(row: PlanificacionLineaRow): PlanificacionOperativaLineaResumen {
  return {
    id: row.id,
    planificacionId: row.planificacionId,
    planificacionNombre: row.planificacionNombre,
    estadoPlanificacion: row.estadoPlanificacion,
    actividadNombre: row.actividadNombre || undefined,
    protocoloNombre: row.protocoloNombre || undefined,
    destinoVenta: row.destinoVenta,
    hectareasPlanificadas: row.hectareasPlanificadas,
    rindeEstimado: row.rindeEstimado,
    margenBrutoEstimado: row.margenBrutoEstimado,
  };
}

async function validarAlcanceCampo(usuario: UsuarioOperacion, campoErpId: string | null) {
  if (usuario.rol === 'admin') {
    return;
  }

  const camposAsignados = await obtenerCamposAsignados({
    sub: usuario.id || '',
    rol: usuario.rol,
    clienteId: usuario.clienteId,
  });

  if (camposAsignados && (!campoErpId || !camposAsignados.includes(campoErpId))) {
    throw crearErrorValidacion('No tienes permisos para consultar este lote.', 403);
  }
}

export async function obtenerFichaLoteOperativo(
  loteAppId: string,
  usuario: UsuarioOperacion,
): Promise<FichaLoteOperativoResponse> {
  const clienteId = usuario.clienteId;

  if (!clienteId) {
    throw crearErrorValidacion('Sesion sin cliente asociado.', 401);
  }

  const lote = await prisma.$queryRaw<LoteFichaRow[]>`
    SELECT
      lote."id" AS "loteId",
      lote."clienteId" AS "loteClienteId",
      lote."campoAppId" AS "loteCampoAppId",
      lote."loteErpId" AS "loteErpId",
      lote."nombre" AS "loteNombre",
      lote."codigoInterno" AS "loteCodigoInterno",
      lote."superficieTotal" AS "loteSuperficieTotal",
      lote."superficieProductiva" AS "loteSuperficieProductiva",
      lote."estadoVinculacion" AS "loteEstadoVinculacion",
      lote."createdAt" AS "loteCreatedAt",
      lote."updatedAt" AS "loteUpdatedAt",
      campo."id" AS "campoId",
      campo."clienteId" AS "campoClienteId",
      campo."empresaErpId" AS "campoEmpresaErpId",
      campo."campoErpId" AS "campoErpId",
      campo."nombre" AS "campoNombre",
      campo."codigoInterno" AS "campoCodigoInterno",
      campo."zonaAppId" AS "campoZonaAppId",
      campo."zonaErpId" AS "campoZonaErpId",
      campo."estadoVinculacion" AS "campoEstadoVinculacion",
      campo."createdAt" AS "campoCreatedAt",
      campo."updatedAt" AS "campoUpdatedAt",
      zona."id" AS "zonaId",
      zona."clienteId" AS "zonaClienteId",
      zona."empresaErpId" AS "zonaEmpresaErpId",
      zona."zonaErpId" AS "zonaErpId",
      zona."nombre" AS "zonaNombre",
      zona."codigoInterno" AS "zonaCodigoInterno",
      zona."estadoVinculacion" AS "zonaEstadoVinculacion",
      zona."createdAt" AS "zonaCreatedAt",
      zona."updatedAt" AS "zonaUpdatedAt"
    FROM "LoteApp" lote
    INNER JOIN "CampoApp" campo ON campo."id" = lote."campoAppId"
    LEFT JOIN "ZonaApp" zona ON zona."id" = campo."zonaAppId"
    WHERE lote."id" = ${loteAppId}
      AND lote."clienteId" = ${clienteId}
    LIMIT 1
  `;
  const row = lote[0];

  if (!row) {
    throw crearErrorValidacion('Lote no encontrado.', 404);
  }

  await validarAlcanceCampo(usuario, row.campoErpId);

  const cultivos = row.loteErpId
    ? await prisma.$queryRaw<CultivoRow[]>`
      SELECT
        cultivo."id",
        cultivo."erpId",
        cultivo."nombre",
        campania."nombre" AS "campaniaNombre",
        actividad."descripcion" AS "actividadNombre",
        cultivo."hectareas",
        cultivo."hectareasSembradas",
        cultivo."hectareasCosechadas",
        cultivo."activo",
        cultivo."actualizadoEn"
      FROM "ErpCultivo" cultivo
      LEFT JOIN "ErpCampania" campania ON campania."erpId" = cultivo."campaniaErpId"
      LEFT JOIN "ErpActividad" actividad ON actividad."erpId" = cultivo."actividadErpId"
      WHERE cultivo."loteErpId" = ${row.loteErpId}
      ORDER BY cultivo."actualizadoEn" DESC, cultivo."nombre" ASC
      LIMIT 20
    `
    : [];
  const planificaciones = await prisma.$queryRaw<PlanificacionLineaRow[]>`
    SELECT
      linea."id",
      linea."planificacionId",
      planificacion."nombre" AS "planificacionNombre",
      planificacion."estado" AS "estadoPlanificacion",
      actividad."nombre" AS "actividadNombre",
      protocolo."nombre" AS "protocoloNombre",
      linea."destinoVenta",
      linea."hectareasPlanificadas",
      linea."rindeEstimado",
      linea."margenBrutoEstimado"
    FROM "PlanificacionAgricolaLinea" linea
    INNER JOIN "PlanificacionAgricola" planificacion ON planificacion."id" = linea."planificacionId"
    LEFT JOIN "ActividadApp" actividad ON actividad."id" = linea."actividadAppId"
    LEFT JOIN "ProtocoloProductivo" protocolo ON protocolo."id" = linea."protocoloId"
    WHERE planificacion."clienteId" = ${clienteId}
      AND linea."loteAppId" = ${loteAppId}
    ORDER BY planificacion."createdAt" DESC, linea."createdAt" DESC
    LIMIT 20
  `;
  const precipitaciones = await prisma.$queryRaw<PrecipitacionResumenRow[]>`
    SELECT
      COUNT(*) AS "cantidadRegistros",
      COALESCE(SUM(CASE WHEN "fechaEvento" >= NOW() - INTERVAL '30 days' THEN "milimetros" ELSE 0 END), 0) AS "milimetrosUltimos30Dias",
      MAX("fechaEvento") AS "ultimoEvento"
    FROM "PrecipitacionCampo"
    WHERE "clienteId" = ${clienteId}
      AND ("loteAppId" = ${loteAppId} OR ("loteAppId" IS NULL AND "campoAppId" = ${row.campoId}))
  `;
  const observacionesResumen = await prisma.$queryRaw<ObservacionResumenRow[]>`
    SELECT
      COUNT(*) AS "cantidadRegistros",
      COUNT(*) FILTER (WHERE "severidad" = 'alta') AS "cantidadAlta"
    FROM "ObservacionCampo"
    WHERE "clienteId" = ${clienteId}
      AND ("loteAppId" = ${loteAppId} OR ("loteAppId" IS NULL AND "campoAppId" = ${row.campoId}))
  `;
  const ultimasObservaciones = await prisma.$queryRaw<ObservacionUltimaRow[]>`
    SELECT
      obs."id",
      obs."titulo",
      obs."severidad",
      obs."fechaEvento",
      COUNT(adj."id") AS "cantidadAdjuntos"
    FROM "ObservacionCampo" obs
    LEFT JOIN "ObservacionAdjunto" adj ON adj."observacionId" = obs."id"
    WHERE obs."clienteId" = ${clienteId}
      AND (obs."loteAppId" = ${loteAppId} OR (obs."loteAppId" IS NULL AND obs."campoAppId" = ${row.campoId}))
    GROUP BY obs."id"
    ORDER BY obs."fechaEvento" DESC, obs."createdAt" DESC
    LIMIT 5
  `;
  const resumenPrecipitaciones = precipitaciones[0];
  const resumenObservaciones = observacionesResumen[0];

  return {
    campo: mapearCampo(row),
    lote: mapearLote(row),
    zona: mapearZona(row),
    cultivos: cultivos.map(mapearCultivo),
    planificaciones: planificaciones.map(mapearLinea),
    precipitaciones: {
      cantidadRegistros: Number(resumenPrecipitaciones?.cantidadRegistros || 0),
      milimetrosUltimos30Dias: Number(resumenPrecipitaciones?.milimetrosUltimos30Dias || 0),
      ultimoEvento: resumenPrecipitaciones?.ultimoEvento?.toISOString(),
    },
    observaciones: {
      cantidadRegistros: Number(resumenObservaciones?.cantidadRegistros || 0),
      cantidadAlta: Number(resumenObservaciones?.cantidadAlta || 0),
      ultimas: ultimasObservaciones.map((observacion) => ({
        id: observacion.id,
        titulo: observacion.titulo,
        severidad: observacion.severidad,
        fechaEvento: observacion.fechaEvento.toISOString(),
        cantidadAdjuntos: Number(observacion.cantidadAdjuntos),
      })),
    },
    generadoEn: new Date().toISOString(),
  };
}
