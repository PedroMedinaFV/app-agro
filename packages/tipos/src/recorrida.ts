import type { ObservacionCampo, OrigenObservacion } from './observacion';

export type EstadoRecorridaCampo = 'borrador' | 'en_curso' | 'cerrada' | 'cancelada';

export type ObjetivoRecorridaCampo =
  | 'monitoreo_general'
  | 'plagas'
  | 'malezas'
  | 'enfermedades'
  | 'emergencia'
  | 'cosecha'
  | 'otro';

export type RecorridaCampo = {
  id: string;
  clienteId: string;
  usuarioId?: string;
  campoAppId: string;
  campoErpId?: string;
  loteAppId?: string;
  loteErpId?: string;
  campaniaErpId?: string;
  titulo: string;
  objetivo: ObjetivoRecorridaCampo;
  estado: EstadoRecorridaCampo;
  fechaInicio: string;
  fechaCierre?: string;
  observaciones?: string;
  origen: OrigenObservacion;
  cantidadObservaciones: number;
  severidadMaxima?: 'baja' | 'media' | 'alta';
  createdAt: string;
  updatedAt: string;
};

export type CrearRecorridaCampoRequest = {
  campoAppId: string;
  loteAppId?: string;
  campaniaErpId?: string;
  titulo: string;
  objetivo?: ObjetivoRecorridaCampo;
  estado?: Extract<EstadoRecorridaCampo, 'borrador' | 'en_curso'>;
  fechaInicio: string;
  observaciones?: string;
  origen: OrigenObservacion;
};

export type CrearRecorridaCampoResponse = {
  recorrida: RecorridaCampo;
  auditado: boolean;
  mensaje: string;
};

export type CerrarRecorridaCampoRequest = {
  fechaCierre?: string;
  observaciones?: string;
  origen: OrigenObservacion;
};

export type RecorridasCampoResponse = {
  recorridas: RecorridaCampo[];
};

export type RecorridaCampoDetalleResponse = {
  recorrida: RecorridaCampo;
  observaciones: ObservacionCampo[];
};
