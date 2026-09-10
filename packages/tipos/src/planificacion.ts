export type EstadoPlanificacionAgricola = 'borrador' | 'en_revision' | 'aprobada' | 'cerrada' | 'deshabilitada';

export type EstadoVinculacionPlanificacion = 'provisorio' | 'vinculado_erp' | 'archivado';

export type TipoFechaProtocolo = 'absoluta' | 'relativa_siembra';

export type TipoGranoActividad = 'fina' | 'gruesa';

export type TipoCultivoActividad = 'primera' | 'segunda';

export type EpocaSiembraActividad = 'invierno' | 'verano';

export type ZonaApp = {
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

export type CampoApp = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  campoErpId?: string;
  nombre: string;
  codigoInterno?: string;
  zonaAppId?: string;
  zonaErpId?: string;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  createdAt: string;
  updatedAt: string;
};

export type LoteApp = {
  id: string;
  clienteId: string;
  campoAppId: string;
  loteErpId?: string;
  nombre: string;
  codigoInterno?: string;
  superficieTotal: number;
  superficieProductiva: number;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  createdAt: string;
  updatedAt: string;
};

export type EspecieApp = {
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

export type ActividadApp = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  actividadErpId?: string;
  especieAppId?: string;
  especieErpId?: string;
  nombre: string;
  codigoInterno?: string;
  tipoGrano?: TipoGranoActividad;
  tipoCultivo?: TipoCultivoActividad;
  epocaSiembra?: EpocaSiembraActividad;
  estadoVinculacion: EstadoVinculacionPlanificacion;
  createdAt: string;
  updatedAt: string;
};

export type InsumoApp = {
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
  campoAppId?: string;
  campoErpId?: string;
  actividadAppId?: string;
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
  actividadAppId: string;
  actividadErpId?: string;
  especieAppId?: string;
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
  zonaAppId?: string;
  zonaErpId?: string;
  campoAppId?: string;
  campoErpId?: string;
  actividadAppId: string;
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

export type ServicioApp = {
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
  actividadAppId: string;
  actividadErpId?: string;
  tipoFecha: TipoFechaProtocolo;
  fechaSiembra?: string;
  zonaAppId?: string;
  campoAppId?: string;
  costoEstimadoPorHa: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProtocoloLabor = {
  id: string;
  etapaId: string;
  servicioAppId?: string;
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
  insumoAppId: string;
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
  campoAppId: string;
  campoErpId?: string;
  loteAppId: string;
  loteErpId?: string;
  actividadAppId: string;
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
  escenarioOriginal: boolean;
  escenarioBloqueadoPorId?: string;
  cerradaPor?: string;
  cerradaAt?: string;
  motivoCierre?: string;
  lineas: PlanificacionAgricolaLinea[];
  createdAt: string;
  updatedAt: string;
};

export type PlanificacionSnapshot = {
  zonasApp?: ZonaApp[];
  camposApp: CampoApp[];
  lotesApp: LoteApp[];
  especiesApp?: EspecieApp[];
  actividadesApp?: ActividadApp[];
  insumosApp?: InsumoApp[];
  destinosReferencia: DestinoVentaReferencia[];
  preciosReferencia: PrecioReferencia[];
  conceptosGastosComerciales: ConceptoGastoComercial[];
  gastosComercialesReferencia: GastosComercialesReferencia[];
  estadiosReferencia: EstadioFenologicoReferencia[];
  serviciosApp: ServicioApp[];
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

export type GuardarServicioAppRequest = {
  servicio: ServicioApp;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarServicioAppResponse = {
  servicio: ServicioApp;
  auditado: boolean;
  mensaje: string;
};

export type GuardarInsumoAppRequest = {
  insumo: InsumoApp;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarInsumoAppResponse = {
  insumo: InsumoApp;
  auditado: boolean;
  mensaje: string;
};

export type GuardarEspecieAppRequest = {
  especie: EspecieApp;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarEspecieAppResponse = {
  especie: EspecieApp;
  auditado: boolean;
  mensaje: string;
};

export type GuardarActividadAppRequest = {
  actividad: ActividadApp;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarActividadAppResponse = {
  actividad: ActividadApp;
  auditado: boolean;
  mensaje: string;
};

export type GuardarCampoAppRequest = {
  campo: CampoApp;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarCampoAppResponse = {
  campo: CampoApp;
  auditado: boolean;
  mensaje: string;
};

export type GuardarZonaAppRequest = {
  zona: ZonaApp;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarZonaAppResponse = {
  zona: ZonaApp;
  auditado: boolean;
  mensaje: string;
};

export type GuardarLoteAppRequest = {
  lote: LoteApp;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarLoteAppResponse = {
  lote: LoteApp;
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

export type VinculacionErpSugeridaResumen = {
  id: string;
  entidadTipo: string;
  entidadPlanificacionId: string;
  entidadErpId: string;
  empresaErpId: string;
  puntajeCoincidencia: number;
  criterioCoincidencia: unknown;
  estado: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificacionUsuarioResumen = {
  id: string;
  clienteId: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  prioridad: string;
  estado: string;
  vinculacionSugerida?: VinculacionErpSugeridaResumen;
  createdAt: string;
  updatedAt: string;
};

export type ResolverNotificacionVinculacionRequest = {
  decision: 'aceptar' | 'descartar';
  motivo?: string;
};

export type ResolverNotificacionVinculacionResponse = {
  notificacionId: string;
  sugerenciaId: string;
  estadoNotificacion: 'resuelta';
  estadoSugerencia: 'aceptada' | 'descartada';
  auditado: boolean;
  mensaje: string;
};
