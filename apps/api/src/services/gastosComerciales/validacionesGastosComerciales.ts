import type { GastoComercialItemReferencia, GastosComercialesReferencia } from '@agro/tipos';

export function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function validarItemGastoComercial(item: GastoComercialItemReferencia, indice: number) {
  if (!item.conceptoGastoComercialId.trim()) {
    throw crearErrorValidacion(`El item ${indice + 1} debe seleccionar concepto de gasto comercial.`);
  }

  if (!item.conceptoNombre.trim()) {
    throw crearErrorValidacion(`El item ${indice + 1} debe conservar el nombre del concepto.`);
  }

  if (item.valorPorTonelada < 0) {
    throw crearErrorValidacion(`El item ${indice + 1} no puede tener valor negativo.`);
  }

  if (item.unidadCalculo !== 'Tn' && item.unidadCalculo !== 'Ha') {
    throw crearErrorValidacion(`El item ${indice + 1} debe tener unidad Tn o Ha.`);
  }

  if (!item.moneda.trim()) {
    throw crearErrorValidacion(`El item ${indice + 1} debe tener moneda.`);
  }
}

export function validarGastoComercial(gasto: GastosComercialesReferencia) {
  if (!gasto.clienteId) {
    throw crearErrorValidacion('Los gastos comerciales deben tener clienteId.');
  }

  if (!gasto.empresaErpId) {
    throw crearErrorValidacion('Los gastos comerciales deben tener empresaErpId.');
  }

  if (!gasto.campaniaErpId) {
    throw crearErrorValidacion('Los gastos comerciales deben tener campaniaErpId.');
  }

  if (!gasto.actividadAppId) {
    throw crearErrorValidacion('Los gastos comerciales deben tener actividadAppId.');
  }

  if (!gasto.descripcion.trim()) {
    throw crearErrorValidacion('Los gastos comerciales deben tener descripcion.');
  }

  if (!gasto.items.length) {
    throw crearErrorValidacion('Los gastos comerciales deben tener al menos un item.');
  }

  gasto.items.forEach(validarItemGastoComercial);
}

export function prepararGastoComercial(gasto: GastosComercialesReferencia): GastosComercialesReferencia {
  return {
    ...gasto,
    destinoVenta: gasto.destinoVenta ? limpiarTextoVisible(gasto.destinoVenta) : undefined,
    campaniaErpId: limpiarTextoVisible(gasto.campaniaErpId),
    descripcion: limpiarTextoVisible(gasto.descripcion),
    items: gasto.items.map((item) => ({
      ...item,
      conceptoGastoComercialId: limpiarTextoVisible(item.conceptoGastoComercialId),
      conceptoNombre: limpiarTextoVisible(item.conceptoNombre),
      unidadCalculo: item.unidadCalculo || 'Tn',
      moneda: limpiarTextoVisible(item.moneda).toUpperCase(),
      observaciones: item.observaciones ? limpiarTextoVisible(item.observaciones) : undefined,
    })),
  };
}
