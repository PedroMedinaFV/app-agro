export type OrigenPrecipitacion = 'web' | 'mobile' | 'api';

export type PrecipitacionCampo = {
  id: string;
  clienteId: string;
  usuarioId?: string;
  campoPlanificacionId: string;
  campoErpId?: string;
  lotePlanificacionId?: string;
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
  campoPlanificacionId: string;
  lotePlanificacionId?: string;
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
