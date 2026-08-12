import { ErpLote, ErpPadronLote, ErpRespuestaPaginada } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearPadronLote(lote: ErpPadronLote, empresaErpId = 'empresa:mock'): ErpLote {
  return {
    empresaErpId,
    erpId: `${empresaErpId}:lote:${lote.idLote}`,
    idLote: lote.idLote,
    idCampo: lote.idCampo,
    campoErpId: `${empresaErpId}:campo:${lote.idCampo}`,
    codigo: lote.codigo,
    nombre: lote.nombre.trim(),
    areaHectareas: lote.hectareas,
    hectareasProductivas: lote.hectareasProductivas,
    admiteGanaderia: lote.admiteGanaderia,
    admiteLecheria: lote.admiteLecheria,
    codigoSima: lote.codigoSima ?? undefined,
    activo: lote.activo,
    actualizadoEn: normalizarFecha(lote.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaPadronesLotes(respuesta: ErpRespuestaPaginada<ErpPadronLote>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Padrones/Lotes fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((lote) => mapearPadronLote(lote, empresaErpId));
}
