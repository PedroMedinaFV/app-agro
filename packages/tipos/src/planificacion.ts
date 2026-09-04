export type EstadoPlanificacionAgricola = 'borrador' | 'en_revision' | 'aprobada' | 'cerrada';

export type EstadoVinculacionPlanificacion = 'provisorio' | 'vinculado_erp' | 'archivado';

export type TipoFechaProtocolo = 'absoluta' | 'relativa_siembra';

export type ZonaPlanificacion = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  zonaErpId?: string;
  nombre: string;
  codigoInterno?: string;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  createdAt: string;
  updatedAt: string;
};

export type CampoPlanificacion = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  campoErpId?: string;
  nombre: string;
  codigoInterno?: string;
  zonaPlanificacionId?: string;
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

export type EspeciePlanificacion = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  especieErpId?: string;
  nombre: string;
  codigoInterno?: string;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  createdAt: string;
  updatedAt: string;
};

export type ActividadPlanificacion = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  actividadErpId?: string;
  especiePlanificacionId?: string;
  especieErpId?: string;
  nombre: string;
  codigoInterno?: string;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  createdAt: string;
  updatedAt: string;
};

export type InsumoPlanificacion = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  insumoErpId?: string;
  nombre: string;
  codigoInterno?: string;
  tipo?: string;
  unidad: string;
  precioUnitarioEstimado?: number;
  moneda?: string;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  createdAt: string;
  updatedAt: string;
};

export type DestinoVentaReferencia = {
  id: string;
  clienteId: string;
  empresaErpId?: string;
  zonaErpId?: string;
  campoPlanificacionId?: string;
  campoErpId?: string;
  actividadPlanificacionId?: string;
  actividadErpId?: string;
  especieErpId?: string;
  cultivoErpId?: string;
  destinoVenta: string;
  destinoVentaNormalizado: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PrecioReferencia = {
  id: string;
  clienteId: string;
  empresaErpId?: string;
  actividadPlanificacionId: string;
  actividadErpId?: string;
  especiePlanificacionId?: string;
  especieErpId?: string;
  cultivoErpId?: string;
  destinoVenta: string;
  valor: number;
  moneda: string;
  unidad: string;
  fuente: string;
  observaciones?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GastoComercialItemReferencia = {
  conceptoGastoComercialId: string;
  conceptoNombre: string;
  valorPorTonelada: number;
  moneda: string;
  observaciones?: string;
};

export type ConceptoGastoComercial = {
  id: string;
  clienteId: string;
  codigo: string;
  nombre: string;
  nombreNormalizado: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GastosComercialesReferencia = {
  id: string;
  clienteId: string;
  campaniaErpId: string;
  empresaErpId: string;
  zonaPlanificacionId?: string;
  zonaErpId?: string;
  campoPlanificacionId?: string;
  campoErpId?: string;
  actividadPlanificacionId: string;
  actividadErpId?: string;
  destinoVenta?: string;
  descripcion: string;
  items: GastoComercialItemReferencia[];
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EstadioFenologicoReferencia = {
  id: string;
  idEstadio: number;
  actividadErpId?: string;
  codigo: string;
  nombre: string;
  ordenCronologico: number;
  empresaErpId?: string;
  activo: boolean;
  origen: 'semilla' | 'erp';
};

export type LaborReferencia = {
  id: string;
  clienteId: string;
  empresaErpId?: string;
  servicioErpId?: string;
  idServicio?: number;
  idTipoServicio?: number;
  codigo: string;
  nombre: string;
  descripcionAbreviada?: string;
  idUnidadMedida?: number;
  idMoneda?: number;
  unidadSugerida: string;
  costoUnitarioSugerido?: number;
  imputaDosis?: boolean;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  activo: boolean;
  origen: 'semilla' | 'provisorio' | 'erp';
  fechaUltimaActualizacionErp?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProtocoloProductivoResumen = {
  id: string;
  clienteId: string;
  nombre: string;
  descripcion: string;
  protocoloOrigenId?: string;
  empresaErpId?: string;
  campaniaErpId: string;
  actividadPlanificacionId: string;
  actividadErpId?: string;
  tipoFecha: TipoFechaProtocolo;
  fechaSiembra?: string;
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
  laborReferenciaId?: string;
  indiceAplicacion: number;
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
  indiceAplicacion: number;
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
  estadioReferenciaId?: string;
  estadioCodigo?: string;
  orden: number;
  nombre: string;
  descripcion?: string;
  fechaObjetivo?: string;
  diasDesdeSiembra?: number;
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
  actividadPlanificacionId: string;
  actividadErpId?: string;
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
  zonasPlanificacion?: ZonaPlanificacion[];
  camposPlanificacion: CampoPlanificacion[];
  lotesPlanificacion: LotePlanificacion[];
  especiesPlanificacion?: EspeciePlanificacion[];
  actividadesPlanificacion?: ActividadPlanificacion[];
  insumosPlanificacion?: InsumoPlanificacion[];
  destinosReferencia: DestinoVentaReferencia[];
  preciosReferencia: PrecioReferencia[];
  conceptosGastosComerciales: ConceptoGastoComercial[];
  gastosComercialesReferencia: GastosComercialesReferencia[];
  estadiosReferencia: EstadioFenologicoReferencia[];
  laboresReferencia: LaborReferencia[];
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

export type GuardarPrecioReferenciaRequest = {
  precio: PrecioReferencia;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarPrecioReferenciaResponse = {
  precio: PrecioReferencia;
  auditado: boolean;
  mensaje: string;
};

export type GuardarDestinoVentaReferenciaRequest = {
  destino: DestinoVentaReferencia;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarDestinoVentaReferenciaResponse = {
  destino: DestinoVentaReferencia;
  auditado: boolean;
  mensaje: string;
};

export type GuardarGastosComercialesReferenciaRequest = {
  gasto: GastosComercialesReferencia;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarGastosComercialesReferenciaResponse = {
  gasto: GastosComercialesReferencia;
  auditado: boolean;
  mensaje: string;
};

export type GuardarConceptoGastoComercialRequest = {
  concepto: ConceptoGastoComercial;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarConceptoGastoComercialResponse = {
  concepto: ConceptoGastoComercial;
  auditado: boolean;
  mensaje: string;
};

export type GuardarLaborReferenciaRequest = {
  labor: LaborReferencia;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarLaborReferenciaResponse = {
  labor: LaborReferencia;
  auditado: boolean;
  mensaje: string;
};

export type GuardarInsumoPlanificacionRequest = {
  insumo: InsumoPlanificacion;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarInsumoPlanificacionResponse = {
  insumo: InsumoPlanificacion;
  auditado: boolean;
  mensaje: string;
};

export type GuardarCampoPlanificacionRequest = {
  campo: CampoPlanificacion;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarCampoPlanificacionResponse = {
  campo: CampoPlanificacion;
  auditado: boolean;
  mensaje: string;
};

export type CerrarPlanificacionRequest = {
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type CerrarPlanificacionResponse = {
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

export type CopiarProtocoloRequest = {
  nombre?: string;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};
