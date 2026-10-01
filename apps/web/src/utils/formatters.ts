import type { ProtocoloProductivoDetalle } from '@agro/tipos';

export function formatearUsd(valor: number, decimales = 0) {
  return `USD ${formatearNumero(valor, decimales)}`;
}

export function formatearNumero(valor: number, decimales = 2) {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Number.isFinite(valor) ? valor : 0);
}

export function formatearMoneda(valor: number, moneda = 'USD') {
  const codigo = moneda.trim().toUpperCase() || 'USD';

  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: codigo,
      maximumFractionDigits: 2,
    }).format(valor);
  } catch {
    return `${codigo} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(valor)}`;
  }
}

export function formatearFecha(valor?: string) {
  if (!valor) return '-';

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fecha);
}

export function formatearFechaHora(valor?: string) {
  if (!valor) return '-';

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '-';

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(fecha);
}

export function leerNumero(valor: string) {
  const numero = Number(valor.replace(',', '.'));

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
