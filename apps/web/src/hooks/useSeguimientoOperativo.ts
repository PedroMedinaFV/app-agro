import { useEffect, useMemo, useState } from 'react';
import type {
  CampoApp,
  FichaLoteOperativoResponse,
  LoteApp,
  LoteMapaNdvi,
  ObservacionCampo,
  PrecipitacionCampo,
  SesionUsuario,
  SeveridadObservacion,
} from '@agro/tipos';
import {
  crearUrlLecturaAdjuntoObservacion,
  obtenerFichaLoteOperativo,
  obtenerObservaciones,
  obtenerPlanificacionSnapshot,
  obtenerPrecipitaciones,
  obtenerUltimoMapaNdviLote,
} from '../services/api';
import { dentroDelRangoSeguimiento } from '../utils/seguimiento/helpersSeguimiento';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

export type FiltroSeveridadSeguimiento = SeveridadObservacion | 'todas';

export function useSeguimientoOperativo(sesion: SesionUsuario, notificar?: Notificar) {
  const [campos, setCampos] = useState<CampoApp[]>([]);
  const [lotes, setLotes] = useState<LoteApp[]>([]);
  const [observaciones, setObservaciones] = useState<ObservacionCampo[]>([]);
  const [precipitaciones, setPrecipitaciones] = useState<PrecipitacionCampo[]>([]);
  const [fichaLote, setFichaLote] = useState<FichaLoteOperativoResponse | null>(null);
  const [ultimoNdvi, setUltimoNdvi] = useState<LoteMapaNdvi | null>(null);
  const [cargandoNdvi, setCargandoNdvi] = useState(false);
  const [estado, setEstado] = useState('Cargando seguimiento operativo.');
  const [filtroCampoId, setFiltroCampoId] = useState('');
  const [filtroLoteId, setFiltroLoteId] = useState('');
  const [filtroSeveridad, setFiltroSeveridad] = useState<FiltroSeveridadSeguimiento>('todas');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');

  async function cargarFichaOperativa(loteAppId: string) {
    setCargandoNdvi(true);
    setUltimoNdvi(null);

    try {
      const [ficha, ndvi] = await Promise.all([
        obtenerFichaLoteOperativo(loteAppId, sesion.token),
        obtenerUltimoMapaNdviLote(loteAppId, sesion.token).catch((error) => {
          const mensaje = error instanceof Error ? error.message : 'No se pudo cargar el ultimo NDVI.';
          notificar?.({ tipo: 'info', titulo: 'NDVI no disponible', mensaje });
          return null;
        }),
      ]);

      setFichaLote(ficha);
      setUltimoNdvi(ndvi);
    } finally {
      setCargandoNdvi(false);
    }
  }

  async function cargarDatos() {
    try {
      const [snapshot, respuestaObservaciones, respuestaPrecipitaciones] = await Promise.all([
        obtenerPlanificacionSnapshot(sesion.token),
        obtenerObservaciones(sesion.token),
        obtenerPrecipitaciones(sesion.token),
      ]);

      setCampos(snapshot.camposApp);
      setLotes(snapshot.lotesApp);
      setObservaciones(respuestaObservaciones.observaciones);
      setPrecipitaciones(respuestaPrecipitaciones.precipitaciones);
      const loteInicial = filtroLoteId || snapshot.lotesApp[0]?.id || '';
      setFiltroLoteId(loteInicial);
      setEstado('Seguimiento cargado desde backend.');

      if (loteInicial) {
        await cargarFichaOperativa(loteInicial);
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cargar el seguimiento operativo.';
      setEstado(mensaje);
      notificar?.({ tipo: 'error', titulo: 'No se cargo seguimiento', mensaje });
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [sesion.token]);

  const camposPorId = useMemo(() => new Map(campos.map((campo) => [campo.id, campo])), [campos]);
  const lotesPorId = useMemo(() => new Map(lotes.map((lote) => [lote.id, lote])), [lotes]);
  const lotesDisponibles = filtroCampoId ? lotes.filter((lote) => lote.campoAppId === filtroCampoId) : lotes;
  const texto = filtroTexto.trim().toLocaleLowerCase('es');
  const observacionesFiltradas = useMemo(() => observaciones.filter((observacion) => {
    const campo = camposPorId.get(observacion.campoAppId);
    const lote = observacion.loteAppId ? lotesPorId.get(observacion.loteAppId) : undefined;
    const coincideCampo = !filtroCampoId || observacion.campoAppId === filtroCampoId;
    const coincideLote = !filtroLoteId || observacion.loteAppId === filtroLoteId;
    const coincideSeveridad = filtroSeveridad === 'todas' || observacion.severidad === filtroSeveridad;
    const coincideFecha = dentroDelRangoSeguimiento(observacion.fechaEvento, filtroDesde, filtroHasta);
    const coincideTexto = !texto
      || observacion.titulo.toLocaleLowerCase('es').includes(texto)
      || observacion.descripcion.toLocaleLowerCase('es').includes(texto)
      || campo?.nombre.toLocaleLowerCase('es').includes(texto)
      || lote?.nombre.toLocaleLowerCase('es').includes(texto);

    return coincideCampo && coincideLote && coincideSeveridad && coincideFecha && coincideTexto;
  }), [camposPorId, filtroCampoId, filtroDesde, filtroHasta, filtroLoteId, filtroSeveridad, lotesPorId, observaciones, texto]);
  const precipitacionesFiltradas = useMemo(() => precipitaciones.filter((precipitacion) => {
    const campo = camposPorId.get(precipitacion.campoAppId);
    const lote = precipitacion.loteAppId ? lotesPorId.get(precipitacion.loteAppId) : undefined;
    const coincideCampo = !filtroCampoId || precipitacion.campoAppId === filtroCampoId;
    const coincideLote = !filtroLoteId || precipitacion.loteAppId === filtroLoteId;
    const coincideFecha = dentroDelRangoSeguimiento(precipitacion.fechaEvento, filtroDesde, filtroHasta);
    const coincideTexto = !texto
      || precipitacion.observaciones?.toLocaleLowerCase('es').includes(texto)
      || campo?.nombre.toLocaleLowerCase('es').includes(texto)
      || lote?.nombre.toLocaleLowerCase('es').includes(texto);

    return coincideCampo && coincideLote && coincideFecha && coincideTexto;
  }), [camposPorId, filtroCampoId, filtroDesde, filtroHasta, filtroLoteId, lotesPorId, precipitaciones, texto]);
  const totalMm = precipitacionesFiltradas.reduce((total, precipitacion) => total + precipitacion.milimetros, 0);
  const adjuntos = observacionesFiltradas.reduce((total, observacion) => total + (observacion.adjuntos?.length || 0), 0);

  async function seleccionarLote(loteAppId: string) {
    setFiltroLoteId(loteAppId);
    if (!loteAppId) {
      setFichaLote(null);
      setUltimoNdvi(null);
      return;
    }

    try {
      await cargarFichaOperativa(loteAppId);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cargar la ficha del lote.';
      notificar?.({ tipo: 'error', titulo: 'No se cargo la ficha', mensaje });
    }
  }

  function seleccionarCampo(campoId: string) {
    setFiltroCampoId(campoId);
    seleccionarLote('');
  }

  async function abrirAdjunto(adjuntoId: string) {
    try {
      const respuesta = await crearUrlLecturaAdjuntoObservacion(adjuntoId, sesion.token);
      window.open(respuesta.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo abrir el adjunto.';
      notificar?.({ tipo: 'error', titulo: 'No se abrio el adjunto', mensaje });
    }
  }

  return {
    campos,
    lotesDisponibles,
    camposPorId,
    lotesPorId,
    observacionesFiltradas,
    precipitacionesFiltradas,
    fichaLote,
    ultimoNdvi,
    cargandoNdvi,
    estado,
    filtroCampoId,
    filtroLoteId,
    filtroSeveridad,
    filtroDesde,
    filtroHasta,
    filtroTexto,
    totalMm,
    adjuntos,
    seleccionarCampo,
    seleccionarLote,
    abrirAdjunto,
    setFiltroSeveridad,
    setFiltroDesde,
    setFiltroHasta,
    setFiltroTexto,
  };
}
