export type OrigenObservacion = 'web' | 'mobile' | 'api';

export type SeveridadObservacion = 'baja' | 'media' | 'alta';

export type EstadoAdjuntoObservacion = 'pendiente_subida' | 'disponible' | 'rechazado';

export type AdjuntoObservacion = {
  id: string;
  observacionId: string;
  storageBucket: string;
  storagePath: string;
  nombreArchivo: string;
  mimeType: string;
  tamanioBytes: number;
  checksumSha256?: string;
  estado: EstadoAdjuntoObservacion;
  createdAt: string;
  updatedAt: string;
};

export type CrearAdjuntoObservacionInput = {
  storageBucket?: string;
  storagePath: string;
  nombreArchivo: string;
  mimeType: string;
  tamanioBytes: number;
  checksumSha256?: string;
  estado?: EstadoAdjuntoObservacion;
};

export type CrearUrlSubidaAdjuntoRequest = {
  nombreArchivo: string;
  mimeType: string;
  tamanioBytes: number;
  checksumSha256?: string;
};

export type CrearUrlSubidaAdjuntoResponse = {
  storageBucket: string;
  storagePath: string;
  signedUploadUrl: string;
  token?: string;
  expiresAt: string;
};

export type CrearUrlLecturaAdjuntoResponse = {
  signedUrl: string;
  expiresAt: string;
};

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
  adjuntos?: AdjuntoObservacion[];
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
  adjuntos?: CrearAdjuntoObservacionInput[];
};

export type CrearObservacionResponse = {
  observacion: ObservacionCampo;
  auditado: boolean;
  mensaje: string;
};

export type ObservacionesResponse = {
  observaciones: ObservacionCampo[];
};
