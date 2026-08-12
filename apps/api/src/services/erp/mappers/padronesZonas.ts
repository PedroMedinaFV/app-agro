import { ErpPadronZona, ErpRespuestaPaginada, ErpZona } from '@agro/tipos';

export function mapearPadronZona(zona: ErpPadronZona, empresaErpId = 'empresa:mock'): ErpZona {
  return {
    empresaErpId,
    erpId: `${empresaErpId}:zona:${zona.idZona}`,
    idZona: zona.idZona,
    codigo: zona.codigo,
    nombre: zona.nombre.trim(),
    activo: zona.activo,
  };
}

export function mapearRespuestaPadronesZonas(respuesta: ErpRespuestaPaginada<ErpPadronZona>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Padrones/Zonas fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((zona) => mapearPadronZona(zona, empresaErpId));
}
