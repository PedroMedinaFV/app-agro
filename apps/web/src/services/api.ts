import {
  EmpresaErpCliente,
  ErpEmpresa,
  ErpCampo,
  ErpZona,
  ErpSnapshot,
  CerrarPlanificacionRequest,
  CerrarPlanificacionResponse,
  CampoPlanificacion,
  ConceptoGastoComercial,
  DestinoVentaReferencia,
  GuardarConceptoGastoComercialRequest,
  GuardarConceptoGastoComercialResponse,
  GuardarCampoPlanificacionRequest,
  GuardarCampoPlanificacionResponse,
  GuardarDestinoVentaReferenciaRequest,
  GuardarDestinoVentaReferenciaResponse,
  GuardarGastosComercialesReferenciaRequest,
  GuardarGastosComercialesReferenciaResponse,
  GuardarInsumoPlanificacionRequest,
  GuardarInsumoPlanificacionResponse,
  GuardarLaborReferenciaRequest,
  GuardarLaborReferenciaResponse,
  GuardarPlanificacionRequest,
  GuardarPlanificacionResponse,
  GuardarPrecioReferenciaRequest,
  GuardarPrecioReferenciaResponse,
  GuardarProtocoloRequest,
  GuardarProtocoloResponse,
  LaborReferencia,
  InsumoPlanificacion,
  LoginDemoRequest,
  PlanificacionSnapshot,
  ProtocolosSnapshot,
  SesionUsuario,
} from '@agro/tipos';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request<T>(ruta: string, options: RequestInit = {}, token?: string): Promise<T> {
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
}

export async function loginDemo(datos: LoginDemoRequest): Promise<SesionUsuario> {
  return request<SesionUsuario>('/auth/demo', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function obtenerSnapshotErp(token?: string): Promise<ErpSnapshot> {
  return request<ErpSnapshot>('/erp/snapshot', {}, token);
}

export type CamposErpImportadosResponse = {
  campos: ErpCampo[];
};

export async function obtenerCamposErpImportados(token?: string): Promise<CamposErpImportadosResponse> {
  return request<CamposErpImportadosResponse>('/erp/campos-importados', {}, token);
}

export type ZonasErpImportadasResponse = {
  zonas: ErpZona[];
};

export async function obtenerZonasErpImportadas(token?: string): Promise<ZonasErpImportadasResponse> {
  return request<ZonasErpImportadasResponse>('/erp/zonas-importadas', {}, token);
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

export type InsumosPlanificacionResponse = {
  insumos: InsumoPlanificacion[];
};

export async function obtenerInsumosPlanificacion(token?: string): Promise<InsumosPlanificacionResponse> {
  return request<InsumosPlanificacionResponse>('/insumos-planificacion', {}, token);
}

export async function guardarInsumoPlanificacion(
  id: string,
  datos: GuardarInsumoPlanificacionRequest,
  token?: string,
): Promise<GuardarInsumoPlanificacionResponse> {
  return request<GuardarInsumoPlanificacionResponse>(`/insumos-planificacion/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}

export type CamposPlanificacionResponse = {
  campos: CampoPlanificacion[];
};

export async function obtenerCamposPlanificacion(token?: string): Promise<CamposPlanificacionResponse> {
  return request<CamposPlanificacionResponse>('/campos-planificacion', {}, token);
}

export async function guardarCampoPlanificacion(
  id: string,
  datos: GuardarCampoPlanificacionRequest,
  token?: string,
): Promise<GuardarCampoPlanificacionResponse> {
  return request<GuardarCampoPlanificacionResponse>(`/campos-planificacion/${id}`, {
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
