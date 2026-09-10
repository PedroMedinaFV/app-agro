import { ErpMoneda, ErpPadronMoneda, ErpRespuestaPaginada } from '@agro/tipos';

function normalizarFecha(fecha?: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

function limpiarTexto(valor?: string | null) {
  return (valor || '').trim().replace(/\s+/g, ' ');
}

export function mapearContabilidadMoneda(moneda: ErpPadronMoneda): ErpMoneda {
  const nombre = limpiarTexto(moneda.nombre) || limpiarTexto(moneda.descripcion) || limpiarTexto(moneda.codigo) || `Moneda ${moneda.idMoneda}`;

  return {
    empresaErpId: 'global',
    erpId: `moneda:${moneda.idMoneda}`,
    idMoneda: moneda.idMoneda,
    codigo: limpiarTexto(moneda.codigo) || String(moneda.idMoneda),
    nombre,
    simbolo: limpiarTexto(moneda.simbolo) || undefined,
    activo: moneda.activo ?? true,
    actualizadoEn: normalizarFecha(moneda.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaContabilidadMonedas(respuesta: ErpRespuestaPaginada<ErpPadronMoneda>) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Contabilidad/Monedas fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map(mapearContabilidadMoneda);
}
