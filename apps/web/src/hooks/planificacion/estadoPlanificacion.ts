import type { PlanificacionSnapshot, PlanificacionesResumenResponse } from '@agro/tipos';

export type NotificarPlanificacion = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

export type ModoCargaPlanificacion = boolean | 'resumen' | 'snapshot';

export const planificacionVacia: PlanificacionSnapshot = {
  zonasApp: [],
  camposApp: [],
  lotesApp: [],
  especiesApp: [],
  actividadesApp: [],
  insumosApp: [],
  destinosReferencia: [],
  preciosReferencia: [],
  conceptosGastosComerciales: [],
  gastosComercialesReferencia: [],
  estadiosReferencia: [],
  serviciosApp: [],
  protocolos: [],
  planificaciones: [],
  sincronizadoEn: new Date(0).toISOString(),
};

export const resumenPlanificacionVacio: PlanificacionesResumenResponse = {
  planificaciones: [],
  camposProvisorios: 0,
  sincronizadoEn: new Date(0).toISOString(),
};
