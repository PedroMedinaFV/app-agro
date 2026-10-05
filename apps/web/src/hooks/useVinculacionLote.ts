import { useState } from 'react';
import type { CampoApp, ErpLote, LoteApp } from '@agro/tipos';
import { guardarLoteApp } from '../services/api';
import { sugerirVinculacion } from '../utils/vinculacionSugerida';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type UseVinculacionLoteParams = {
  token: string;
  lotesErp: ErpLote[];
  lotesPropios: LoteApp[];
  camposPropios: CampoApp[];
  onLotesPropiosChange: (updater: (lotes: LoteApp[]) => LoteApp[]) => void;
  onEstadoChange: (estado: string) => void;
  notificar?: Notificar;
};

export function useVinculacionLote({
  token,
  lotesErp,
  lotesPropios,
  camposPropios,
  onLotesPropiosChange,
  onEstadoChange,
  notificar,
}: UseVinculacionLoteParams) {
  const [lotePropioParaVincular, setLotePropioParaVincular] = useState<LoteApp | null>(null);
  const [loteErpVincularId, setLoteErpVincularId] = useState('');
  const [guardandoVinculacion, setGuardandoVinculacion] = useState(false);

  function abrirVinculacion(lote: LoteApp) {
    const lotesVinculados = new Set(lotesPropios.map((lotePropio) => lotePropio.loteErpId).filter((loteErpId): loteErpId is string => Boolean(loteErpId)));
    const campoPropio = camposPropios.find((campo) => campo.id === lote.campoAppId);
    const candidatos = sugerirVinculacion(
      { codigo: lote.codigoInterno, nombre: lote.nombre },
      lotesErp
        .filter((loteErp) => !lotesVinculados.has(loteErp.erpId))
        .filter((loteErp) => !campoPropio?.campoErpId || campoPropio.campoErpId === loteErp.campoErpId),
      (registro) => registro.codigo,
      (registro) => registro.nombre,
    );

    if (lote.estadoVinculacion !== 'provisorio' || lote.loteErpId) {
      notificar?.({
        tipo: 'info',
        titulo: 'Lote no vinculable',
        mensaje: 'Solo se pueden vincular lotes propios en estado provisorio.',
      });
      return;
    }

    if (!candidatos.length) {
      notificar?.({
        tipo: 'info',
        titulo: 'No hay lote ERP compatible',
        mensaje: 'No se encontro un lote ERP disponible para vincular con este lote provisorio.',
      });
      return;
    }

    setLotePropioParaVincular(lote);
    setLoteErpVincularId(candidatos[0].registro.erpId);
  }

  function cerrarVinculacion() {
    setLotePropioParaVincular(null);
    setLoteErpVincularId('');
  }

  async function confirmarVinculacionLote() {
    if (!lotePropioParaVincular || !loteErpVincularId) {
      return;
    }

    const loteErp = lotesErp.find((lote) => lote.erpId === loteErpVincularId);

    if (!loteErp) {
      notificar?.({ tipo: 'error', titulo: 'No se encontro el lote ERP', mensaje: 'Actualiza la pantalla e intenta nuevamente.' });
      return;
    }

    setGuardandoVinculacion(true);

    try {
      const respuesta = await guardarLoteApp(lotePropioParaVincular.id, {
        lote: {
          ...lotePropioParaVincular,
          loteErpId: loteErp.erpId,
          estadoVinculacion: 'vinculado_erp',
          updatedAt: new Date().toISOString(),
        },
        origen: 'web',
        motivo: `Vinculacion manual con lote ERP ${loteErp.erpId}`,
      }, token);

      onLotesPropiosChange((actuales) => actuales.map((lote) => (lote.id === respuesta.lote.id ? respuesta.lote : lote)));
      cerrarVinculacion();
      onEstadoChange('Lote vinculado con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Lote vinculado', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular el lote.';
      notificar?.({ tipo: 'error', titulo: 'No se vinculo el lote', mensaje });
    } finally {
      setGuardandoVinculacion(false);
    }
  }

  return {
    lotePropioParaVincular,
    loteErpVincularId,
    guardandoVinculacion,
    abrirVinculacion,
    cerrarVinculacion,
    setLoteErpVincularId,
    confirmarVinculacionLote,
  };
}
