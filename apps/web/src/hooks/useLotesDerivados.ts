import { useMemo } from 'react';
import type { CampoApp, ErpCampo, ErpEmpresa, ErpLote, LoteApp } from '@agro/tipos';
import {
  construirCamposSeleccionables,
  construirFilasLotes,
  filtrarLotesErp,
  filtrarLotesPropios,
  normalizarCodigo,
} from '../utils/lotes/helpersLotes';
import { sugerirVinculacion } from '../utils/vinculacionSugerida';

type UseLotesDerivadosParams = {
  empresas: ErpEmpresa[];
  camposPropios: CampoApp[];
  camposErp: ErpCampo[];
  lotesPropios: LoteApp[];
  lotesErp: ErpLote[];
  filtro: string;
  filtroCampoClave: string;
  lotePropioParaVincular: LoteApp | null;
};

export function useLotesDerivados({
  empresas,
  camposPropios,
  camposErp,
  lotesPropios,
  lotesErp,
  filtro,
  filtroCampoClave,
  lotePropioParaVincular,
}: UseLotesDerivadosParams) {
  const empresasPorId = useMemo(() => new Map(empresas.map((empresa) => [empresa.erpId, empresa])), [empresas]);
  const camposPropiosPorId = useMemo(() => new Map(camposPropios.map((campo) => [campo.id, campo])), [camposPropios]);
  const camposErpPorId = useMemo(() => new Map(camposErp.map((campo) => [campo.erpId, campo])), [camposErp]);
  const camposSeleccionables = useMemo(
    () => construirCamposSeleccionables(camposPropios, camposErp),
    [camposErp, camposPropios],
  );
  const camposSeleccionablesPorClave = useMemo(
    () => new Map(camposSeleccionables.map((campo) => [campo.clave, campo])),
    [camposSeleccionables],
  );
  const camposParaFiltrar = useMemo(
    () => construirCamposSeleccionables(camposPropios, camposErp, false),
    [camposErp, camposPropios],
  );
  const camposParaFiltrarPorClave = useMemo(
    () => new Map(camposParaFiltrar.map((campo) => [campo.clave, campo])),
    [camposParaFiltrar],
  );
  const lotesVinculados = useMemo(() => (
    new Set(lotesPropios.map((lote) => lote.loteErpId).filter((loteErpId): loteErpId is string => Boolean(loteErpId)))
  ), [lotesPropios]);
  const lotesErpDisponiblesParaVincular = useMemo(() => {
    if (!lotePropioParaVincular) {
      return [];
    }

    const campoPropio = camposPropiosPorId.get(lotePropioParaVincular.campoAppId);

    return lotesErp
      .filter((lote) => !lotesVinculados.has(lote.erpId))
      .filter((lote) => !campoPropio?.campoErpId || campoPropio.campoErpId === lote.campoErpId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [camposPropiosPorId, lotePropioParaVincular, lotesErp, lotesVinculados]);
  const lotesErpSugeridosParaVincular = useMemo(() => (
    lotePropioParaVincular
      ? sugerirVinculacion(
        { codigo: lotePropioParaVincular.codigoInterno, nombre: lotePropioParaVincular.nombre },
        lotesErpDisponiblesParaVincular,
        (registro) => registro.codigo,
        (registro) => registro.nombre,
      )
      : []
  ), [lotePropioParaVincular, lotesErpDisponiblesParaVincular]);
  const filtroNormalizado = normalizarCodigo(filtro);
  const campoFiltrado = filtroCampoClave ? camposParaFiltrarPorClave.get(filtroCampoClave) : undefined;
  const lotesErpFiltrados = filtrarLotesErp(lotesErp, camposErpPorId, empresasPorId, filtroNormalizado, campoFiltrado);
  const lotesPropiosFiltrados = filtrarLotesPropios(lotesPropios, camposPropiosPorId, filtroNormalizado, campoFiltrado);
  const filasLote = construirFilasLotes(lotesPropiosFiltrados, lotesErpFiltrados, camposPropiosPorId, camposErpPorId, lotesVinculados);
  const metricasLotes = useMemo(() => ({
    totalErp: lotesErp.length,
    totalPropios: lotesPropios.length,
    totalProvisorios: lotesPropios.filter((lote) => lote.estadoVinculacion === 'provisorio').length,
    totalVinculados: lotesPropios.filter((lote) => lote.estadoVinculacion === 'vinculado_erp').length,
  }), [lotesErp.length, lotesPropios]);

  return {
    camposPropiosPorId,
    camposErpPorId,
    camposSeleccionables,
    camposSeleccionablesPorClave,
    camposParaFiltrar,
    lotesVinculados,
    lotesErpSugeridosParaVincular,
    filasLote,
    metricasLotes,
  };
}
