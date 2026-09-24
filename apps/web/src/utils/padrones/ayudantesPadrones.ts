export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function normalizarCodigo(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function unirPorClave<T>(principales: T[], secundarios: T[], obtenerClave: (item: T) => string | number) {
  const mapa = new Map<string | number, T>();

  for (const item of secundarios) {
    mapa.set(obtenerClave(item), item);
  }

  for (const item of principales) {
    mapa.set(obtenerClave(item), item);
  }

  return [...mapa.values()];
}

export function crearSetVinculados<T>(items: T[], obtenerErpId: (item: T) => string | undefined) {
  return new Set(items.map(obtenerErpId).filter((id): id is string => Boolean(id)));
}

export function crearMapaPorErpId<T>(items: T[], obtenerErpId: (item: T) => string | undefined) {
  return new Map(items.filter((item) => obtenerErpId(item)).map((item) => [obtenerErpId(item), item]));
}
