import { ErpCampania, ErpPadronCampania, ErpRespuestaPaginada } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearAgriculturaCampania(campania: ErpPadronCampania, empresaErpId = 'empresa:mock'): ErpCampania {
  return {
    empresaErpId: 'global',
    erpId: `campania:${campania.idCampania}`,
    idCampania: campania.idCampania,
    codigo: campania.codigo,
    nombre: campania.nombre.trim(),
    activo: campania.activo,
    esActual: campania.esActual,
    actualizadoEn: normalizarFecha(campania.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaAgriculturaCampanias(respuesta: ErpRespuestaPaginada<ErpPadronCampania>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Agricultura/Campanias fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((campania) => mapearAgriculturaCampania(campania, empresaErpId));
}
