import { ErpPadronTipoServicio, ErpRespuestaPaginada, ErpTipoServicio } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearPadronTipoServicio(tipo: ErpPadronTipoServicio): ErpTipoServicio {
  return {
    empresaErpId: 'global',
    erpId: `tipo-servicio:${tipo.idTipoServicio}`,
    idTipoServicio: tipo.idTipoServicio,
    codigo: tipo.codigo.trim(),
    descripcion: tipo.descripcion.trim(),
    exigeInsumo: tipo.exigeInsumo,
    disponibleOt: tipo.disponibleOt,
    disponibleCompras: tipo.disponibleCompras,
    disponibleVentas: tipo.disponibleVentas,
    categoria: tipo.categoria?.trim() || undefined,
    idCuentaContable: tipo.idCuentaContable ?? undefined,
    actualizadoEn: normalizarFecha(tipo.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaPadronesTiposServicio(respuesta: ErpRespuestaPaginada<ErpPadronTipoServicio>) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Padrones/TiposServicio fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map(mapearPadronTipoServicio);
}
