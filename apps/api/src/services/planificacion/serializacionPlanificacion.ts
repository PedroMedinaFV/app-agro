import type {
  ActividadApp,
  CampoApp,
  DestinoApp,
  DestinoVentaLineaSnapshot,
  ErpCultivo,
  GastoComercialItemReferencia,
  GastosComercialesLineaSnapshot,
  GastosComercialesReferencia,
  LoteApp,
  PadronesLineaSnapshot,
  PlanificacionAgricola,
  PlanificacionAgricolaLinea,
  PrecioReferencia,
  PrecioVentaLineaSnapshot,
  ProtocoloLineaSnapshot,
} from '@agro/tipos';
import type { Prisma } from '@prisma/client';

export function serializarFecha(fecha?: Date | string | null) {
  if (!fecha) {
    return undefined;
  }

  return fecha instanceof Date ? fecha.toISOString() : fecha;
}

function mapearGastosComercialesSnapshot(valor: Prisma.JsonValue | null): GastosComercialesLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as GastosComercialesLineaSnapshot;
}

export function serializarGastosComercialesSnapshot(snapshot?: GastosComercialesLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

function mapearPadronesSnapshot(valor: Prisma.JsonValue | null): PadronesLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as PadronesLineaSnapshot;
}

export function serializarPadronesSnapshot(snapshot?: PadronesLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

function mapearDestinoVentaSnapshot(valor: Prisma.JsonValue | null): DestinoVentaLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as DestinoVentaLineaSnapshot;
}

export function serializarDestinoVentaSnapshot(snapshot?: DestinoVentaLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

function mapearPrecioVentaSnapshot(valor: Prisma.JsonValue | null): PrecioVentaLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as PrecioVentaLineaSnapshot;
}

export function serializarPrecioVentaSnapshot(snapshot?: PrecioVentaLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

function mapearProtocoloSnapshot(valor: Prisma.JsonValue | null): ProtocoloLineaSnapshot | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return undefined;
  }

  return valor as unknown as ProtocoloLineaSnapshot;
}

export function serializarProtocoloSnapshot(snapshot?: ProtocoloLineaSnapshot) {
  return snapshot ? snapshot as unknown as Prisma.InputJsonValue : undefined;
}

export function mapearCampoApp(campo: {
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

export function mapearLoteApp(lote: {
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

export function mapearActividadApp(actividad: {
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

export function mapearCultivoErp(cultivo: {
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

export function mapearDestinoReferencia(destino: {
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

export function mapearPrecioReferencia(precio: {
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

export function mapearGastoComercialReferencia(gasto: {
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

export function mapearPlanificacion(planificacion: PlanificacionPrisma): PlanificacionAgricola {
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

