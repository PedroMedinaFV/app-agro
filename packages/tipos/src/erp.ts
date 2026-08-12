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

export type ErpSnapshot = {
  zonas: ErpZona[];
  campos: ErpCampo[];
  lotes: ErpLote[];
  actividades: ErpActividad[];
  especies: ErpEspecie[];
  empresas: ErpEmpresa[];
  sincronizadoEn: string;
};

export type ErpAuthMode = 'mock' | 'apiKey' | 'bearer' | 'basic';

export type Cliente = {
  id: string;
  nombre: string;
  activo: boolean;
};

export type IntegracionErpPublica = {
  id: string;
  clienteId: string;
  baseUrl?: string;
  authMode: ErpAuthMode;
  apiKeyHeader: string;
  timeoutMs: number;
  activo: boolean;
  apiKeyConfigurada: boolean;
  bearerTokenConfigurado: boolean;
  basicConfigurado: boolean;
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
