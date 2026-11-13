import { useEffect, useState, type RefObject } from 'react';
import type { FichaLoteOperativoResponse, PlanificacionSnapshot, SesionUsuario } from '@agro/tipos';
import { obtenerFichaLoteOperativo, obtenerPlanificacionSnapshot } from '../services/api';
import { planificacionVacia } from '../data/planificacionVacia';

export function useDatosOperativosMobile(sesion: SesionUsuario, sesionActual: RefObject<SesionUsuario | null>) {
  const [campoSeleccionadoId, setCampoSeleccionadoId] = useState('');
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState('');
  const [planificacionOperativa, setPlanificacionOperativa] = useState<PlanificacionSnapshot>(planificacionVacia);
  const [fichaLote, setFichaLote] = useState<FichaLoteOperativoResponse | null>(null);
  const [cargandoFichaLote, setCargandoFichaLote] = useState(false);
  const [cargandoPlanificacion, setCargandoPlanificacion] = useState(false);
  const [errorPlanificacion, setErrorPlanificacion] = useState<string | null>(null);
  useEffect(() => {
    let cancelada = false;
    async function cargarDatosOperativos() {
      setCargandoPlanificacion(true);
      try {
        if (cancelada || sesionActual.current !== sesion) return;
        const snapshot = await obtenerPlanificacionSnapshot(sesion.token);
        if (cancelada || sesionActual.current !== sesion) return;
        setPlanificacionOperativa(snapshot);
        setCampoSeleccionadoId(snapshot.camposApp[0]?.id || '');
        setLoteSeleccionadoId(snapshot.lotesApp[0]?.id || '');
        setErrorPlanificacion(null);
      } catch (error) {
        if (cancelada || sesionActual.current !== sesion) return;
        setPlanificacionOperativa(planificacionVacia);
        setErrorPlanificacion(error instanceof Error ? error.message : 'No se pudieron cargar los datos operativos.');
      } finally {
        if (!cancelada && sesionActual.current === sesion) setCargandoPlanificacion(false);
      }
    }

    void cargarDatosOperativos();
    return () => { cancelada = true; };
  }, [sesion, sesionActual]);

  useEffect(() => {
    let cancelada = false;
    async function cargarFichaLote() {
      if (!loteSeleccionadoId) {
        setFichaLote(null);
        return;
      }

      setCargandoFichaLote(true);
      try {
        const ficha = await obtenerFichaLoteOperativo(loteSeleccionadoId, sesion.token);
        if (!cancelada && sesionActual.current === sesion) setFichaLote(ficha);
      } catch {
        if (!cancelada && sesionActual.current === sesion) setFichaLote(null);
      } finally {
        if (!cancelada && sesionActual.current === sesion) setCargandoFichaLote(false);
      }
    }

    void cargarFichaLote();
    return () => { cancelada = true; };
  }, [loteSeleccionadoId, sesion, sesionActual]);

  const esAdmin = sesion.permisos.includes('erp:configurar');
  const datosOperativos = planificacionOperativa;
  const planificacionActiva = datosOperativos.planificaciones.find((p) => p.estado === 'cerrada' && p.escenarioOriginal)
    ?? datosOperativos.planificaciones.find((p) => p.estado === 'cerrada') ?? datosOperativos.planificaciones[0];
  const protocoloActivo = datosOperativos.protocolos[0];
  const lineasPlanificacion = datosOperativos.planificaciones.filter((p) => p.estado === 'cerrada' && p.campaniaErpId === planificacionActiva?.campaniaErpId).flatMap((p) => p.lineas);
  const margenBruto = lineasPlanificacion.reduce((total, linea) => total + linea.margenBrutoEstimado, 0);
  const hectareas = lineasPlanificacion.reduce((total, linea) => total + linea.hectareasPlanificadas, 0);
  const campoSeleccionado = datosOperativos.camposApp.find((campo) => campo.id === campoSeleccionadoId) || datosOperativos.camposApp[0];
  const lotesDelCampo = datosOperativos.lotesApp.filter((lote) => lote.campoAppId === campoSeleccionado?.id);
  const loteSeleccionado = lotesDelCampo.find((lote) => lote.id === loteSeleccionadoId) || lotesDelCampo[0];
  const lineaSeleccionada = lineasPlanificacion.find((linea) => linea.loteAppId === loteSeleccionado?.id);
  const actividadSeleccionada = datosOperativos.actividadesApp?.find((actividad) => actividad.id === lineaSeleccionada?.actividadAppId);
  const protocoloSeleccionado = datosOperativos.protocolos.find((protocolo) => protocolo.id === lineaSeleccionada?.protocoloId) || protocoloActivo;

  function seleccionarSiguienteCampo() {
    const campos = datosOperativos.camposApp;
    if (!campos.length) {
      setCampoSeleccionadoId('');
      setLoteSeleccionadoId('');
      return;
    }

    const indiceActual = campos.findIndex((campo) => campo.id === campoSeleccionado?.id);
    const siguiente = campos[(indiceActual + 1) % campos.length];

    setCampoSeleccionadoId(siguiente.id);
    setLoteSeleccionadoId(datosOperativos.lotesApp.find((lote) => lote.campoAppId === siguiente.id)?.id || '');
  }

  function seleccionarSiguienteLote() {
    if (!lotesDelCampo.length) {
      setLoteSeleccionadoId('');
      return;
    }

    const indiceActual = lotesDelCampo.findIndex((lote) => lote.id === loteSeleccionado?.id);
    setLoteSeleccionadoId(lotesDelCampo[(indiceActual + 1) % lotesDelCampo.length].id);
  }

  return { esAdmin, datosOperativos, planificacionActiva, protocoloActivo, margenBruto, hectareas, campoSeleccionado, loteSeleccionado, lineaSeleccionada,
    actividadSeleccionada, protocoloSeleccionado, fichaLote, cargandoFichaLote, cargandoPlanificacion, errorPlanificacion,
    seleccionarSiguienteCampo, seleccionarSiguienteLote };
}
