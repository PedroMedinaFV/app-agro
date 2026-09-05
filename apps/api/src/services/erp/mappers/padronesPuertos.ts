import { ErpPadronPuerto, ErpRespuestaPaginada, ErpPuerto } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

function limpiarTexto(valor?: string | null) {
  return (valor || '').trim().replace(/\s+/g, ' ');
}

export function mapearPadronPuerto(puerto: ErpPadronPuerto, empresaErpId = 'empresa:mock'): ErpPuerto {
  const nombre = limpiarTexto(puerto.nombre) || limpiarTexto(puerto.descripcion) || limpiarTexto(puerto.codigo) || `Puerto ${puerto.idPuerto}`;

  return {
    empresaErpId: 'global',
    erpId: `puerto:${puerto.idPuerto}`,
    idPuerto: puerto.idPuerto,
    codigo: limpiarTexto(puerto.codigo) || String(puerto.idPuerto),
    nombre,
    activo: puerto.activo ?? true,
    actualizadoEn: normalizarFecha(puerto.fechaUltimaActualizacion || null),
  };
}

export function mapearRespuestaPadronesPuertos(respuesta: ErpRespuestaPaginada<ErpPadronPuerto>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Padrones/Puertos fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((puerto) => mapearPadronPuerto(puerto, empresaErpId));
}
