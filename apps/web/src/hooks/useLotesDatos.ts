import { useEffect, useMemo, useState } from 'react';
import type { CampoApp, ErpCampo, ErpLote, LoteApp } from '@agro/tipos';
import {
  obtenerCamposApp,
  obtenerCamposErpImportados,
  obtenerLotesApp,
  obtenerLotesErpImportados,
} from '../services/api';
import {
  construirCamposSeleccionables,
  filtrarLotesPropios,
  normalizarCodigo,
} from '../utils/lotes/helpersLotes';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type UseLotesDatosParams = {
  token: string;
  camposPropiosIniciales: CampoApp[];
  filtro: string;
  filtroCampoClave: string;
  pagina: number;
  filasPorPagina: number;
  notificar?: Notificar;
};

export function useLotesDatos({
  token,
  camposPropiosIniciales,
  filtro,
  filtroCampoClave,
  pagina,
  filasPorPagina,
  notificar,
}: UseLotesDatosParams) {
  const [lotesErp, setLotesErp] = useState<ErpLote[]>([]);
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [camposPropiosActuales, setCamposPropiosActuales] = useState<CampoApp[]>(camposPropiosIniciales);
  const [lotesPropios, setLotesPropios] = useState<LoteApp[]>([]);
  const [estado, setEstado] = useState('Cargando lotes sincronizados.');
  const [lotesErpTotal, setLotesErpTotal] = useState(0);
  const [lotesErpCargando, setLotesErpCargando] = useState(false);

  const camposPropiosPorId = useMemo(() => new Map(camposPropiosActuales.map((campo) => [campo.id, campo])), [camposPropiosActuales]);
  const camposParaFiltrar = useMemo(
    () => construirCamposSeleccionables(camposPropiosActuales, camposErp, false),
    [camposErp, camposPropiosActuales],
  );
  const camposParaFiltrarPorClave = useMemo(
    () => new Map(camposParaFiltrar.map((campo) => [campo.clave, campo])),
    [camposParaFiltrar],
  );
  const campoFiltrado = filtroCampoClave ? camposParaFiltrarPorClave.get(filtroCampoClave) : undefined;
  const lotesPropiosFiltradosTotal = useMemo(() => (
    filtrarLotesPropios(lotesPropios, camposPropiosPorId, normalizarCodigo(filtro), campoFiltrado).length
  ), [campoFiltrado, camposPropiosPorId, filtro, lotesPropios]);
  const inicioPagina = (pagina - 1) * filasPorPagina;
  const finPagina = inicioPagina + filasPorPagina;
  const lotesPropiosEnPagina = Math.max(0, Math.min(finPagina, lotesPropiosFiltradosTotal) - inicioPagina);
  const lotesErpLimit = Math.max(0, filasPorPagina - lotesPropiosEnPagina);
  const lotesErpOffset = Math.max(0, inicioPagina - lotesPropiosFiltradosTotal);

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

    async function cargarCamposErp() {
      try {
        const respuestaCamposErp = await obtenerCamposErpImportados(token);

        if (cancelado) {
          return;
        }

        setCamposErp(respuestaCamposErp.campos);
      } catch (error) {
        if (cancelado) {
          return;
        }

        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los lotes ERP.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron campos ERP', mensaje });
      }
    }

    setEstado('Cargando lotes propios y lotes ERP sincronizados.');

    Promise.allSettled([cargarDatosApp(), cargarCamposErp()]).then((resultados) => {
      if (cancelado) {
        return;
      }

      if (resultados.every((resultado) => resultado.status === 'fulfilled')) {
        setEstado('Datos base cargados. Consultando lotes ERP paginados.');
      }
    });

    return () => {
      cancelado = true;
    };
  }, [token, notificar]);

  useEffect(() => {
    let cancelado = false;
    const limitConsulta = lotesErpLimit || 1;

    async function cargarPaginaErp() {
      setLotesErpCargando(true);
      setLotesErp([]);

      try {
        const respuesta = await obtenerLotesErpImportados(token, {
          limit: limitConsulta,
          offset: lotesErpOffset,
          q: filtro.trim() || undefined,
          campoErpId: campoFiltrado?.campoErpId || (campoFiltrado ? '__sin_campo_erp__' : undefined),
        });

        if (cancelado) {
          return;
        }

        setLotesErp(lotesErpLimit ? respuesta.lotes : []);
        setLotesErpTotal(respuesta.total ?? respuesta.lotes.length);
        setEstado('Lotes cargados desde Supabase.');
      } catch (error) {
        if (cancelado) {
          return;
        }

        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los lotes ERP.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron lotes ERP', mensaje });
      } finally {
        if (!cancelado) {
          setLotesErpCargando(false);
        }
      }
    }

    cargarPaginaErp();

    return () => {
      cancelado = true;
    };
  }, [campoFiltrado, filtro, lotesErpLimit, lotesErpOffset, notificar, token]);

  return {
    lotesErp,
    lotesErpCargando,
    lotesErpTotal,
    lotesPropiosFiltradosTotal,
    camposErp,
    camposPropiosActuales,
    lotesPropios,
    estado,
    setCamposPropiosActuales,
    setLotesPropios,
    setEstado,
  };
}
