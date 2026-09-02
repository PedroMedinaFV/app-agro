export type ErpZona = {
  empresaErpId: string;
  erpId: string;
  idZona: number;
  codigo: string;
  nombre: string;
  activo: boolean;
};

export type ErpCampo = {
  empresaErpId: string;
  erpId: string;
  idCampo: number;
  idZona?: number;
  idSubZona?: number;
  codigo: string;
  nombre: string;
  paisCodigo?: string;
  sociedad?: string;
  activo: boolean;
  admiteGanaderia?: boolean;
  domicilio?: string;
  codigoSima?: number;
  idLocalidad?: number;
  actualizadoEn: string;
};

export type ErpRespuestaPaginada<T> = {
  succeeded: boolean;
  message: string | null;
  errors: string[];
  pagination: {
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
  };
  data: T[];
};

export type ErpPadronCampo = {
  idCampo: number;
  idZona: number | null;
  idSubZona: number | null;
  codigo: string;
  nombre: string;
  activo: boolean;
  admiteGanaderia: boolean;
  domicilio: string | null;
  codigoSima: number | null;
  idLocalidad: number | null;
  fechaUltimaActualizacion: string | null;
};

export type ErpPadronZona = {
  idZona: number;
  codigo: string;
  nombre: string;
  activo: boolean;
};

export type ErpPadronLote = {
  idLote: number;
  idCampo: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  admiteGanaderia: boolean;
  admiteLecheria: boolean;
  codigoSima: number | null;
  hectareas: number;
  hectareasProductivas: number;
  fechaUltimaActualizacion: string | null;
};

export type ErpPadronActividad = {
  idActividad: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
  habilitadoExportacionCrea: boolean;
  idEspecie: number | null;
  idTipoActividad: number | null;
  fechaUltimaActualizacion: string | null;
};

export type ErpPadronEspecie = {
  idEspecie: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  codigoCot: string | null;
  codigoAfip: number | null;
  fechaUltimaActualizacion: string | null;
  precios: unknown[];
};

export type ErpPadronEmpresa = {
  idEmpresa: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  cuit: string | null;
  razonSocial: string | null;
  email: string | null;
  fechaUltimaActualizacion: string | null;
};

export type ErpPadronCampania = {
  idCampania: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  esActual: boolean;
  fechaUltimaActualizacion: string | null;
  fechasCampanias: unknown[];
};

export type ErpPadronCultivo = {
  idCultivo: number;
  codigo: string;
  nombre: string;
  idCampo: number;
  idLote: number;
  idActividad: number | null;
  idEspecie: number | null;
  hectareas: number;
  hectareasSembradas: number;
  hectareasCosechadas: number;
  idPuerto: number | null;
  distanciaPuerto: number | null;
  activo: boolean;
  idCampania: number | null;
  idPersonalResponsable: number | null;
  esAgriculturaIntensiva: boolean;
  fechaUltimaActualizacion: string | null;
  socioEnFuncionAportes: boolean;
  socios: unknown[];
  rindes: unknown[];
};

export type ErpPadronInsumo = {
  idInsumo: number;
  idUnidadMedida: number | null;
  idTipoInsumo: number | null;
  idCategoriaInsumo: number | null;
  codigo: string;
  nombre: string;
  activo: boolean;
  controlaStock: boolean;
  esInsumoGenerico: boolean;
  controlaPorLote: boolean;
  precioUnitario: number | null;
  precioUnitarioVenta: number | null;
  unidadesBulto: number | null;
  idMonedaPrecioUnitario: number | null;
  iMonedaPrecioVenta: number | null;
  idCuentaContable: number | null;
  idInsumoBanda: number | null;
  idInsumoEstandar: number | null;
  fechaUltimaActualizacion: string | null;
};

export type ErpPadronServicio = {
  idServicio: number;
  idTipoServicio: number | null;
  codigo: string;
  descripcion: string;
  descripcionAbreviada: string | null;
  idUnidadMedida: number | null;
  idMoneda: number | null;
  precioUnitario: number | null;
  idMonedaPersonal: number | null;
  importePersonal: number | null;
  activo: boolean;
  imputaDosis: boolean;
  fechaUltimaActualizacion: string | null;
};

export type ErpPadronUnidadMedida = {
  idUnidadMedida: number;
  codigo: string;
  codigoSifen: string | null;
  descripcion: string;
  activo: boolean;
  fechaUltimaActualizacion: string | null;
};

export type ErpLote = {
  empresaErpId: string;
  erpId: string;
  idLote: number;
  idCampo: number;
  campoErpId: string;
  codigo: string;
  nombre: string;
  cultivoCodigo?: string;
  cultivoNombre?: string;
  areaHectareas: number;
  hectareasProductivas?: number;
  admiteGanaderia?: boolean;
  admiteLecheria?: boolean;
  codigoSima?: number;
  activo: boolean;
  actualizadoEn: string;
};

export type ErpActividad = {
  empresaErpId: string;
  erpId: string;
  idActividad: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
  habilitadoExportacionCrea: boolean;
  idEspecie?: number;
  idTipoActividad?: number;
  actualizadoEn: string;
};

export type ErpEspecie = {
  empresaErpId: string;
  erpId: string;
  idEspecie: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  codigoCot?: string;
  codigoAfip?: number;
  actualizadoEn: string;
};

export type ErpEmpresa = {
  erpId: string;
  idEmpresa: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  cuit?: string;
  razonSocial?: string;
  email?: string;
  actualizadoEn: string;
};

export type ErpCampania = {
  empresaErpId: string;
  erpId: string;
  idCampania: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  esActual: boolean;
  actualizadoEn: string;
};

export type ErpCultivo = {
  empresaErpId: string;
  erpId: string;
  idCultivo: number;
  codigo: string;
  nombre: string;
  idCampo: number;
  campoErpId: string;
  idLote: number;
  loteErpId: string;
  idActividad?: number;
  actividadErpId?: string;
  idEspecie?: number;
  especieErpId?: string;
  idCampania?: number;
  campaniaErpId?: string;
  hectareas: number;
  hectareasSembradas: number;
  hectareasCosechadas: number;
  idPuerto?: number;
  distanciaPuerto?: number;
  idPersonalResponsable?: number;
  esAgriculturaIntensiva: boolean;
  socioEnFuncionAportes: boolean;
  activo: boolean;
  actualizadoEn: string;
};

export type ErpInsumo = {
  empresaErpId: string;
  erpId: string;
  idInsumo: number;
  idUnidadMedida?: number;
  idTipoInsumo?: number;
  idCategoriaInsumo?: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  controlaStock: boolean;
  esInsumoGenerico: boolean;
  controlaPorLote: boolean;
  precioUnitario?: number;
  precioUnitarioVenta?: number;
  unidadesBulto?: number;
  idMonedaPrecioUnitario?: number;
  idMonedaPrecioVenta?: number;
  idCuentaContable?: number;
  idInsumoBanda?: number;
  idInsumoEstandar?: number;
  actualizadoEn: string;
};

export type ErpServicio = {
  empresaErpId: string;
  erpId: string;
  idServicio: number;
  idTipoServicio?: number;
  codigo: string;
  descripcion: string;
  descripcionAbreviada?: string;
  idUnidadMedida?: number;
  idMoneda?: number;
  precioUnitario?: number;
  idMonedaPersonal?: number;
  importePersonal?: number;
  activo: boolean;
  imputaDosis: boolean;
  actualizadoEn: string;
};

export type ErpUnidadMedida = {
  empresaErpId: string;
  erpId: string;
  idUnidadMedida: number;
  codigo: string;
  codigoSifen?: string;
  descripcion: string;
  activo: boolean;
  actualizadoEn: string;
};

export type ErpSnapshot = {
  zonas: ErpZona[];
  campos: ErpCampo[];
  lotes: ErpLote[];
  actividades: ErpActividad[];
  especies: ErpEspecie[];
  empresas: ErpEmpresa[];
  campanias: ErpCampania[];
  cultivos: ErpCultivo[];
  insumos: ErpInsumo[];
  servicios: ErpServicio[];
  unidadesMedida: ErpUnidadMedida[];
  sincronizadoEn: string;
};

export type ErpAuthMode = 'mock' | 'apiKey' | 'bearer' | 'basic' | 'login';

export type Cliente = {
  id: string;
  nombre: string;
  activo: boolean;
};

export type IntegracionErpPublica = {
  id: string;
  clienteId: string;
  baseUrl?: string;
  authBaseUrl?: string;
  authMode: ErpAuthMode;
  apiKeyHeader: string;
  timeoutMs: number;
  activo: boolean;
  apiKeyConfigurada: boolean;
  bearerTokenConfigurado: boolean;
  basicConfigurado: boolean;
  loginConfigurado: boolean;
  ultimoTestOk?: boolean;
  ultimoTestEn?: string;
  ultimoSyncEn?: string;
  actualizadoEn: string;
};

export type IntegracionErpInput = {
  clienteId: string;
  baseUrl?: string;
  authMode: ErpAuthMode;
  apiKey?: string;
  apiKeyHeader?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  loginKey?: string;
  loginPassword?: string;
  loginApp?: string;
  loginInstallation?: string;
  timeoutMs?: number;
  activo?: boolean;
};

export type AsignacionCampoUsuario = {
  id: string;
  clienteId: string;
  usuarioId: string;
  campoErpId: string;
  asignadoPor?: string;
  createdAt: string;
};

export type AsignarCamposUsuarioInput = {
  usuarioId: string;
  clienteId: string;
  camposErpIds: string[];
};

export type EmpresaErpCliente = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  asignadoPor?: string;
  createdAt: string;
};

export type AsignarEmpresasErpClienteInput = {
  clienteId: string;
  empresasErpIds: string[];
};
