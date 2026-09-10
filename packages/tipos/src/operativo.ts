import type { CampoApp, LoteApp, ZonaApp } from './planificacion';

export type CultivoOperativoResumen = {
  id: string;
  erpId: string;
  nombre: string;
  campaniaNombre?: string;
  actividadNombre?: string;
  hectareas: number;
  hectareasSembradas: number;
  hectareasCosechadas: number;
  activo: boolean;
  actualizadoEn: string;
};

export type PlanificacionOperativaLineaResumen = {
  id: string;
  planificacionId: string;
  planificacionNombre: string;
  estadoPlanificacion: string;
  actividadNombre?: string;
  protocoloNombre?: string;
  destinoVenta: string;
  hectareasPlanificadas: number;
  rindeEstimado: number;
  margenBrutoEstimado: number;
};

export type PrecipitacionOperativaResumen = {
  cantidadRegistros: number;
  milimetrosUltimos30Dias: number;
  ultimoEvento?: string;
};

export type ObservacionOperativaResumen = {
  cantidadRegistros: number;
  cantidadAlta: number;
  ultimas: Array<{
    id: string;
    titulo: string;
    severidad: string;
    fechaEvento: string;
    cantidadAdjuntos: number;
  }>;
};

export type FichaLoteOperativoResponse = {
  campo: CampoApp;
  lote: LoteApp;
  zona?: ZonaApp;
  cultivos: CultivoOperativoResumen[];
  planificaciones: PlanificacionOperativaLineaResumen[];
  precipitaciones: PrecipitacionOperativaResumen;
  observaciones: ObservacionOperativaResumen;
  generadoEn: string;
};
