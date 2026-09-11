import {
  EmpresaErpCliente,
  ErpActividad,
  ErpEmpresa,
  ErpEspecie,
  ErpCampo,
  ErpCampania,
  ErpInsumo,
  ErpMoneda,
  ErpZona,
  ErpLote,
  ErpPuerto,
  ErpServicio,
  ErpSnapshot,
  FichaLoteOperativoResponse,
  CerrarPlanificacionRequest,
  CerrarPlanificacionResponse,
  CampoApp,
  ConceptoGastoComercial,
  CrearPrecipitacionRequest,
  CrearPrecipitacionResponse,
  CrearObservacionRequest,
  CrearObservacionResponse,
  CrearUrlLecturaAdjuntoResponse,
  CrearUrlSubidaAdjuntoRequest,
  CrearUrlSubidaAdjuntoResponse,
  DestinoApp,
  GuardarConceptoGastoComercialRequest,
  GuardarConceptoGastoComercialResponse,
  GuardarCampoAppRequest,
  GuardarCampoAppResponse,
  GuardarLoteAppRequest,
  GuardarLoteAppResponse,
  GuardarZonaAppRequest,
  GuardarZonaAppResponse,
  GuardarDestinoAppRequest,
  GuardarDestinoAppResponse,
  GuardarActividadAppRequest,
  GuardarActividadAppResponse,
  GuardarEspecieAppRequest,
  GuardarEspecieAppResponse,
  GuardarGastosComercialesReferenciaRequest,
  GuardarGastosComercialesReferenciaResponse,
  GuardarInsumoAppRequest,
  GuardarInsumoAppResponse,
  GuardarServicioAppRequest,
  GuardarServicioAppResponse,
  GuardarPlanificacionRequest,
  GuardarPlanificacionResponse,
  GuardarPrecioReferenciaRequest,
  GuardarPrecioReferenciaResponse,
  GuardarProtocoloRequest,
  GuardarProtocoloResponse,
  GuardarUsuarioAdminRequest,
  GuardarUsuarioAdminResponse,
  ServicioApp,
  ActividadApp,
  EspecieApp,
  InsumoApp,
  LoteApp,
  LoginDemoRequest,
  NotificacionUsuarioResumen,
  ObservacionesResponse,
  PadronErpSincronizable,
  PlanificacionSnapshot,
  PrecipitacionesResponse,
  ProtocolosSnapshot,
  ResolverNotificacionVinculacionRequest,
  ResolverNotificacionVinculacionResponse,
  SesionUsuario,
  SincronizacionesErpHistorialResponse,
  UsuariosAdminResponse,
  ZonaApp,
} from '@agro/tipos';
import { startBackendActivity } from '../utils/backendActivity';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request<T>(ruta: string, options: RequestInit = {}, token?: string): Promise<T> {
  const method = options.method || 'GET';
  const finishBackendActivity = startBackendActivity(getBackendActivityLabel(ruta, method));

  try {
    const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const contenido = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error((contenido as { error?: string; detalle?: string }).detalle || (contenido as { error?: string }).error || 'La solicitud fallo');
    }

    return contenido as T;
  } finally {
    finishBackendActivity();
  }
}

function getBackendActivityLabel(ruta: string, method: string) {
  const metodo = method.toUpperCase();

  if (ruta.startsWith('/auth/')) {
    return 'Iniciando sesion...';
  }

  if (ruta.includes('/sincronizar')) {
    return 'Sincronizando padrones...';
  }

  if (ruta.includes('/cerrar')) {
    return 'Cerrando planificacion...';
  }

  if (metodo === 'GET') {
    return 'Cargando datos...';
  }

  if (metodo === 'DELETE') {
    return 'Eliminando registro...';
  }

  return 'Guardando cambios...';
}

export async function loginDemo(datos: LoginDemoRequest): Promise<SesionUsuario> {
  return request<SesionUsuario>('/auth/demo', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function loginMicrosoft(idToken: string): Promise<SesionUsuario> {
  return request<SesionUsuario>('/auth/microsoft', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export async function obtenerSnapshotErp(token?: string): Promise<ErpSnapshot> {
  return request<ErpSnapshot>('/erp/snapshot', {}, token);
}

export type SincronizacionErpResultado = {
  ok: boolean;
  resultado: {
    zonas: number;
    campos: number;
    lotes: number;
    actividades: number;
    especies: number;
    empresas: number;
    campanias: number;
    cultivos: number;
    insumos: number;
    servicios: number;
    unidadesMedida: number;
    monedas: number;
    puertos: number;
    omitidos: {
      lotesSinCampo: number;
    };
    sugerenciasVinculacion?: {
      detectadas: number;
      creadas: number;
    };
    sincronizadoEn: string;
  };
};

export async function sincronizarPadronesErp(token?: string, items?: PadronErpSincronizable[]): Promise<SincronizacionErpResultado> {
  return request<SincronizacionErpResultado>('/erp/sincronizar', {
    method: 'POST',
    body: JSON.stringify({ items }),
  }, token);
}

export async function obtenerHistorialSincronizacionesErp(token?: string): Promise<SincronizacionesErpHistorialResponse> {
  return request<SincronizacionesErpHistorialResponse>('/erp/sincronizaciones', {}, token);
}

export type CamposErpImportadosResponse = {
  campos: ErpCampo[];
};

export async function obtenerCamposErpImportados(token?: string): Promise<CamposErpImportadosResponse> {
  return request<CamposErpImportadosResponse>('/erp/campos-importados', {}, token);
}

export type LotesErpImportadosResponse = {
  lotes: ErpLote[];
};

export async function obtenerLotesErpImportados(token?: string): Promise<LotesErpImportadosResponse> {
  return request<LotesErpImportadosResponse>('/erp/lotes-importados', {}, token);
}

export type ZonasErpImportadasResponse = {
  zonas: ErpZona[];
};

export async function obtenerZonasErpImportadas(token?: string): Promise<ZonasErpImportadasResponse> {
  return request<ZonasErpImportadasResponse>('/erp/zonas-importadas', {}, token);
}

export type EspeciesErpImportadasResponse = {
  especies: ErpEspecie[];
};

export async function obtenerEspeciesErpImportadas(token?: string): Promise<EspeciesErpImportadasResponse> {
  return request<EspeciesErpImportadasResponse>('/erp/especies-importadas', {}, token);
}

export type ActividadesErpImportadasResponse = {
  actividades: ErpActividad[];
};

export async function obtenerActividadesErpImportadas(token?: string): Promise<ActividadesErpImportadasResponse> {
  return request<ActividadesErpImportadasResponse>('/erp/actividades-importadas', {}, token);
}

export type CampaniasErpImportadasResponse = {
  campanias: ErpCampania[];
};

let campaniasErpCache: { token?: string; respuesta: CampaniasErpImportadasResponse } | null = null;
let campaniasErpEnVuelo: { token?: string; promesa: Promise<CampaniasErpImportadasResponse> } | null = null;

export async function obtenerCampaniasErpImportadas(token?: string, opciones: { forzar?: boolean } = {}): Promise<CampaniasErpImportadasResponse> {
  const cache = campaniasErpCache;
  const enVuelo = campaniasErpEnVuelo;

  if (!opciones.forzar && cache && cache.token === token) {
    return cache.respuesta;
  }

  if (!opciones.forzar && enVuelo && enVuelo.token === token) {
    return enVuelo.promesa;
  }

  const promesa = request<CampaniasErpImportadasResponse>('/erp/campanias-importadas', {}, token)
    .then((respuesta) => {
      campaniasErpCache = { token, respuesta };
      return respuesta;
    })
    .finally(() => {
      if (campaniasErpEnVuelo?.promesa === promesa) {
        campaniasErpEnVuelo = null;
      }
    });

  campaniasErpEnVuelo = { token, promesa };

  return promesa;
}

export type InsumosErpImportadosResponse = {
  insumos: ErpInsumo[];
};

export async function obtenerInsumosErpImportados(token?: string): Promise<InsumosErpImportadosResponse> {
  return request<InsumosErpImportadosResponse>('/erp/insumos-importados', {}, token);
}

export type ServiciosErpImportadosResponse = {
  servicios: ErpServicio[];
};

export async function obtenerServiciosErpImportados(token?: string): Promise<ServiciosErpImportadosResponse> {
  return request<ServiciosErpImportadosResponse>('/erp/servicios-importados', {}, token);
}

export type PuertosErpImportadosResponse = {
  puertos: ErpPuerto[];
};

export type MonedasErpImportadasResponse = {
  monedas: ErpMoneda[];
};

export async function obtenerMonedasErpImportadas(token?: string): Promise<MonedasErpImportadasResponse> {
  return request<MonedasErpImportadasResponse>('/erp/monedas-importadas', {}, token);
}

export async function obtenerPuertosErpImportados(token?: string): Promise<PuertosErpImportadosResponse> {
  return request<PuertosErpImportadosResponse>('/erp/puertos-importados', {}, token);
}

export type EmpresasErpAdminResponse = {
  empresas: ErpEmpresa[];
  seleccionadas: EmpresaErpCliente[];
};

export async function obtenerEmpresasErpAdmin(clienteId: string, token?: string): Promise<EmpresasErpAdminResponse> {
  return request<EmpresasErpAdminResponse>(`/admin/empresas-erp/${clienteId}/empresas`, {}, token);
}

export async function guardarEmpresasErpAdmin(clienteId: string, empresasErpIds: string[], token?: string) {
  return request<EmpresaErpCliente[]>(`/admin/empresas-erp/${clienteId}/empresas`, {
    method: 'PUT',
    body: JSON.stringify({ empresasErpIds }),
  }, token);
}

let planificacionSnapshotCache: { token?: string; respuesta: PlanificacionSnapshot } | null = null;
let planificacionSnapshotEnVuelo: { token?: string; promesa: Promise<PlanificacionSnapshot> } | null = null;

export function invalidarPlanificacionSnapshotCache() {
  planificacionSnapshotCache = null;
}

export async function obtenerPlanificacionSnapshot(token?: string, opciones: { forzar?: boolean } = {}): Promise<PlanificacionSnapshot> {
  const cache = planificacionSnapshotCache;
  const enVuelo = planificacionSnapshotEnVuelo;

  if (!opciones.forzar && cache && cache.token === token) {
    return cache.respuesta;
  }

  if (!opciones.forzar && enVuelo && enVuelo.token === token) {
    return enVuelo.promesa;
  }

  const promesa = request<PlanificacionSnapshot>('/planificacion/snapshot', {}, token)
    .then((respuesta) => {
      planificacionSnapshotCache = { token, respuesta };
      return respuesta;
    })
    .finally(() => {
      if (planificacionSnapshotEnVuelo?.promesa === promesa) {
        planificacionSnapshotEnVuelo = null;
      }
    });

  planificacionSnapshotEnVuelo = { token, promesa };

  return promesa;
}

export async function obtenerFichaLoteOperativo(loteAppId: string, token?: string): Promise<FichaLoteOperativoResponse> {
  return request<FichaLoteOperativoResponse>(`/operativo/lotes/${loteAppId}/ficha`, {}, token);
}

export async function guardarPlanificacion(id: string, datos: GuardarPlanificacionRequest, token?: string): Promise<GuardarPlanificacionResponse> {
  const respuesta = await request<GuardarPlanificacionResponse>(`/planificacion/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
  invalidarPlanificacionSnapshotCache();

  return respuesta;
}

export async function cerrarPlanificacion(id: string, datos: CerrarPlanificacionRequest, token?: string): Promise<CerrarPlanificacionResponse> {
  const respuesta = await request<CerrarPlanificacionResponse>(`/planificacion/${id}/cerrar`, {
    method: 'POST',
    body: JSON.stringify(datos),
  }, token);
  invalidarPlanificacionSnapshotCache();

  return respuesta;
}

export async function guardarPrecioReferencia(id: string, datos: GuardarPrecioReferenciaRequest, token?: string): Promise<GuardarPrecioReferenciaResponse> {
  const respuesta = await request<GuardarPrecioReferenciaResponse>(`/precios-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
  invalidarDestinosVentaCache();
  invalidarPlanificacionSnapshotCache();

  return respuesta;
}

export async function guardarGastoComercialReferencia(
  id: string,
  datos: GuardarGastosComercialesReferenciaRequest,
  token?: string,
): Promise<GuardarGastosComercialesReferenciaResponse> {
  return request<GuardarGastosComercialesReferenciaResponse>(`/gastos-comerciales-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type ConceptosGastosComercialesResponse = {
  conceptos: ConceptoGastoComercial[];
};

export async function obtenerConceptosGastosComerciales(token?: string): Promise<ConceptosGastosComercialesResponse> {
  return request<ConceptosGastosComercialesResponse>('/conceptos-gastos-comerciales-app', {}, token);
}

export async function guardarConceptoGastoComercial(
  id: string,
  datos: GuardarConceptoGastoComercialRequest,
  token?: string,
): Promise<GuardarConceptoGastoComercialResponse> {
  return request<GuardarConceptoGastoComercialResponse>(`/conceptos-gastos-comerciales-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type DestinosVentaResponse = {
  destinos: DestinoApp[];
};

let destinosVentaCache: { token?: string; respuesta: DestinosVentaResponse } | null = null;
let destinosVentaEnVuelo: { token?: string; promesa: Promise<DestinosVentaResponse> } | null = null;

export function invalidarDestinosVentaCache() {
  destinosVentaCache = null;
}

export async function obtenerDestinosVenta(token?: string, opciones: { forzar?: boolean } = {}): Promise<DestinosVentaResponse> {
  const cache = destinosVentaCache;
  const enVuelo = destinosVentaEnVuelo;

  if (!opciones.forzar && cache && cache.token === token) {
    return cache.respuesta;
  }

  if (!opciones.forzar && enVuelo && enVuelo.token === token) {
    return enVuelo.promesa;
  }

  const promesa = request<DestinosVentaResponse>('/destinos-venta', {}, token)
    .then((respuesta) => {
      destinosVentaCache = { token, respuesta };
      return respuesta;
    })
    .finally(() => {
      if (destinosVentaEnVuelo?.promesa === promesa) {
        destinosVentaEnVuelo = null;
      }
    });

  destinosVentaEnVuelo = { token, promesa };

  return promesa;
}

export async function guardarDestinoVenta(
  id: string,
  datos: GuardarDestinoAppRequest,
  token?: string,
): Promise<GuardarDestinoAppResponse> {
  const respuesta = await request<GuardarDestinoAppResponse>(`/destinos-venta/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
  invalidarDestinosVentaCache();
  invalidarPlanificacionSnapshotCache();

  return respuesta;
}

export type ServiciosAppResponse = {
  servicios: ServicioApp[];
};

export async function obtenerServiciosApp(token?: string): Promise<ServiciosAppResponse> {
  return request<ServiciosAppResponse>('/servicios-app', {}, token);
}

export async function guardarServicioApp(
  id: string,
  datos: GuardarServicioAppRequest,
  token?: string,
): Promise<GuardarServicioAppResponse> {
  return request<GuardarServicioAppResponse>(`/servicios-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type InsumosAppResponse = {
  insumos: InsumoApp[];
};

export async function obtenerInsumosApp(token?: string): Promise<InsumosAppResponse> {
  return request<InsumosAppResponse>('/insumos-app', {}, token);
}

export async function guardarInsumoApp(
  id: string,
  datos: GuardarInsumoAppRequest,
  token?: string,
): Promise<GuardarInsumoAppResponse> {
  return request<GuardarInsumoAppResponse>(`/insumos-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type EspeciesAppResponse = {
  especies: EspecieApp[];
};

export async function obtenerEspeciesApp(token?: string): Promise<EspeciesAppResponse> {
  return request<EspeciesAppResponse>('/especies-app', {}, token);
}

export async function guardarEspecieApp(
  id: string,
  datos: GuardarEspecieAppRequest,
  token?: string,
): Promise<GuardarEspecieAppResponse> {
  return request<GuardarEspecieAppResponse>(`/especies-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type ActividadesAppResponse = {
  actividades: ActividadApp[];
};

export async function obtenerActividadesApp(token?: string): Promise<ActividadesAppResponse> {
  return request<ActividadesAppResponse>('/actividades-app', {}, token);
}

export async function guardarActividadApp(
  id: string,
  datos: GuardarActividadAppRequest,
  token?: string,
): Promise<GuardarActividadAppResponse> {
  return request<GuardarActividadAppResponse>(`/actividades-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type CamposAppResponse = {
  campos: CampoApp[];
};

export async function obtenerCamposApp(token?: string): Promise<CamposAppResponse> {
  return request<CamposAppResponse>('/campos-app', {}, token);
}

export type ZonasAppResponse = {
  zonas: ZonaApp[];
};

export async function obtenerZonasApp(token?: string): Promise<ZonasAppResponse> {
  return request<ZonasAppResponse>('/zonas-app', {}, token);
}

export async function guardarZonaApp(
  id: string,
  datos: GuardarZonaAppRequest,
  token?: string,
): Promise<GuardarZonaAppResponse> {
  return request<GuardarZonaAppResponse>(`/zonas-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export async function guardarCampoApp(
  id: string,
  datos: GuardarCampoAppRequest,
  token?: string,
): Promise<GuardarCampoAppResponse> {
  return request<GuardarCampoAppResponse>(`/campos-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type LotesAppResponse = {
  lotes: LoteApp[];
};

export async function obtenerLotesApp(token?: string): Promise<LotesAppResponse> {
  return request<LotesAppResponse>('/lotes-app', {}, token);
}

export async function guardarLoteApp(
  id: string,
  datos: GuardarLoteAppRequest,
  token?: string,
): Promise<GuardarLoteAppResponse> {
  return request<GuardarLoteAppResponse>(`/lotes-app/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export async function obtenerProtocolosSnapshot(token?: string): Promise<ProtocolosSnapshot> {
  return request<ProtocolosSnapshot>('/planificacion/protocolos/snapshot', {}, token);
}

export async function guardarProtocolo(id: string, datos: GuardarProtocoloRequest, token?: string): Promise<GuardarProtocoloResponse> {
  const respuesta = await request<GuardarProtocoloResponse>(`/planificacion/protocolos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
  invalidarPlanificacionSnapshotCache();

  return respuesta;
}

export type NotificacionesResponse = {
  notificaciones: NotificacionUsuarioResumen[];
};

export async function obtenerNotificaciones(token?: string): Promise<NotificacionesResponse> {
  return request<NotificacionesResponse>('/notificaciones', {}, token);
}

export type GenerarSugerenciasVinculacionResponse = {
  detectadas: number;
  creadas: number;
};

export async function generarSugerenciasVinculacion(token?: string): Promise<GenerarSugerenciasVinculacionResponse> {
  return request<GenerarSugerenciasVinculacionResponse>('/notificaciones/vinculaciones/generar', {
    method: 'POST',
  }, token);
}

export async function resolverNotificacionVinculacion(
  id: string,
  datos: ResolverNotificacionVinculacionRequest,
  token?: string,
): Promise<ResolverNotificacionVinculacionResponse> {
  return request<ResolverNotificacionVinculacionResponse>(`/notificaciones/${id}/resolver-vinculacion`, {
    method: 'POST',
    body: JSON.stringify(datos),
  }, token);
}

export async function obtenerPrecipitaciones(token?: string): Promise<PrecipitacionesResponse> {
  return request<PrecipitacionesResponse>('/precipitaciones', {}, token);
}

export async function crearPrecipitacion(datos: CrearPrecipitacionRequest, token?: string): Promise<CrearPrecipitacionResponse> {
  return request<CrearPrecipitacionResponse>('/precipitaciones', {
    method: 'POST',
    body: JSON.stringify(datos),
  }, token);
}

export async function obtenerObservaciones(token?: string): Promise<ObservacionesResponse> {
  return request<ObservacionesResponse>('/observaciones', {}, token);
}

export async function crearObservacion(datos: CrearObservacionRequest, token?: string): Promise<CrearObservacionResponse> {
  return request<CrearObservacionResponse>('/observaciones', {
    method: 'POST',
    body: JSON.stringify(datos),
  }, token);
}

export async function crearUrlSubidaAdjuntoObservacion(
  datos: CrearUrlSubidaAdjuntoRequest,
  token?: string,
): Promise<CrearUrlSubidaAdjuntoResponse> {
  return request<CrearUrlSubidaAdjuntoResponse>('/observaciones/adjuntos/upload-url', {
    method: 'POST',
    body: JSON.stringify(datos),
  }, token);
}

export async function subirArchivoAFirmaSupabase(signedUploadUrl: string, archivo: File) {
  const finishBackendActivity = startBackendActivity('Subiendo adjunto...');

  try {
    const respuesta = await fetch(signedUploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': archivo.type,
      },
      body: archivo,
    });

    if (!respuesta.ok) {
      throw new Error('No se pudo subir el adjunto al storage.');
    }
  } finally {
    finishBackendActivity();
  }
}

export async function crearUrlLecturaAdjuntoObservacion(
  adjuntoId: string,
  token?: string,
): Promise<CrearUrlLecturaAdjuntoResponse> {
  return request<CrearUrlLecturaAdjuntoResponse>(`/observaciones/adjuntos/${adjuntoId}/signed-url`, {
    method: 'POST',
  }, token);
}

export async function obtenerUsuariosAdmin(token?: string): Promise<UsuariosAdminResponse> {
  return request<UsuariosAdminResponse>('/usuarios', {}, token);
}

export async function guardarUsuarioAdmin(
  id: string,
  datos: GuardarUsuarioAdminRequest,
  token?: string,
): Promise<GuardarUsuarioAdminResponse> {
  return request<GuardarUsuarioAdminResponse>(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export async function guardarCamposUsuarioAdmin(clienteId: string, usuarioId: string, camposErpIds: string[], token?: string) {
  return request(`/admin/asignaciones/${clienteId}/usuarios/${usuarioId}/campos`, {
    method: 'PUT',
    body: JSON.stringify({ camposErpIds }),
  }, token);
}
