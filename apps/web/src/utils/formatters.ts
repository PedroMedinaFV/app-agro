import type { ProtocoloProductivoDetalle } from '@agro/tipos';

export function formatearUsd(valor: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function leerNumero(valor: string) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : 0;
}

export function calcularCostoLaborProtocolo(labor: ProtocoloProductivoDetalle['etapas'][number]['labores'][number]) {
  return labor.cantidadPorHa * labor.costoUnitario * labor.indiceAplicacion;
}

export function calcularCostoInsumoProtocolo(insumo: ProtocoloProductivoDetalle['etapas'][number]['insumos'][number]) {
  return insumo.dosisPorHa * insumo.precioUnitarioEstimado * insumo.indiceAplicacion;
}

export function calcularCostoProtocoloWeb(protocolo: ProtocoloProductivoDetalle) {
  return protocolo.etapas.reduce((total, etapa) => {
    const costoLabores = etapa.labores.reduce((subtotal, labor) => subtotal + calcularCostoLaborProtocolo(labor), 0);
    const costoInsumos = etapa.insumos.reduce((subtotal, insumo) => subtotal + calcularCostoInsumoProtocolo(insumo), 0);

    return total + costoLabores + costoInsumos;
  }, 0);
}
