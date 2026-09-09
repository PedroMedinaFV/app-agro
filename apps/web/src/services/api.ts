import {
  EmpresaErpCliente,
  ErpActividad,
  ErpEmpresa,
  ErpEspecie,
  ErpCampo,
  ErpInsumo,
  ErpZona,
  ErpLote,
  ErpPuerto,
  ErpServicio,
  ErpSnapshot,
  CerrarPlanificacionRequest,
  CerrarPlanificacionResponse,
  CampoApp,
  ConceptoGastoComercial,
  CrearPrecipitacionRequest,
  CrearPrecipitacionResponse,
  DestinoVentaReferencia,
  GuardarConceptoGastoComercialRequest,
  GuardarConceptoGastoComercialResponse,
  GuardarCampoAppRequest,
  GuardarCampoAppResponse,
  GuardarLoteAppRequest,
  GuardarLoteAppResponse,
  GuardarZonaAppRequest,
  GuardarZonaAppResponse,
  GuardarDestinoVentaReferenciaRequest,
  GuardarDestinoVentaReferenciaResponse,
  GuardarActividadAppRequest,
  GuardarActividadAppResponse,
  GuardarEspecieAppRequest,
  GuardarEspecieAppResponse,
  GuardarGastosComercialesReferenciaRequest,
  GuardarGastosComercialesReferenciaResponse,
  GuardarInsumoAppRequest,
  GuardarInsumoAppResponse,
  GuardarLaborReferenciaRequest,
  GuardarLaborReferenciaResponse,
  GuardarPlanificacionRequest,
  GuardarPlanificacionResponse,
  GuardarPrecioReferenciaRequest,
  GuardarPrecioReferenciaResponse,
  GuardarProtocoloRequest,
  GuardarProtocoloResponse,
  GuardarUsuarioAdminRequest,
  GuardarUsuarioAdminResponse,
  LaborReferencia,
  ActividadApp,
  EspecieApp,
  InsumoApp,
  LoteApp,
  LoginDemoRequest,
  NotificacionUsuarioResumen,
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

export async function obtenerPlanificacionSnapshot(token?: string): Promise<PlanificacionSnapshot> {
  return request<PlanificacionSnapshot>('/planificacion/snapshot', {}, token);
}

export async function guardarPlanificacion(id: string, datos: GuardarPlanificacionRequest, token?: string): Promise<GuardarPlanificacionResponse> {
  return request<GuardarPlanificacionResponse>(`/planificacion/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export async function cerrarPlanificacion(id: string, datos: CerrarPlanificacionRequest, token?: string): Promise<CerrarPlanificacionResponse> {
  return request<CerrarPlanificacionResponse>(`/planificacion/${id}/cerrar`, {
    method: 'POST',
    body: JSON.stringify(datos),
  }, token);
}

export async function guardarPrecioReferencia(id: string, datos: GuardarPrecioReferenciaRequest, token?: string): Promise<GuardarPrecioReferenciaResponse> {
  return request<GuardarPrecioReferenciaResponse>(`/precios-referencia/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export async function guardarGastoComercialReferencia(
  id: string,
  datos: GuardarGastosComercialesReferenciaRequest,
  token?: string,
): Promise<GuardarGastosComercialesReferenciaResponse> {
  return request<GuardarGastosComercialesReferenciaResponse>(`/gastos-comerciales-referencia/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type ConceptosGastosComercialesResponse = {
  conceptos: ConceptoGastoComercial[];
};

export async function obtenerConceptosGastosComerciales(token?: string): Promise<ConceptosGastosComercialesResponse> {
  return request<ConceptosGastosComercialesResponse>('/conceptos-gastos-comerciales', {}, token);
}

export async function guardarConceptoGastoComercial(
  id: string,
  datos: GuardarConceptoGastoComercialRequest,
  token?: string,
): Promise<GuardarConceptoGastoComercialResponse> {
  return request<GuardarConceptoGastoComercialResponse>(`/conceptos-gastos-comerciales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type DestinosVentaResponse = {
  destinos: DestinoVentaReferencia[];
};

export async function obtenerDestinosVenta(token?: string): Promise<DestinosVentaResponse> {
  return request<DestinosVentaResponse>('/destinos-venta', {}, token);
}

export async function guardarDestinoVenta(
  id: string,
  datos: GuardarDestinoVentaReferenciaRequest,
  token?: string,
): Promise<GuardarDestinoVentaReferenciaResponse> {
  return request<GuardarDestinoVentaReferenciaResponse>(`/destinos-venta/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type LaboresReferenciaResponse = {
  labores: LaborReferencia[];
};

export async function obtenerLaboresReferencia(token?: string): Promise<LaboresReferenciaResponse> {
  return request<LaboresReferenciaResponse>('/labores-referencia', {}, token);
}

export async function guardarLaborReferencia(
  id: string,
  datos: GuardarLaborReferenciaRequest,
  token?: string,
): Promise<GuardarLaborReferenciaResponse> {
  return request<GuardarLaborReferenciaResponse>(`/labores-referencia/${id}`, {
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
  return request<GuardarProtocoloResponse>(`/planificacion/protocolos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
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
