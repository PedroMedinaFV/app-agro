import type { CampoApp, ErpCampo, ErpEmpresa, ErpLote, LoteApp, LoteArchivoGeografico } from '@agro/tipos';
import type { CampoSeleccionable } from '../../components/lotes/tiposLotes';

export type LoteTabla = {
  id: string;
  nombre: string;
  detalle: string;
  campo: string;
  superficie: string;
  origen: string;
  estado: string;
  accion: 'editar' | 'importado';
  lotePropio?: LoteApp;
  loteErp?: ErpLote;
};

export function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

export function normalizarCodigo(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function crearLoteNuevo(clienteId: string, campoAppId: string): LoteApp {
  const ahora = new Date().toISOString();

  return {
    id: `lote-app-${Date.now()}`,
    clienteId,
    campoAppId,
    nombre: '',
    codigoInterno: '',
    superficieTotal: 0,
    superficieProductiva: 0,
    estadoVinculacion: 'provisorio',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

export function crearIdCampoDesdeErp(campoErpId: string) {
  return `campo-app-${campoErpId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

export function crearIdArchivoGeografico() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `lote-geo-${crypto.randomUUID()}`;
  }

  return `lote-geo-${Date.now()}`;
}

export function obtenerMimeArchivoGeografico(archivo: File) {
  const nombre = archivo.name.toLowerCase();

  if (archivo.type) {
    return archivo.type;
  }

  if (nombre.endsWith('.kml')) {
    return 'application/vnd.google-earth.kml+xml';
  }

  if (nombre.endsWith('.kmz')) {
    return 'application/vnd.google-earth.kmz';
  }

  return 'application/octet-stream';
}

export function obtenerTipoArchivoGeografico(archivo: File): LoteArchivoGeografico['tipo'] | undefined {
  const nombre = archivo.name.toLowerCase();

  if (nombre.endsWith('.kml')) {
    return 'kml';
  }

  if (nombre.endsWith('.kmz')) {
    return 'kmz';
  }

  return undefined;
}

export function construirCamposSeleccionables(
  camposPropios: CampoApp[],
  camposErp: ErpCampo[],
  excluirCamposErpVinculados = true,
): CampoSeleccionable[] {
  const camposVinculados = new Set(camposPropios.map((campo) => campo.campoErpId).filter(Boolean));
  const propios = camposPropios.map((campo) => ({
    clave: `agro:${campo.id}`,
    campoAppId: campo.id,
    campoErpId: campo.campoErpId,
    empresaErpId: campo.empresaErpId,
    codigo: campo.codigoInterno,
    nombre: campo.nombre,
    origen: 'agro' as const,
  }));
  const importados = camposErp
    .filter((campo) => !excluirCamposErpVinculados || !camposVinculados.has(campo.erpId))
    .map((campo) => ({
      clave: `erp:${campo.erpId}`,
      campoErpId: campo.erpId,
      empresaErpId: campo.empresaErpId,
      codigo: campo.codigo,
      nombre: campo.nombre,
      origen: 'erp' as const,
    }));

  return [...propios, ...importados].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function filtrarLotesErp(
  lotesErp: ErpLote[],
  camposErpPorId: Map<string, ErpCampo>,
  empresasPorId: Map<string, ErpEmpresa>,
  filtroNormalizado: string,
  campoFiltrado?: CampoSeleccionable,
) {
  return lotesErp.filter((lote) => {
    const campo = camposErpPorId.get(lote.campoErpId);
    const texto = normalizarCodigo(`${lote.codigo} ${lote.nombre} ${campo?.nombre || ''} ${empresasPorId.get(lote.empresaErpId)?.nombre || lote.empresaErpId}`);
    const coincideCampo = !campoFiltrado || lote.campoErpId === campoFiltrado.campoErpId;

    return texto.includes(filtroNormalizado) && coincideCampo;
  });
}

export function filtrarLotesPropios(
  lotesPropios: LoteApp[],
  camposPropiosPorId: Map<string, CampoApp>,
  filtroNormalizado: string,
  campoFiltrado?: CampoSeleccionable,
) {
  return lotesPropios.filter((lote) => !lote.loteErpId).filter((lote) => {
    const campo = camposPropiosPorId.get(lote.campoAppId);
    const texto = normalizarCodigo(`${lote.codigoInterno || ''} ${lote.nombre} ${campo?.nombre || ''}`);
    const coincideCampo = !campoFiltrado
      || lote.campoAppId === campoFiltrado.campoAppId
      || Boolean(campoFiltrado.campoErpId && campo?.campoErpId === campoFiltrado.campoErpId);

    return texto.includes(filtroNormalizado) && coincideCampo;
  });
}

export function construirFilasLotes(
  lotesPropiosFiltrados: LoteApp[],
  lotesErpFiltrados: ErpLote[],
  camposPropiosPorId: Map<string, CampoApp>,
  camposErpPorId: Map<string, ErpCampo>,
  lotesVinculados: Set<string>,
): LoteTabla[] {
  return [
    ...lotesPropiosFiltrados.map((lote) => {
      const campo = camposPropiosPorId.get(lote.campoAppId);

      return {
        id: lote.id,
        nombre: lote.nombre,
        detalle: lote.codigoInterno || 'Sin codigo interno',
        campo: campo?.nombre || 'Campo no disponible',
        superficie: `${lote.superficieProductiva} / ${lote.superficieTotal} ha`,
        origen: 'Agro App',
        estado: lote.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP',
        accion: 'editar' as const,
        lotePropio: lote,
      };
    }),
    ...lotesErpFiltrados.map((lote) => {
      const campo = camposErpPorId.get(lote.campoErpId);

      return {
        id: lote.erpId,
        nombre: lote.nombre,
        detalle: `${lote.codigo} - x-company ${lote.empresaErpId.replace('empresa:', '')}`,
        campo: campo?.nombre || `Campo ${lote.idCampo}`,
        superficie: `${lote.hectareasProductivas ?? lote.areaHectareas} / ${lote.areaHectareas} ha`,
        origen: 'ERP',
        estado: lotesVinculados.has(lote.erpId) ? 'Vinculado' : 'Disponible',
        accion: 'importado' as const,
        loteErp: lote,
      };
    }),
  ];
}
