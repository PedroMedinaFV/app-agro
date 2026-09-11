export type AuditoriaEventoResumen = {
  id: string;
  clienteId?: string;
  usuarioId?: string;
  usuarioEmail?: string;
  usuarioNombre?: string;
  entidad: string;
  entidadId: string;
  accion: string;
  origen: string;
  motivo?: string;
  valoresAntes?: unknown;
  valoresDespues?: unknown;
  metadata?: unknown;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

export type AuditoriaEventosResponse = {
  eventos: AuditoriaEventoResumen[];
  total: number;
  limite: number;
};
