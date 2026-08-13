import {
  EmpresaErpCliente,
  ErpEmpresa,
  ErpSnapshot,
  GuardarPlanificacionRequest,
  GuardarPlanificacionResponse,
  GuardarProtocoloRequest,
  GuardarProtocoloResponse,
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

export async function obtenerProtocolosSnapshot(token?: string): Promise<ProtocolosSnapshot> {
  return request<ProtocolosSnapshot>('/planificacion/protocolos/snapshot', {}, token);
}

export async function guardarProtocolo(id: string, datos: GuardarProtocoloRequest, token?: string): Promise<GuardarProtocoloResponse> {
  return request<GuardarProtocoloResponse>(`/planificacion/protocolos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }, token);
}
