export type TipoOrdenTrabajo =
  | 'aplicacion'
  | 'siembra'
  | 'fertilizacion'
  | 'cosecha'
  | 'laboreo';

export type EstadoOrdenTrabajo =
  | 'borrador'
  | 'aprobada'
  | 'enviada'
  | 'error_envio'
  | 'confirmada'
  | 'cancelada';

export type SemaforoIntegracionOrden = 'gris' | 'verde' | 'amarillo' | 'rojo';

export type SeveridadValidacionOrden = 'bloqueante' | 'advertencia';

export type OrigenOrdenTrabajo = 'planificacion' | 'protocolo' | 'manual' | 'mobile';

export type OrdenTrabajoLote = {
  id: string;
  ordenTrabajoId: string;
  campoAppId: string;
  campoErpId?: string;
  loteAppId: string;
  loteErpId?: string;
  superficieHa: number;
};

export type OrdenTrabajoLabor = {
  id: string;
  ordenTrabajoId: string;
  servicioAppId?: string;
  servicioErpId?: string;
  nombre: string;
  unidad: string;
  cantidadPorHa: number;
  costoUnitario?: number;
  observaciones?: string;
};

export type OrdenTrabajoInsumo = {
  id: string;
  ordenTrabajoId: string;
  insumoAppId?: string;
  insumoErpId?: string;
  nombre: string;
  unidad: string;
  dosisPorHa: number;
  depositoErpId?: string;
  observaciones?: string;
};

export type ValidacionOrdenTrabajo = {
  codigo: string;
  severidad: SeveridadValidacionOrden;
  mensaje: string;
  entidad?: 'orden' | 'lote' | 'labor' | 'insumo';
  entidadId?: string;
};

export type OrdenTrabajo = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  tipo: TipoOrdenTrabajo;
  estado: EstadoOrdenTrabajo;
  semaforoIntegracion: SemaforoIntegracionOrden;
  origen: OrigenOrdenTrabajo;
  planificacionId?: string;
  planificacionLineaId?: string;
  protocoloId?: string;
  campaniaErpId: string;
  actividadAppId?: string;
  actividadErpId?: string;
  nombre: string;
  descripcion?: string;
  fechaProgramada?: string;
  responsableUsuarioId?: string;
  observaciones?: string;
  lotes: OrdenTrabajoLote[];
  labores: OrdenTrabajoLabor[];
  insumos: OrdenTrabajoInsumo[];
  validaciones: ValidacionOrdenTrabajo[];
  alborOrdenId?: string;
  ultimoIntentoEnvioAt?: string;
  ultimoErrorEnvio?: string;
  createdAt: string;
  updatedAt: string;
};

export type SimularOrdenTrabajoRequest = {
  planificacionId?: string;
  planificacionLineaIds?: string[];
  protocoloId?: string;
  tipo?: TipoOrdenTrabajo;
  fechaProgramada?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type SimularOrdenTrabajoResponse = {
  orden: OrdenTrabajo;
  validaciones: ValidacionOrdenTrabajo[];
  puedeAprobar: boolean;
  mensaje: string;
};

export type GuardarOrdenTrabajoRequest = {
  orden: OrdenTrabajo;
  motivo?: string;
  origen: 'web' | 'mobile' | 'api';
};

export type GuardarOrdenTrabajoResponse = {
  orden: OrdenTrabajo;
  auditado: boolean;
  mensaje: string;
};

export type EnviarOrdenTrabajoAlborRequest = {
  motivo?: string;
  origen: 'web' | 'api';
};

export type EnviarOrdenTrabajoAlborResponse = {
  orden: OrdenTrabajo;
  auditado: boolean;
  enviado: boolean;
  mensaje: string;
};
