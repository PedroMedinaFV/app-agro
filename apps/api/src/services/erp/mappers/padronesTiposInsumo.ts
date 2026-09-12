import { ErpPadronTipoInsumo, ErpRespuestaPaginada, ErpTipoInsumo } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearPadronTipoInsumo(tipo: ErpPadronTipoInsumo): ErpTipoInsumo {
  return {
    empresaErpId: 'global',
    erpId: `tipo-insumo:${tipo.idTipoInsumo}`,
    idTipoInsumo: tipo.idTipoInsumo,
    codigo: tipo.codigo.trim(),
    codigoCot: tipo.codigoCot?.trim() || undefined,
    codigoSima: tipo.codigoSima ?? undefined,
    descripcion: tipo.descripcion.trim(),
    activo: tipo.activo,
    usaPadronEstandar: tipo.usaPadronEstandar,
    idCuentaContable: tipo.idCuentaContable ?? undefined,
    actualizadoEn: normalizarFecha(tipo.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaPadronesTiposInsumo(respuesta: ErpRespuestaPaginada<ErpPadronTipoInsumo>) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Padrones/TiposInsumo fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map(mapearPadronTipoInsumo);
}
