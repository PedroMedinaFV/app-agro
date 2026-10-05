import { useEffect, useState } from 'react';
import type { CampoApp, ErpCampo, ErpLote, LoteApp } from '@agro/tipos';
import {
  obtenerCamposApp,
  obtenerCamposErpImportados,
  obtenerLotesApp,
  obtenerLotesErpImportados,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type UseLotesDatosParams = {
  token: string;
  camposPropiosIniciales: CampoApp[];
  notificar?: Notificar;
};

export function useLotesDatos({ token, camposPropiosIniciales, notificar }: UseLotesDatosParams) {
  const [lotesErp, setLotesErp] = useState<ErpLote[]>([]);
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [camposPropiosActuales, setCamposPropiosActuales] = useState<CampoApp[]>(camposPropiosIniciales);
  const [lotesPropios, setLotesPropios] = useState<LoteApp[]>([]);
  const [estado, setEstado] = useState('Cargando lotes sincronizados.');

  useEffect(() => {
    async function cargarLotes() {
      try {
        const [respuestaLotesErp, respuestaCamposErp, respuestaCamposPropios, respuestaLotesPropios] = await Promise.all([
          obtenerLotesErpImportados(token),
          obtenerCamposErpImportados(token),
          obtenerCamposApp(token),
          obtenerLotesApp(token),
        ]);

        setLotesErp(respuestaLotesErp.lotes);
        setCamposErp(respuestaCamposErp.campos);
        setCamposPropiosActuales(respuestaCamposPropios.campos);
        setLotesPropios(respuestaLotesPropios.lotes);
        setEstado('Lotes cargados desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los lotes.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron lotes', mensaje });
      }
    }

    cargarLotes();
  }, [token, notificar]);

  return {
    lotesErp,
    camposErp,
    camposPropiosActuales,
    lotesPropios,
    estado,
    setCamposPropiosActuales,
    setLotesPropios,
    setEstado,
  };
}
