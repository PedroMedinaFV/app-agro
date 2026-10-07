import type {
  ActividadApp,
  CerrarPlanificacionRequest,
  CerrarPlanificacionResponse,
  CampoApp,
  DestinoApp,
  DestinoVentaLineaSnapshot,
  ErpCultivo,
  GastoComercialItemReferencia,
  GastosComercialesLineaSnapshot,
  GastosComercialesReferencia,
  GuardarPlanificacionRequest,
  GuardarPlanificacionResponse,
  LoteApp,
  PadronesLineaSnapshot,
  PlanificacionAgricola,
  PlanificacionAgricolaLinea,
  PlanificacionAgricolaResumen,
  PrecioReferencia,
  PrecioVentaLineaSnapshot,
  ProtocoloLineaSnapshot,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from './auditoria';
import { obtenerProtocolosDetallePorIds } from './protocolosPrisma';
import {
  crearErrorValidacion,
  congelarPlanificacionParaCierre,
  LoteSuperficieValidacion,
  recalcularLineaPlanificacionPersistida,
  validarCabeceraPlanificacion,
  validarLineasPlanificacion,
  validarPlanificacionTieneLineasParaCierre,
} from './validacionesPlanificacion';

function serializarFecha(fecha?: Date | string | null) {
  if (!fecha) {
    return undefined;
  }

  return fecha instanceof Date ? fecha.toISOString() : fecha;
}

function parsearFecha(fecha?: string) {
  return fecha ? new Date(fecha) : undefined;
}

function mapearGastosComercialesSnapshot(valor: Prisma.JsonValue | null): GastosComercialesLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as GastosComercialesLineaSnapshot;
}

function serializarGastosComercialesSnapshot(snapshot?: GastosComercialesLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

function mapearPadronesSnapshot(valor: Prisma.JsonValue | null): PadronesLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as PadronesLineaSnapshot;
}

function serializarPadronesSnapshot(snapshot?: PadronesLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

function mapearDestinoVentaSnapshot(valor: Prisma.JsonValue | null): DestinoVentaLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as DestinoVentaLineaSnapshot;
}

function serializarDestinoVentaSnapshot(snapshot?: DestinoVentaLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

function mapearPrecioVentaSnapshot(valor: Prisma.JsonValue | null): PrecioVentaLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as PrecioVentaLineaSnapshot;
}

function serializarPrecioVentaSnapshot(snapshot?: PrecioVentaLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

function mapearProtocoloSnapshot(valor: Prisma.JsonValue | null): ProtocoloLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as ProtocoloLineaSnapshot;
}

function serializarProtocoloSnapshot(snapshot?: ProtocoloLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

function mapearCampoApp(campo: {
  id: string;
  clienteId: string;
  empresaErpId: string;
  campoErpId: string | null;
  nombre: string;
  codigoInterno: string | null;
  zonaAppId: string | null;
  zonaErpId: string | null;
  estadoVinculacion: string;
  createdAt: Date;
  updatedAt: Date;
}): CampoApp {
  return {
    id: campo.id,
    clienteId: campo.clienteId,
    empresaErpId: campo.empresaErpId,
    campoErpId: campo.campoErpId || undefined,
    nombre: campo.nombre,
    codigoInterno: campo.codigoInterno || undefined,
    zonaAppId: campo.zonaAppId || undefined,
    zonaErpId: campo.zonaErpId || undefined,
    estadoVinculacion: campo.estadoVinculacion as CampoApp['estadoVinculacion'],
    createdAt: campo.createdAt.toISOString(),
    updatedAt: campo.updatedAt.toISOString(),
  };
}

function mapearLoteApp(lote: {
  id: string;
  clienteId: string;
  campoAppId: string;
  loteErpId: string | null;
  nombre: string;
  codigoInterno: string | null;
  superficieTotal: number;
  superficieProductiva: number;
  estadoVinculacion: string;
  createdAt: Date;
  updatedAt: Date;
}): LoteApp {
  return {
    id: lote.id,
    clienteId: lote.clienteId,
    campoAppId: lote.campoAppId,
    loteErpId: lote.loteErpId || undefined,
    nombre: lote.nombre,
    codigoInterno: lote.codigoInterno || undefined,
    superficieTotal: lote.superficieTotal,
    superficieProductiva: lote.superficieProductiva,
    estadoVinculacion: lote.estadoVinculacion as LoteApp['estadoVinculacion'],
    createdAt: lote.createdAt.toISOString(),
    updatedAt: lote.updatedAt.toISOString(),
  };
}

function mapearActividadApp(actividad: {
  id: string;
  clienteId: string;
  empresaErpId: string;
  actividadErpId: string | null;
  especieAppId: string | null;
  especieErpId: string | null;
  nombre: string;
  codigoInterno: string | null;
  tipoGrano: string | null;
  tipoCultivo: string | null;
  epocaSiembra: string | null;
  estadoVinculacion: string;
  createdAt: Date;
  updatedAt: Date;
}): ActividadApp {
  return {
    id: actividad.id,
    clienteId: actividad.clienteId,
    empresaErpId: actividad.empresaErpId,
    actividadErpId: actividad.actividadErpId || undefined,
    especieAppId: actividad.especieAppId || undefined,
    especieErpId: actividad.especieErpId || undefined,
    nombre: actividad.nombre,
    codigoInterno: actividad.codigoInterno || undefined,
    tipoGrano: actividad.tipoGrano as ActividadApp['tipoGrano'],
    tipoCultivo: actividad.tipoCultivo as ActividadApp['tipoCultivo'],
    epocaSiembra: actividad.epocaSiembra as ActividadApp['epocaSiembra'],
    estadoVinculacion: actividad.estadoVinculacion as ActividadApp['estadoVinculacion'],
    createdAt: actividad.createdAt.toISOString(),
    updatedAt: actividad.updatedAt.toISOString(),
  };
}

function mapearCultivoErp(cultivo: {
  empresaErpId: string;
  erpId: string;
  idCultivo: number;
  codigo: string;
  nombre: string;
  idCampo: number;
  campoErpId: string;
  idLote: number;
  loteErpId: string;
  idActividad: number | null;
  actividadErpId: string | null;
  idEspecie: number | null;
  especieErpId: string | null;
  idCampania: number | null;
  campaniaErpId: string | null;
  hectareas: number;
  hectareasSembradas: number;
  hectareasCosechadas: number;
  idPuerto: number | null;
  distanciaPuerto: number | null;
  idPersonalResponsable: number | null;
  esAgriculturaIntensiva: boolean;
  socioEnFuncionAportes: boolean;
  activo: boolean;
  actualizadoEn: Date;
}): ErpCultivo {
  return {
    empresaErpId: cultivo.empresaErpId,
    erpId: cultivo.erpId,
    idCultivo: cultivo.idCultivo,
    codigo: cultivo.codigo,
    nombre: cultivo.nombre,
    idCampo: cultivo.idCampo,
    campoErpId: cultivo.campoErpId,
    idLote: cultivo.idLote,
    loteErpId: cultivo.loteErpId,
    idActividad: cultivo.idActividad ?? undefined,
    actividadErpId: cultivo.actividadErpId || undefined,
    idEspecie: cultivo.idEspecie ?? undefined,
    especieErpId: cultivo.especieErpId || undefined,
    idCampania: cultivo.idCampania ?? undefined,
    campaniaErpId: cultivo.campaniaErpId || undefined,
    hectareas: cultivo.hectareas,
    hectareasSembradas: cultivo.hectareasSembradas,
    hectareasCosechadas: cultivo.hectareasCosechadas,
    idPuerto: cultivo.idPuerto ?? undefined,
    distanciaPuerto: cultivo.distanciaPuerto ?? undefined,
    idPersonalResponsable: cultivo.idPersonalResponsable ?? undefined,
    esAgriculturaIntensiva: cultivo.esAgriculturaIntensiva,
    socioEnFuncionAportes: cultivo.socioEnFuncionAportes,
    activo: cultivo.activo,
    actualizadoEn: cultivo.actualizadoEn.toISOString(),
  };
}

function mapearDestinoReferencia(destino: {
  id: string;
  clienteId: string;
  empresaErpId: string | null;
  zonaErpId: string | null;
  campoAppId: string | null;
  campoErpId: string | null;
  actividadAppId: string | null;
  actividadErpId: string | null;
  especieErpId: string | null;
  cultivoErpId: string | null;
  destinoVenta: string;
  destinoVentaNormalizado: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DestinoApp {
  return {
    id: destino.id,
    clienteId: destino.clienteId,
    empresaErpId: destino.empresaErpId || undefined,
    zonaErpId: destino.zonaErpId || undefined,
    campoAppId: destino.campoAppId || undefined,
    campoErpId: destino.campoErpId || undefined,
    actividadAppId: destino.actividadAppId || undefined,
    actividadErpId: destino.actividadErpId || undefined,
    especieErpId: destino.especieErpId || undefined,
    cultivoErpId: destino.cultivoErpId || undefined,
    destinoVenta: destino.destinoVenta,
    destinoVentaNormalizado: destino.destinoVentaNormalizado,
    descripcion: destino.descripcion || undefined,
    activo: destino.activo,
    origen: 'app',
    createdAt: destino.createdAt.toISOString(),
    updatedAt: destino.updatedAt.toISOString(),
  };
}

function mapearPrecioReferencia(precio: {
  id: string;
  clienteId: string;
  empresaErpId: string | null;
  actividadAppId: string | null;
  actividadErpId: string | null;
  especieAppId: string | null;
  especieErpId: string | null;
  cultivoErpId: string | null;
  destinoVenta: string;
  valor: number;
  moneda: string;
  unidad: string;
  fuente: string;
  observaciones: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PrecioReferencia {
  return {
    id: precio.id,
    clienteId: precio.clienteId,
    empresaErpId: precio.empresaErpId || undefined,
    actividadAppId: precio.actividadAppId || undefined,
    actividadErpId: precio.actividadErpId || undefined,
    especieAppId: precio.especieAppId || undefined,
    especieErpId: precio.especieErpId || undefined,
    cultivoErpId: precio.cultivoErpId || undefined,
    destinoVenta: precio.destinoVenta,
    valor: precio.valor,
    moneda: precio.moneda,
    unidad: precio.unidad,
    fuente: precio.fuente,
    observaciones: precio.observaciones || undefined,
    activo: precio.activo,
    createdAt: precio.createdAt.toISOString(),
    updatedAt: precio.updatedAt.toISOString(),
  };
}

function mapearGastoComercialReferencia(gasto: {
  id: string;
  clienteId: string;
  campaniaErpId: string;
  empresaErpId: string;
  zonaAppId: string | null;
  zonaErpId: string | null;
  campoAppId: string | null;
  campoErpId: string | null;
  actividadAppId: string;
  actividadErpId: string | null;
  destinoVenta: string | null;
  descripcion: string;
  items: Prisma.JsonValue;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}): GastosComercialesReferencia {
  return {
    id: gasto.id,
    clienteId: gasto.clienteId,
    campaniaErpId: gasto.campaniaErpId,
    empresaErpId: gasto.empresaErpId,
    zonaAppId: gasto.zonaAppId || undefined,
    zonaErpId: gasto.zonaErpId || undefined,
    campoAppId: gasto.campoAppId || undefined,
    campoErpId: gasto.campoErpId || undefined,
    actividadAppId: gasto.actividadAppId,
    actividadErpId: gasto.actividadErpId || undefined,
    destinoVenta: gasto.destinoVenta || undefined,
    descripcion: gasto.descripcion,
    items: gasto.items as unknown as GastoComercialItemReferencia[],
    activo: gasto.activo,
    createdAt: gasto.createdAt.toISOString(),
    updatedAt: gasto.updatedAt.toISOString(),
  };
}

type PlanificacionPrisma = Prisma.PlanificacionAgricolaGetPayload<{
  include: {
    lineas: {
      orderBy: { createdAt: 'asc' };
    };
  };
}>;

function mapearLinea(linea: PlanificacionPrisma['lineas'][number]): PlanificacionAgricolaLinea {
  return {
    id: linea.id,
    planificacionId: linea.planificacionId,
    empresaErpId: linea.empresaErpId,
    campoAppId: linea.campoAppId,
    campoErpId: linea.campoErpId || undefined,
    loteAppId: linea.loteAppId,
    loteErpId: linea.loteErpId || undefined,
    actividadAppId: linea.actividadAppId,
    actividadErpId: linea.actividadErpId || undefined,
    cultivoErpId: linea.cultivoErpId || undefined,
    padronesSnapshot: mapearPadronesSnapshot(linea.padronesSnapshot),
    destinoReferenciaId: linea.destinoReferenciaId || undefined,
    destinoVenta: linea.destinoVenta,
    destinoVentaManual: linea.destinoVentaManual,
    destinoVentaSnapshot: mapearDestinoVentaSnapshot(linea.destinoVentaSnapshot),
    precioReferenciaId: linea.precioReferenciaId || undefined,
    precioVentaEstimado: linea.precioVentaEstimado,
    precioVentaManual: linea.precioVentaManual,
    precioVentaSnapshot: mapearPrecioVentaSnapshot(linea.precioVentaSnapshot),
    hectareasPlanificadas: linea.hectareasPlanificadas,
    rindeEstimado: linea.rindeEstimado,
    gastosComercialesReferenciaId: linea.gastosComercialesReferenciaId || undefined,
    gastosComercialesEstimados: linea.gastosComercialesEstimados,
    gastosComercialesSnapshot: mapearGastosComercialesSnapshot(linea.gastosComercialesSnapshot),
    protocoloId: linea.protocoloId || undefined,
    protocoloSnapshot: mapearProtocoloSnapshot(linea.protocoloSnapshot),
    ingresoBrutoEstimado: linea.ingresoBrutoEstimado,
    ingresoNetoEstimado: linea.ingresoNetoEstimado,
    costoProduccionEstimado: linea.costoProduccionEstimado,
    margenBrutoEstimado: linea.margenBrutoEstimado,
    margenBrutoActualizado: linea.margenBrutoActualizado ?? undefined,
    estado: linea.estado as PlanificacionAgricolaLinea['estado'],
    createdAt: linea.createdAt.toISOString(),
    updatedAt: linea.updatedAt.toISOString(),
  };
}

function mapearPlanificacion(planificacion: PlanificacionPrisma): PlanificacionAgricola {
  return {
    id: planificacion.id,
    clienteId: planificacion.clienteId,
    campaniaErpId: planificacion.campaniaErpId,
    nombre: planificacion.nombre,
    descripcion: planificacion.descripcion || undefined,
    estado: planificacion.estado as PlanificacionAgricola['estado'],
    escenarioOriginal: planificacion.escenarioOriginal,
    escenarioBloqueadoPorId: planificacion.escenarioBloqueadoPorId || undefined,
    cerradaPor: planificacion.cerradaPor || undefined,
    cerradaAt: serializarFecha(planificacion.cerradaAt),
    motivoCierre: planificacion.motivoCierre || undefined,
    lineas: planificacion.lineas.map(mapearLinea),
    createdAt: planificacion.createdAt.toISOString(),
    updatedAt: planificacion.updatedAt.toISOString(),
  };
}

async function obtenerLotesSuperficieValidacion(
  planificacion: PlanificacionAgricola,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const loteIds = Array.from(new Set(planificacion.lineas.map((linea) => linea.loteAppId).filter(Boolean)));

  if (loteIds.length === 0) {
    return new Map<string, LoteSuperficieValidacion>();
  }

  const lotes = await client.loteApp.findMany({
    where: {
      id: { in: loteIds },
      clienteId: planificacion.clienteId,
    },
    select: {
      id: true,
      nombre: true,
      superficieTotal: true,
    },
  });

  return new Map(lotes.map((lote) => [lote.id, lote]));
}

async function validarPlanificacion(planificacion: PlanificacionAgricola) {
  validarCabeceraPlanificacion(planificacion);
  validarLineasPlanificacion(planificacion, {
    permitirHectareasCero: planificacion.estado === 'borrador',
    lotesPorId: await obtenerLotesSuperficieValidacion(planificacion),
  });
}

async function validarPlanificacionParaCierre(planificacion: PlanificacionAgricola, tx: Prisma.TransactionClient) {
  validarPlanificacionTieneLineasParaCierre(planificacion);
  validarLineasPlanificacion(planificacion, {
    permitirHectareasCero: false,
    lotesPorId: await obtenerLotesSuperficieValidacion(planificacion, tx),
  });
}

const incluirPlanificacion = {
  lineas: {
    orderBy: { createdAt: 'asc' as const },
  },
};

const TAMANO_BLOQUE_LINEAS = 250;
const TIMEOUT_TRANSACCION_PLANIFICACION_MS = 60000;

export async function obtenerPlanificacionesPersistidas(clienteId: string) {
  const registros = await prisma.planificacionAgricola.findMany({
    where: { clienteId },
    include: incluirPlanificacion,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return registros.map(mapearPlanificacion);
}

export async function obtenerPlanificacionPersistida(clienteId: string, planificacionId: string) {
  const registro = await prisma.planificacionAgricola.findFirst({
    where: {
      id: planificacionId,
      clienteId,
    },
    include: incluirPlanificacion,
  });

  return registro ? mapearPlanificacion(registro) : null;
}

export async function obtenerPlanificacionesResumenPersistidas(clienteId: string): Promise<PlanificacionAgricolaResumen[]> {
  const registros = await prisma.planificacionAgricola.findMany({
    where: { clienteId },
    select: {
      id: true,
      clienteId: true,
      campaniaErpId: true,
      nombre: true,
      descripcion: true,
      estado: true,
      escenarioOriginal: true,
      escenarioBloqueadoPorId: true,
      cerradaPor: true,
      cerradaAt: true,
      motivoCierre: true,
      createdAt: true,
      updatedAt: true,
      lineas: {
        select: {
          campoAppId: true,
          loteAppId: true,
          actividadAppId: true,
          protocoloId: true,
          hectareasPlanificadas: true,
          ingresoNetoEstimado: true,
          costoProduccionEstimado: true,
          margenBrutoEstimado: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return registros.map((planificacion) => {
    const claves = new Set<string>();
    let tieneLineasDuplicadas = false;

    for (const linea of planificacion.lineas) {
      const clave = `${planificacion.campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;

      if (claves.has(clave)) {
        tieneLineasDuplicadas = true;
        break;
      }

      claves.add(clave);
    }

    return {
      id: planificacion.id,
      clienteId: planificacion.clienteId,
      campaniaErpId: planificacion.campaniaErpId,
      nombre: planificacion.nombre,
      descripcion: planificacion.descripcion || undefined,
      estado: planificacion.estado as PlanificacionAgricola['estado'],
      escenarioOriginal: planificacion.escenarioOriginal,
      escenarioBloqueadoPorId: planificacion.escenarioBloqueadoPorId || undefined,
      cerradaPor: planificacion.cerradaPor || undefined,
      cerradaAt: serializarFecha(planificacion.cerradaAt),
      motivoCierre: planificacion.motivoCierre || undefined,
      cantidadLineas: planificacion.lineas.length,
      hectareasPlanificadas: planificacion.lineas.reduce((total, linea) => total + (linea.protocoloId ? linea.hectareasPlanificadas : 0), 0),
      ingresoNetoEstimado: planificacion.lineas.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0),
      costoProduccionEstimado: planificacion.lineas.reduce((total, linea) => total + linea.costoProduccionEstimado, 0),
      margenBrutoEstimado: planificacion.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
      tieneLineasDuplicadas,
      createdAt: planificacion.createdAt.toISOString(),
      updatedAt: planificacion.updatedAt.toISOString(),
    };
  });
}

async function reemplazarLineas(tx: Prisma.TransactionClient, planificacion: PlanificacionAgricola) {
  await tx.planificacionAgricolaLinea.deleteMany({ where: { planificacionId: planificacion.id } });

  const lineas = planificacion.lineas.map((lineaOriginal) => {
    const linea = recalcularLineaPlanificacionPersistida(lineaOriginal);

    return {
      id: linea.id,
      planificacionId: planificacion.id,
      empresaErpId: linea.empresaErpId,
      campoAppId: linea.campoAppId,
      campoErpId: linea.campoErpId,
      loteAppId: linea.loteAppId,
      loteErpId: linea.loteErpId,
      actividadAppId: linea.actividadAppId,
      actividadErpId: linea.actividadErpId,
      cultivoErpId: linea.cultivoErpId,
      padronesSnapshot: serializarPadronesSnapshot(linea.padronesSnapshot),
      destinoReferenciaId: linea.destinoReferenciaId,
      destinoVenta: linea.destinoVenta,
      destinoVentaManual: linea.destinoVentaManual,
      destinoVentaSnapshot: serializarDestinoVentaSnapshot(linea.destinoVentaSnapshot),
      precioReferenciaId: linea.precioReferenciaId,
      precioVentaEstimado: linea.precioVentaEstimado,
      precioVentaManual: linea.precioVentaManual,
      precioVentaSnapshot: serializarPrecioVentaSnapshot(linea.precioVentaSnapshot),
      hectareasPlanificadas: linea.hectareasPlanificadas,
      rindeEstimado: linea.rindeEstimado,
      gastosComercialesReferenciaId: linea.gastosComercialesReferenciaId,
      gastosComercialesEstimados: linea.gastosComercialesEstimados,
      gastosComercialesSnapshot: serializarGastosComercialesSnapshot(linea.gastosComercialesSnapshot),
      protocoloId: linea.protocoloId,
      protocoloSnapshot: serializarProtocoloSnapshot(linea.protocoloSnapshot),
      ingresoBrutoEstimado: linea.ingresoBrutoEstimado,
      ingresoNetoEstimado: linea.ingresoNetoEstimado,
      costoProduccionEstimado: linea.costoProduccionEstimado,
      margenBrutoEstimado: linea.margenBrutoEstimado,
      margenBrutoActualizado: linea.margenBrutoActualizado,
      estado: linea.estado,
    };
  });

  for (let inicio = 0; inicio < lineas.length; inicio += TAMANO_BLOQUE_LINEAS) {
    await tx.planificacionAgricolaLinea.createMany({
      data: lineas.slice(inicio, inicio + TAMANO_BLOQUE_LINEAS),
    });
  }
}

function resumirPlanificacionAuditoria(planificacion: PlanificacionAgricola) {
  return {
    id: planificacion.id,
    clienteId: planificacion.clienteId,
    campaniaErpId: planificacion.campaniaErpId,
    nombre: planificacion.nombre,
    estado: planificacion.estado,
    escenarioOriginal: planificacion.escenarioOriginal,
    cantidadLineas: planificacion.lineas.length,
    hectareasPlanificadas: planificacion.lineas.reduce((total, linea) => total + linea.hectareasPlanificadas, 0),
    ingresoNetoEstimado: planificacion.lineas.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0),
    costoProduccionEstimado: planificacion.lineas.reduce((total, linea) => total + linea.costoProduccionEstimado, 0),
    margenBrutoEstimado: planificacion.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
    lineasDuplicadasBloqueadas: 0,
  };
}

export async function guardarPlanificacionPersistida(
  id: string,
  request: GuardarPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarPlanificacionResponse> {
  const planificacion = { ...request.planificacion, id };
  await validarPlanificacion(planificacion);

  return prisma.$transaction((tx) => guardarPlanificacionEnTransaccion(tx, id, request, usuario), {
    maxWait: 10000,
    timeout: TIMEOUT_TRANSACCION_PLANIFICACION_MS,
  });
}

export async function guardarPlanificacionEnTransaccion(
  tx: Prisma.TransactionClient,
  id: string,
  request: GuardarPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarPlanificacionResponse> {
  const planificacion = { ...request.planificacion, id };
  const existente = await tx.planificacionAgricola.findUnique({
    where: { id },
    include: incluirPlanificacion,
  });

  if (existente?.estado === 'cerrada' || existente?.estado === 'deshabilitada') {
    await registrarAuditoria(tx, {
      clienteId: existente.clienteId,
      usuario,
      entidad: 'PlanificacionAgricola',
      entidadId: id,
      accion: 'bloquear_edicion',
      origen: request.origen,
      motivo: request.motivo || `Intento de modificar planificacion ${existente.estado}.`,
      valoresAntes: mapearPlanificacion(existente),
    });

    throw crearErrorValidacion('La planificacion esta cerrada o deshabilitada y no puede modificarse.', 409);
  }

  const escenarioOriginalCerrado = await tx.planificacionAgricola.findFirst({
    where: {
      clienteId: planificacion.clienteId,
      campaniaErpId: planificacion.campaniaErpId,
      estado: 'cerrada',
      escenarioOriginal: true,
      id: { not: id },
    },
  });

  if (escenarioOriginalCerrado) {
    throw crearErrorValidacion('La campania ya tiene una planificacion cerrada como escenario original. No se pueden crear ni editar otros escenarios activos.', 409);
  }

  await tx.planificacionAgricola.upsert({
    where: { id },
    update: {
      campaniaErpId: planificacion.campaniaErpId,
      nombre: planificacion.nombre,
      descripcion: planificacion.descripcion,
      estado: planificacion.estado,
      escenarioOriginal: false,
      escenarioBloqueadoPorId: null,
      updatedBy: usuario?.id,
    },
    create: {
      id,
      clienteId: planificacion.clienteId,
      campaniaErpId: planificacion.campaniaErpId,
      nombre: planificacion.nombre,
      descripcion: planificacion.descripcion,
      estado: planificacion.estado,
      escenarioOriginal: false,
      escenarioBloqueadoPorId: null,
      createdBy: usuario?.id,
      updatedBy: usuario?.id,
    },
  });

  await reemplazarLineas(tx, planificacion);

  const completo = await tx.planificacionAgricola.findUniqueOrThrow({
    where: { id },
    include: incluirPlanificacion,
  });
  const planificacionMapeada = mapearPlanificacion(completo);

  await registrarAuditoria(tx, {
    clienteId: planificacion.clienteId,
    usuario,
    entidad: 'PlanificacionAgricola',
    entidadId: id,
    accion: existente ? 'actualizar' : 'crear',
    origen: request.origen,
    motivo: request.motivo,
    valoresAntes: existente ? resumirPlanificacionAuditoria(mapearPlanificacion(existente)) : undefined,
    valoresDespues: resumirPlanificacionAuditoria(planificacionMapeada),
    metadata: {
      detalle: 'Las lineas se guardan en tabla PlanificacionAgricolaLinea y se audita un resumen para evitar payloads masivos.',
    },
  });

  return {
    planificacion: planificacionMapeada,
    auditado: true,
    mensaje: 'Planificacion guardada con auditoria.',
  };
}

export async function cerrarPlanificacionPersistida(
  id: string,
  request: CerrarPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<CerrarPlanificacionResponse> {
  return prisma.$transaction((tx) => cerrarPlanificacionEnTransaccion(tx, id, request, usuario));
}

export async function cerrarPlanificacionEnTransaccion(
  tx: Prisma.TransactionClient,
  id: string,
  request: CerrarPlanificacionRequest,
  usuario?: UsuarioAuditoria,
): Promise<CerrarPlanificacionResponse> {
  const existente = await tx.planificacionAgricola.findUnique({
    where: { id },
    include: incluirPlanificacion,
  });

  if (!existente) {
    throw crearErrorValidacion('No existe la planificacion a cerrar.', 404);
  }

  if (existente.estado === 'cerrada') {
    throw crearErrorValidacion('La planificacion ya esta cerrada.', 409);
  }

  const planificacionExistente = mapearPlanificacion(existente);
  await validarPlanificacionParaCierre(planificacionExistente, tx);
  const campoIds = Array.from(new Set(planificacionExistente.lineas.map((linea) => linea.campoAppId).filter(Boolean)));
  const loteIds = Array.from(new Set(planificacionExistente.lineas.map((linea) => linea.loteAppId).filter(Boolean)));
  const actividadIds = Array.from(new Set(planificacionExistente.lineas.map((linea) => linea.actividadAppId).filter(Boolean)));
  const cultivoErpIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.cultivoErpId)
    .filter((cultivoErpId): cultivoErpId is string => Boolean(cultivoErpId))));
  const gastosReferenciaIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.gastosComercialesReferenciaId)
    .filter((id): id is string => Boolean(id))));
  const [campos, lotes, actividades, cultivosErp, gastosReferencias] = await Promise.all([
    campoIds.length ? tx.campoApp.findMany({ where: { id: { in: campoIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
    loteIds.length ? tx.loteApp.findMany({ where: { id: { in: loteIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
    actividadIds.length ? tx.actividadApp.findMany({ where: { id: { in: actividadIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
    cultivoErpIds.length ? tx.erpCultivo.findMany({ where: { erpId: { in: cultivoErpIds } } }) : Promise.resolve([]),
    gastosReferenciaIds.length ? tx.gastoComercialApp.findMany({ where: { id: { in: gastosReferenciaIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
  ]);
  const camposPorId = new Map(campos.map((campo) => [campo.id, mapearCampoApp(campo)]));
  const lotesPorId = new Map(lotes.map((lote) => [lote.id, mapearLoteApp(lote)]));
  const actividadesPorId = new Map(actividades.map((actividad) => [actividad.id, mapearActividadApp(actividad)]));
  const cultivosPorErpId = new Map(cultivosErp.map((cultivo) => [cultivo.erpId, mapearCultivoErp(cultivo)]));
  const gastosComercialesPorId = new Map(gastosReferencias.map((gasto) => [gasto.id, mapearGastoComercialReferencia(gasto)]));
  const protocoloIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.protocoloId)
    .filter((protocoloId): protocoloId is string => Boolean(protocoloId))));
  const protocolosDetalle = await obtenerProtocolosDetallePorIds(existente.clienteId, protocoloIds, tx);
  const protocolosPorId = new Map(protocolosDetalle.map((protocolo) => [protocolo.id, protocolo]));
  const destinoIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.destinoReferenciaId)
    .filter((destinoId): destinoId is string => typeof destinoId === 'string' && !destinoId.startsWith('puerto-'))));
  const precioIds = Array.from(new Set(planificacionExistente.lineas
    .map((linea) => linea.precioReferenciaId)
    .filter((precioId): precioId is string => Boolean(precioId))));
  const [destinosReferencia, preciosReferencia] = await Promise.all([
    destinoIds.length ? tx.destinoApp.findMany({ where: { id: { in: destinoIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
    precioIds.length ? tx.precioApp.findMany({ where: { id: { in: precioIds }, clienteId: existente.clienteId } }) : Promise.resolve([]),
  ]);
  const destinosPorId = new Map(destinosReferencia.map((destino) => [destino.id, mapearDestinoReferencia(destino)]));
  const preciosPorId = new Map(preciosReferencia.map((precio) => [precio.id, mapearPrecioReferencia(precio)]));
  const planificacionCongelada = congelarPlanificacionParaCierre(planificacionExistente, gastosComercialesPorId, protocolosPorId, {
    camposPorId,
    lotesPorId,
    actividadesPorId,
    cultivosPorErpId,
    destinosPorId,
    preciosPorId,
  });

  const escenariosADeshabilitar = await tx.planificacionAgricola.findMany({
    where: {
      clienteId: existente.clienteId,
      campaniaErpId: existente.campaniaErpId,
      id: { not: id },
      estado: { not: 'deshabilitada' },
    },
    include: incluirPlanificacion,
  });

  await tx.planificacionAgricola.updateMany({
    where: {
      clienteId: existente.clienteId,
      campaniaErpId: existente.campaniaErpId,
      id: { not: id },
      estado: { not: 'deshabilitada' },
    },
    data: {
      estado: 'deshabilitada',
      escenarioOriginal: false,
      escenarioBloqueadoPorId: id,
      updatedBy: usuario?.id,
    },
  });

  for (const linea of planificacionCongelada.lineas) {
    await tx.planificacionAgricolaLinea.update({
      where: { id: linea.id },
      data: {
        empresaErpId: linea.empresaErpId,
        campoAppId: linea.campoAppId,
        campoErpId: linea.campoErpId,
        loteAppId: linea.loteAppId,
        loteErpId: linea.loteErpId,
        actividadAppId: linea.actividadAppId,
        actividadErpId: linea.actividadErpId,
        cultivoErpId: linea.cultivoErpId,
        padronesSnapshot: serializarPadronesSnapshot(linea.padronesSnapshot),
        destinoReferenciaId: linea.destinoReferenciaId,
        destinoVenta: linea.destinoVenta,
        destinoVentaManual: linea.destinoVentaManual,
        destinoVentaSnapshot: serializarDestinoVentaSnapshot(linea.destinoVentaSnapshot),
        precioReferenciaId: linea.precioReferenciaId,
        precioVentaEstimado: linea.precioVentaEstimado,
        precioVentaManual: linea.precioVentaManual,
        precioVentaSnapshot: serializarPrecioVentaSnapshot(linea.precioVentaSnapshot),
        hectareasPlanificadas: linea.hectareasPlanificadas,
        rindeEstimado: linea.rindeEstimado,
        gastosComercialesReferenciaId: linea.gastosComercialesReferenciaId,
        gastosComercialesEstimados: linea.gastosComercialesEstimados,
        gastosComercialesSnapshot: serializarGastosComercialesSnapshot(linea.gastosComercialesSnapshot),
        protocoloId: linea.protocoloId,
        protocoloSnapshot: serializarProtocoloSnapshot(linea.protocoloSnapshot),
        ingresoBrutoEstimado: linea.ingresoBrutoEstimado,
        ingresoNetoEstimado: linea.ingresoNetoEstimado,
        costoProduccionEstimado: linea.costoProduccionEstimado,
        margenBrutoEstimado: linea.margenBrutoEstimado,
        margenBrutoActualizado: linea.margenBrutoActualizado,
        estado: linea.estado,
      },
    });
  }

  const cerrada = await tx.planificacionAgricola.update({
    where: { id },
    data: {
      estado: 'cerrada',
      escenarioOriginal: true,
      escenarioBloqueadoPorId: null,
      cerradaPor: usuario?.id,
      cerradaAt: new Date(),
      motivoCierre: request.motivo,
      updatedBy: usuario?.id,
    },
    include: incluirPlanificacion,
  });
  const planificacionMapeada = mapearPlanificacion(cerrada);

  await registrarAuditoria(tx, {
    clienteId: existente.clienteId,
    usuario,
    entidad: 'PlanificacionAgricola',
    entidadId: id,
    accion: 'cerrar',
    origen: request.origen,
    motivo: request.motivo,
    valoresAntes: mapearPlanificacion(existente),
    valoresDespues: planificacionMapeada,
  });

  if (escenariosADeshabilitar.length > 0) {
    await registrarAuditoria(tx, {
      clienteId: existente.clienteId,
      usuario,
      entidad: 'PlanificacionAgricola',
      entidadId: id,
      accion: 'deshabilitar_escenarios_alternativos',
      origen: request.origen,
      motivo: request.motivo || 'Cierre de escenario original de campania.',
      valoresAntes: escenariosADeshabilitar.map(mapearPlanificacion),
      valoresDespues: {
        escenarioOriginalId: id,
        escenariosDeshabilitados: escenariosADeshabilitar.map((escenario) => escenario.id),
      },
    });
  }

  return {
    planificacion: planificacionMapeada,
    auditado: true,
    mensaje: escenariosADeshabilitar.length > 0
      ? `Planificacion cerrada como escenario original. Se deshabilitaron ${escenariosADeshabilitar.length} escenario(s) alternativo(s).`
      : 'Planificacion cerrada como escenario original y bloqueada para edicion.',
  };
}
