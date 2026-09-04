import { ErpActividad, ErpPadronActividad, ErpRespuestaPaginada } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearAgriculturaActividad(actividad: ErpPadronActividad, empresaErpId = 'empresa:mock'): ErpActividad {
  return {
    empresaErpId: 'global',
    erpId: `actividad:${actividad.idActividad}`,
    idActividad: actividad.idActividad,
    codigo: actividad.codigo,
    descripcion: actividad.descripcion.trim(),
    activo: actividad.activo,
    habilitadoExportacionCrea: actividad.habilitadoExportacionCrea,
    idEspecie: actividad.idEspecie ?? undefined,
    idTipoActividad: actividad.idTipoActividad ?? undefined,
    actualizadoEn: normalizarFecha(actividad.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaAgriculturaActividades(respuesta: ErpRespuestaPaginada<ErpPadronActividad>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Agricultura/Actividades fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((actividad) => mapearAgriculturaActividad(actividad, empresaErpId));
}
