export type OrigenPrecipitacion = 'web' | 'mobile' | 'api';

export type PrecipitacionCampo = {
  id: string;
  clienteId: string;
  usuarioId?: string;
  campoAppId: string;
  campoErpId?: string;
  loteAppId?: string;
  loteErpId?: string;
  registroMovilId?: string;
  milimetros: number;
  fechaEvento: string;
  observaciones?: string;
  origen: OrigenPrecipitacion;
  createdAt: string;
  updatedAt: string;
};

export type CrearPrecipitacionRequest = {
  campoAppId: string;
  loteAppId?: string;
  registroMovilId?: string;
  milimetros: number;
  fechaEvento: string;
  observaciones?: string;
  origen: OrigenPrecipitacion;
};

export type CrearPrecipitacionResponse = {
  precipitacion: PrecipitacionCampo;
  auditado: boolean;
  mensaje: string;
};

export type PrecipitacionesResponse = {
  precipitaciones: PrecipitacionCampo[];
};
