import { ErpCultivo, ErpPadronCultivo, ErpRespuestaPaginada } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearAgriculturaCultivo(cultivo: ErpPadronCultivo, empresaErpId = 'empresa:mock'): ErpCultivo {
  return {
    empresaErpId,
    erpId: `${empresaErpId}:cultivo:${cultivo.idCultivo}`,
    idCultivo: cultivo.idCultivo,
    codigo: cultivo.codigo,
    nombre: cultivo.nombre.trim(),
    idCampo: cultivo.idCampo,
    campoErpId: `${empresaErpId}:campo:${cultivo.idCampo}`,
    idLote: cultivo.idLote,
    loteErpId: `${empresaErpId}:lote:${cultivo.idLote}`,
    idActividad: cultivo.idActividad ?? undefined,
    actividadErpId: cultivo.idActividad ? `actividad:${cultivo.idActividad}` : undefined,
    idEspecie: cultivo.idEspecie ?? undefined,
    especieErpId: cultivo.idEspecie ? `especie:${cultivo.idEspecie}` : undefined,
    idCampania: cultivo.idCampania ?? undefined,
    campaniaErpId: cultivo.idCampania ? `campania:${cultivo.idCampania}` : undefined,
    hectareas: cultivo.hectareas,
    hectareasSembradas: cultivo.hectareasSembradas,
    hectareasCosechadas: cultivo.hectareasCosechadas,
    idPuerto: cultivo.idPuerto ?? undefined,
    distanciaPuerto: cultivo.distanciaPuerto ?? undefined,
    idPersonalResponsable: cultivo.idPersonalResponsable ?? undefined,
    esAgriculturaIntensiva: cultivo.esAgriculturaIntensiva,
    socioEnFuncionAportes: cultivo.socioEnFuncionAportes,
    activo: cultivo.activo,
    actualizadoEn: normalizarFecha(cultivo.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaAgriculturaCultivos(respuesta: ErpRespuestaPaginada<ErpPadronCultivo>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Agricultura/Cultivos fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((cultivo) => mapearAgriculturaCultivo(cultivo, empresaErpId));
}
