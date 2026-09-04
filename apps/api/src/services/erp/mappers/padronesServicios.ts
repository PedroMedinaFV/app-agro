import { ErpPadronServicio, ErpRespuestaPaginada, ErpServicio } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearPadronServicio(servicio: ErpPadronServicio, empresaErpId = 'empresa:mock'): ErpServicio {
  return {
    empresaErpId: 'global',
    erpId: `servicio:${servicio.idServicio}`,
    idServicio: servicio.idServicio,
    idTipoServicio: servicio.idTipoServicio ?? undefined,
    codigo: servicio.codigo.trim(),
    descripcion: servicio.descripcion.trim(),
    descripcionAbreviada: servicio.descripcionAbreviada?.trim() || undefined,
    idUnidadMedida: servicio.idUnidadMedida ?? undefined,
    idMoneda: servicio.idMoneda ?? undefined,
    precioUnitario: servicio.precioUnitario ?? undefined,
    idMonedaPersonal: servicio.idMonedaPersonal ?? undefined,
    importePersonal: servicio.importePersonal ?? undefined,
    activo: servicio.activo,
    imputaDosis: servicio.imputaDosis,
    actualizadoEn: normalizarFecha(servicio.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaPadronesServicios(respuesta: ErpRespuestaPaginada<ErpPadronServicio>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Padrones/Servicios fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((servicio) => mapearPadronServicio(servicio, empresaErpId));
}
