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
    let cancelado = false;

    async function cargarDatosApp() {
      try {
        const [respuestaCamposPropios, respuestaLotesPropios] = await Promise.all([
          obtenerCamposApp(token),
          obtenerLotesApp(token),
        ]);

        if (cancelado) {
          return;
        }

        setCamposPropiosActuales(respuestaCamposPropios.campos);
        setLotesPropios(respuestaLotesPropios.lotes);
        setEstado('Lotes propios cargados. Cargando lotes ERP sincronizados.');
      } catch (error) {
        if (cancelado) {
          return;
        }

        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los lotes propios.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron lotes propios', mensaje });
      }
    }

    async function cargarDatosErp() {
      try {
        const [respuestaLotesErp, respuestaCamposErp] = await Promise.all([
          obtenerLotesErpImportados(token),
          obtenerCamposErpImportados(token),
        ]);

        if (cancelado) {
          return;
        }

        setLotesErp(respuestaLotesErp.lotes);
        setCamposErp(respuestaCamposErp.campos);
      } catch (error) {
        if (cancelado) {
          return;
        }

        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los lotes ERP.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron lotes ERP', mensaje });
      }
    }

    setEstado('Cargando lotes propios y lotes ERP sincronizados.');

    Promise.allSettled([cargarDatosApp(), cargarDatosErp()]).then((resultados) => {
      if (cancelado) {
        return;
      }

      if (resultados.every((resultado) => resultado.status === 'fulfilled')) {
        setEstado('Lotes cargados desde Supabase.');
      }
    });

    return () => {
      cancelado = true;
    };
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
