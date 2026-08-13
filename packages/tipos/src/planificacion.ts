export type EstadoPlanificacionAgricola = 'borrador' | 'en_revision' | 'aprobada' | 'cerrada';

export type EstadoVinculacionPlanificacion = 'provisorio' | 'vinculado_erp' | 'archivado';

export type CampoPlanificacion = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  campoErpId?: string;
  nombre: string;
  codigoInterno?: string;
  zonaErpId?: string;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  createdAt: string;
  updatedAt: string;
};

export type LotePlanificacion = {
  id: string;
  clienteId: string;
  campoPlanificacionId: string;
  loteErpId?: string;
  nombre: string;
  codigoInterno?: string;
  superficieTotal: number;
  superficieProductiva: number;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  createdAt: string;
  updatedAt: string;
};

export type DestinoVentaReferencia = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  zonaErpId?: string;
  campoPlanificacionId?: string;
  campoErpId?: string;
  actividadErpId: string;
  especieErpId?: string;
  cultivoErpId?: string;
  destinoVenta: string;
  descripcion?: string;
  prioridad: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TipoPrecioReferencia = 'planificado' | 'mercado' | 'forward' | 'fijado' | 'estimado' | 'manual';

export type PrecioReferencia = {
  id: string;
  clienteId: string;
  campaniaErpId: string;
  empresaErpId?: string;
  actividadErpId: string;
  especieErpId: string;
  cultivoErpId?: string;
  destinoVenta: string;
  tipoPrecio: TipoPrecioReferencia;
  valor: number;
  moneda: string;
  unidad: string;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta?: string;
  fuente: string;
  observaciones?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GastoComercialItemReferencia = {
  concepto: string;
  tipoCalculo: 'por_ha' | 'por_tn' | 'porcentaje_ingreso' | 'importe_fijo';
  valor: number;
  moneda: string;
  unidad?: string;
};

export type GastosComercialesReferencia = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  zonaErpId?: string;
  campoPlanificacionId?: string;
  campoErpId?: string;
  actividadErpId: string;
  destinoVenta?: string;
  descripcion: string;
  items: GastoComercialItemReferencia[];
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProtocoloProductivoResumen = {
  id: string;
  clienteId: string;
  nombre: string;
  descripcion: string;
  protocoloOrigenId?: string;
  actividadErpId: string;
  especieErpId?: string;
  zonaErpId?: string;
  zonaPlanificacionId?: string;
  campoPlanificacionId?: string;
  costoEstimadoPorHa: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProtocoloLabor = {
  id: string;
  etapaId: string;
  nombre: string;
  descripcion?: string;
  unidad: string;
  cantidadPorHa: number;
  costoUnitario: number;
  costoPorHa: number;
  momentoEstimado?: string;
};

export type ProtocoloInsumo = {
  id: string;
  etapaId: string;
  insumoPlanificacionId: string;
  insumoErpId?: string;
  nombre: string;
  tipo?: string;
  unidad: string;
  dosisPorHa: number;
  precioUnitarioEstimado: number;
  costoPorHa: number;
  momentoEstimado?: string;
};

export type ProtocoloEtapa = {
  id: string;
  protocoloId: string;
  orden: number;
  nombre: string;
  descripcion?: string;
  observaciones?: string;
  labores: ProtocoloLabor[];
  insumos: ProtocoloInsumo[];
};

export type ProtocoloProductivoDetalle = ProtocoloProductivoResumen & {
  etapas: ProtocoloEtapa[];
};

export type PlanificacionAgricolaLinea = {
  id: string;
  planificacionId: string;
  empresaErpId: string;
  campoPlanificacionId: string;
  campoErpId?: string;
  lotePlanificacionId: string;
  loteErpId?: string;
  actividadErpId: string;
  cultivoErpId?: string;
  destinoReferenciaId?: string;
  destinoVenta: string;
  destinoVentaManual: boolean;
  precioReferenciaId?: string;
  precioVentaEstimado: number;
  precioVentaManual: boolean;
  hectareasPlanificadas: number;
  rindeEstimado: number;
  gastosComercialesReferenciaId?: string;
  gastosComercialesEstimados: number;
  protocoloId?: string;
  ingresoBrutoEstimado: number;
  ingresoNetoEstimado: number;
  costoProduccionEstimado: number;
  margenBrutoEstimado: number;
  margenBrutoActualizado?: number;
  estado: EstadoPlanificacionAgricola;
  createdAt: string;
  updatedAt: string;
};

export type PlanificacionAgricola = {
  id: string;
  clienteId: string;
  campaniaErpId: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoPlanificacionAgricola;
  cerradaPor?: string;
  cerradaAt?: string;
  motivoCierre?: string;
  lineas: PlanificacionAgricolaLinea[];
  createdAt: string;
  updatedAt: string;
};

export type PlanificacionSnapshot = {
  camposPlanificacion: CampoPlanificacion[];
  lotesPlanificacion: LotePlanificacion[];
  destinosReferencia: DestinoVentaReferencia[];
  preciosReferencia: PrecioReferencia[];
  gastosComercialesReferencia: GastosComercialesReferencia[];
  protocolos: ProtocoloProductivoResumen[];
  planificaciones: PlanificacionAgricola[];
  sincronizadoEn: string;
};

export type GuardarPlanificacionRequest = {
  planificacion: PlanificacionAgricola;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarPlanificacionResponse = {
  planificacion: PlanificacionAgricola;
  auditado: boolean;
  mensaje: string;
};

export type ProtocolosSnapshot = {
  protocolos: ProtocoloProductivoDetalle[];
  sincronizadoEn: string;
};

export type GuardarProtocoloRequest = {
  protocolo: ProtocoloProductivoDetalle;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarProtocoloResponse = {
  protocolo: ProtocoloProductivoDetalle;
  auditado: boolean;
  mensaje: string;
};
