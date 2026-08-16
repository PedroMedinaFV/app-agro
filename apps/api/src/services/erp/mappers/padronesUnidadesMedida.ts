import { ErpPadronUnidadMedida, ErpRespuestaPaginada, ErpUnidadMedida } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearPadronUnidadMedida(unidad: ErpPadronUnidadMedida, empresaErpId = 'empresa:mock'): ErpUnidadMedida {
  return {
    empresaErpId,
    erpId: `${empresaErpId}:unidad-medida:${unidad.idUnidadMedida}`,
    idUnidadMedida: unidad.idUnidadMedida,
    codigo: unidad.codigo,
    codigoSifen: unidad.codigoSifen || undefined,
    descripcion: unidad.descripcion,
    activo: unidad.activo,
    actualizadoEn: normalizarFecha(unidad.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaPadronesUnidadesMedida(respuesta: ErpRespuestaPaginada<ErpPadronUnidadMedida>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Padrones/UnidadesMedidas fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((unidad) => mapearPadronUnidadMedida(unidad, empresaErpId));
}
