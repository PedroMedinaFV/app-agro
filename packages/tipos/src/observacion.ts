export type OrigenObservacion = 'web' | 'mobile' | 'api';

export type SeveridadObservacion = 'baja' | 'media' | 'alta';

export type ObservacionCampo = {
  id: string;
  clienteId: string;
  usuarioId?: string;
  campoAppId: string;
  campoErpId?: string;
  loteAppId?: string;
  loteErpId?: string;
  registroMovilId?: string;
  titulo: string;
  descripcion: string;
  severidad: SeveridadObservacion;
  latitud?: number;
  longitud?: number;
  fechaEvento: string;
  origen: OrigenObservacion;
  createdAt: string;
  updatedAt: string;
};

export type CrearObservacionRequest = {
  campoAppId: string;
  loteAppId?: string;
  registroMovilId?: string;
  titulo: string;
  descripcion: string;
  severidad?: SeveridadObservacion;
  latitud?: number;
  longitud?: number;
  fechaEvento: string;
  origen: OrigenObservacion;
};

export type CrearObservacionResponse = {
  observacion: ObservacionCampo;
  auditado: boolean;
  mensaje: string;
};

export type ObservacionesResponse = {
  observaciones: ObservacionCampo[];
};
