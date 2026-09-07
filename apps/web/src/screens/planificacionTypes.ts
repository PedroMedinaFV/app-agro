import {
  CampoPlanificacion,
  ErpSnapshot,
  LotePlanificacion,
  PlanificacionAgricolaLinea,
  PlanificacionSnapshot,
  ProtocoloProductivoResumen,
} from '@agro/tipos';

export type PlanificacionActiva = PlanificacionSnapshot['planificaciones'][number];

export type PlanificacionBaseProps = {
  planificacion: PlanificacionSnapshot;
  snapshot: ErpSnapshot;
  puedeEditarPlanificacion: boolean;
  puedeEditarPlanificacionPorPermiso: boolean;
  puedeCerrarPlanificacion: boolean;
  guardandoPlanificacion: boolean;
  cerrandoPlanificacion: boolean;
  planificacionActiva: PlanificacionActiva | undefined;
  lineasPlanificacion: PlanificacionAgricolaLinea[];
  hectareasPlanificadas: number;
  ingresoNetoTotal: number;
  costoTotal: number;
  margenBrutoTotal: number;
  camposProvisorios: number;
  tieneLineasDuplicadas: boolean;
  clavesDuplicadas: Set<string>;
  camposPlanificacionPorId: Map<string, CampoPlanificacion>;
  lotesPlanificacionPorId: Map<string, LotePlanificacion>;
  protocolosPorId: Map<string, ProtocoloProductivoResumen>;
  seleccionarPlanificacion: (planificacionId: string) => void;
  crearEscenarioPlanificacion: (datos: { nombre: string; campaniaErpId: string; descripcion?: string }) => string | undefined;
  copiarEscenarioPlanificacion: (planificacionId: string) => string | undefined;
  actualizarCabeceraPlanificacion: (updates: Partial<Pick<PlanificacionActiva, 'nombre' | 'descripcion'>>) => void;
  cambiarCampaniaPlanificacion: (campaniaErpId: string) => void;
  agregarLineaPlanificacion: () => void;
  copiarLineaPlanificacion: (lineaId: string) => void;
  guardarBorradorPlanificacion: () => void;
  cerrarPlanificacionActiva: () => void;
  cambiarCampo: (lineaId: string, campoPlanificacionId: string) => void;
  cambiarLote: (lineaId: string, lotePlanificacionId: string) => void;
  cambiarActividad: (lineaId: string, actividadPlanificacionId: string) => void;
  cambiarProtocolo: (lineaId: string, protocoloId?: string) => void;
  cambiarDestino: (lineaId: string, destinoVenta: string) => void;
  actualizarLinea: (lineaId: string, updates: Partial<PlanificacionAgricolaLinea>) => void;
  eliminarLineaPlanificacion: (lineaId: string) => void;
  obtenerProtocolosCompatibles: (linea: PlanificacionAgricolaLinea) => ProtocoloProductivoResumen[];
  formatearUsd: (valor: number) => string;
  leerNumero: (valor: string) => number;
};
