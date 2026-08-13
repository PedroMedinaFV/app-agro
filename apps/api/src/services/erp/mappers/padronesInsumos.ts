import { ErpInsumo, ErpPadronInsumo, ErpRespuestaPaginada } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearPadronInsumo(insumo: ErpPadronInsumo, empresaErpId = 'empresa:mock'): ErpInsumo {
  return {
    empresaErpId,
    erpId: `${empresaErpId}:insumo:${insumo.idInsumo}`,
    idInsumo: insumo.idInsumo,
    idUnidadMedida: insumo.idUnidadMedida ?? undefined,
    idTipoInsumo: insumo.idTipoInsumo ?? undefined,
    idCategoriaInsumo: insumo.idCategoriaInsumo ?? undefined,
    codigo: insumo.codigo,
    nombre: insumo.nombre.trim(),
    activo: insumo.activo,
    controlaStock: insumo.controlaStock,
    esInsumoGenerico: insumo.esInsumoGenerico,
    controlaPorLote: insumo.controlaPorLote,
    precioUnitario: insumo.precioUnitario ?? undefined,
    precioUnitarioVenta: insumo.precioUnitarioVenta ?? undefined,
    unidadesBulto: insumo.unidadesBulto ?? undefined,
    idMonedaPrecioUnitario: insumo.idMonedaPrecioUnitario ?? undefined,
    idMonedaPrecioVenta: insumo.iMonedaPrecioVenta ?? undefined,
    idCuentaContable: insumo.idCuentaContable ?? undefined,
    idInsumoBanda: insumo.idInsumoBanda ?? undefined,
    idInsumoEstandar: insumo.idInsumoEstandar ?? undefined,
    actualizadoEn: normalizarFecha(insumo.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaPadronesInsumos(respuesta: ErpRespuestaPaginada<ErpPadronInsumo>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Padrones/Insumos fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((insumo) => mapearPadronInsumo(insumo, empresaErpId));
}
