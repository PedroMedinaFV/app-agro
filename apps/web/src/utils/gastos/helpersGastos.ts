import {
  ActividadApp,
  CampoApp,
  ErpActividad,
  ErpCampo,
  ErpEspecie,
  ErpZona,
  ZonaApp,
} from '@agro/tipos';

export type ActividadSeleccionable = {
  clave: string;
  nombre: string;
  empresaErpId?: string;
  actividadAppId?: string;
  actividadErpId?: string;
  especieErpId?: string;
  codigo?: string;
  origen: 'agro' | 'erp';
  erp?: ErpActividad;
};

export type ZonaSeleccionable = {
  clave: string;
  nombre: string;
  codigo?: string;
  zonaAppId?: string;
  zonaErpId?: string;
  idZona?: number;
  origen: 'agro' | 'erp';
};

export type CampoSeleccionable = {
  clave: string;
  nombre: string;
  codigo?: string;
  empresaErpId: string;
  campoAppId?: string;
  campoErpId?: string;
  zonaAppId?: string;
  zonaErpId?: string;
  idZona?: number;
  origen: 'agro' | 'erp';
};

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function normalizarTexto(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function formatearFecha(valor: string) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(valor));
}

export function unirActividadesPropias(actividadesBase: ActividadApp[], actividadesCreadas: ActividadApp[]) {
  const porId = new Map(actividadesBase.map((actividad) => [actividad.id, actividad]));

  for (const actividad of actividadesCreadas) {
    porId.set(actividad.id, actividad);
  }

  return Array.from(porId.values());
}

export function construirActividadesSeleccionables(
  actividadesPropias: ActividadApp[],
  actividadesErp: ErpActividad[],
  especiesErp: ErpEspecie[],
): ActividadSeleccionable[] {
  const especiesErpPorId = new Map(especiesErp.map((especie) => [especie.idEspecie, especie]));
  const actividadesPropiasErpIds = new Set(actividadesPropias.map((actividad) => actividad.actividadErpId).filter(Boolean));
  const propias = actividadesPropias.map((actividad) => ({
    clave: `agro:${actividad.id}`,
    nombre: actividad.nombre,
    empresaErpId: actividad.empresaErpId,
    actividadAppId: actividad.id,
    actividadErpId: actividad.actividadErpId,
    especieErpId: actividad.especieErpId,
    codigo: actividad.codigoInterno,
    origen: 'agro' as const,
  }));
  const erp = actividadesErp
    .filter((actividad) => !actividadesPropiasErpIds.has(actividad.erpId))
    .map((actividad) => ({
      clave: `erp:${actividad.erpId}`,
      nombre: actividad.descripcion,
      empresaErpId: actividad.empresaErpId,
      actividadErpId: actividad.erpId,
      especieErpId: actividad.idEspecie ? especiesErpPorId.get(actividad.idEspecie)?.erpId : undefined,
      codigo: actividad.codigo,
      origen: 'erp' as const,
      erp: actividad,
    }));

  return [...propias, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function construirZonasSeleccionables(zonas: ZonaApp[], zonasErp: ErpZona[]): ZonaSeleccionable[] {
  const zonasPropiasErpIds = new Set(zonas.map((zona) => zona.zonaErpId).filter(Boolean));
  const propias = zonas.map((zona) => ({
    clave: `agro:${zona.id}`,
    nombre: zona.nombre,
    codigo: zona.codigoInterno,
    zonaAppId: zona.id,
    zonaErpId: zona.zonaErpId,
    origen: 'agro' as const,
  }));
  const erp = zonasErp
    .filter((zona) => !zonasPropiasErpIds.has(zona.erpId))
    .map((zona) => ({
      clave: `erp:${zona.erpId}`,
      nombre: zona.nombre,
      codigo: zona.codigo,
      zonaErpId: zona.erpId,
      idZona: zona.idZona,
      origen: 'erp' as const,
    }));

  return [...propias, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function construirCamposSeleccionables(
  campos: CampoApp[],
  camposErp: ErpCampo[],
  zonaSeleccionada?: ZonaSeleccionable,
): CampoSeleccionable[] {
  const camposPropiosErpIds = new Set(campos.map((campo) => campo.campoErpId).filter(Boolean));
  const propios = campos
    .filter((campo) => !zonaSeleccionada || campo.zonaAppId === zonaSeleccionada.zonaAppId || campo.zonaErpId === zonaSeleccionada.zonaErpId)
    .map((campo) => ({
      clave: `agro:${campo.id}`,
      nombre: campo.nombre,
      codigo: campo.codigoInterno,
      empresaErpId: campo.empresaErpId,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      zonaAppId: campo.zonaAppId,
      zonaErpId: campo.zonaErpId,
      origen: 'agro' as const,
    }));
  const erp = camposErp
    .filter((campo) => !camposPropiosErpIds.has(campo.erpId))
    .filter((campo) => !zonaSeleccionada?.idZona || campo.idZona === zonaSeleccionada.idZona)
    .map((campo) => ({
      clave: `erp:${campo.erpId}`,
      nombre: campo.nombre,
      codigo: campo.codigo,
      empresaErpId: campo.empresaErpId,
      campoErpId: campo.erpId,
      zonaErpId: campo.idZona ? `zona:${campo.idZona}` : undefined,
      idZona: campo.idZona,
      origen: 'erp' as const,
    }));

  return [...propios, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
