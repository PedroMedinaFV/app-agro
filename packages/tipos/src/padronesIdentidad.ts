export const padronesErp = {
  zonas: { modelo: 'ZonaApp', campoErp: 'zonaErpId', prefijo: 'zona-app' },
  campos: { modelo: 'CampoApp', campoErp: 'campoErpId', prefijo: 'campo-app' },
  lotes: { modelo: 'LoteApp', campoErp: 'loteErpId', prefijo: 'lote-app' },
  especies: { modelo: 'EspecieApp', campoErp: 'especieErpId', prefijo: 'especie-app' },
  actividades: { modelo: 'ActividadApp', campoErp: 'actividadErpId', prefijo: 'actividad-app' },
  insumos: { modelo: 'InsumoApp', campoErp: 'insumoErpId', prefijo: 'insumo-app' },
  labores: { modelo: 'ServicioApp', campoErp: 'servicioErpId', prefijo: 'servicio-app' },
} as const;
export type TipoPadronErp = keyof typeof padronesErp;

/** No normalizar nombres para identidad: dos registros homonimos pueden ser distintos. */
export function preferirRegistrosApp<A, E>(propios: A[], erp: E[], idAppErp: (item: A) => string | null | undefined, idErp: (item: E) => string) {
  const representados = new Set(propios.map(idAppErp).filter(Boolean));
  return { propios, erp: erp.filter((item) => !representados.has(idErp(item))) };
}

export function idCopiaPadronErp(prefijo: string, erpId: string, clienteId: string) {
  return `${prefijo}-${encodeURIComponent(clienteId)}:${encodeURIComponent(erpId)}`;
}

export function esCopiaAutomaticaErp(tipo: TipoPadronErp, registro: {
  id: string; clienteId: string; createdBy?: string | null; updatedBy?: string | null;
  [campo: string]: unknown;
}) {
  const { campoErp, prefijo } = padronesErp[tipo];
  const erpId = registro[campoErp];
  if (typeof erpId !== 'string' || registro.createdBy || registro.updatedBy) return false;
  const base = idCopiaPadronErp(prefijo, erpId, registro.clienteId);
  const sufijo = registro.id.slice(base.length + 1);
  return registro.id === `${prefijo}-${erpId.replace(/[^a-zA-Z0-9-]/g, '-')}` || registro.id === base
    || (registro.id.startsWith(`${base}:`) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sufijo));
}

/** Una copia materializada sin ediciones no es un vinculo confirmado por un usuario. */
export function idsErpOcupados<T extends { vinculoAutomatico?: boolean }>(registros: T[], obtenerId: (item: T) => string | null | undefined) {
  return new Set(registros.filter((item) => !item.vinculoAutomatico).map(obtenerId).filter((id): id is string => Boolean(id)));
}

export function actualizarRegistroPadron<T extends { id: string }>(registros: T[], guardado: T, obtenerErpId: (item: T) => string | undefined): T[] {
  const erpId = obtenerErpId(guardado);
  return [guardado, ...registros.filter((item) => item.id !== guardado.id && (!erpId || obtenerErpId(item) !== erpId))];
}
