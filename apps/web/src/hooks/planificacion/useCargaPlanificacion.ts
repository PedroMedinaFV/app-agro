import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlanificacionSnapshot, ProtocoloProductivoResumen, SesionUsuario } from '@agro/tipos';
import { obtenerPlanificacionesResumen, obtenerPlanificacionDetalleSnapshot, obtenerPlanificacionSnapshot } from '../../services/api';
import { resumirPlanificacionLocal } from '../../utils/planificacion/helpersPlanificacion';
import { ModoCargaPlanificacion, planificacionVacia, resumenPlanificacionVacio } from './estadoPlanificacion';

type OpcionesRefresco = {
  forzar?: boolean;
};

export function useCargaPlanificacion(sesion: SesionUsuario | null, cargarAutomaticamente: ModoCargaPlanificacion) {
  const [planificacion, setPlanificacion] = useState<PlanificacionSnapshot>(planificacionVacia);
  const planificacionRef = useRef(planificacionVacia);
  const [resumenPlanificaciones, setResumenPlanificaciones] = useState(resumenPlanificacionVacio);
  const [planificacionEstado, setPlanificacionEstado] = useState('Planificacion sin cargar');
  const [planificacionCargada, setPlanificacionCargada] = useState(false);
  const [resumenPlanificacionCargado, setResumenPlanificacionCargado] = useState(false);
  const [cargandoPlanificacion, setCargandoPlanificacion] = useState(false);
  const [cargandoResumenPlanificacion, setCargandoResumenPlanificacion] = useState(false);

  useEffect(() => {
    planificacionRef.current = planificacion;
  }, [planificacion]);

  const refrescarResumenPlanificacion = useCallback(async (opciones: OpcionesRefresco = {}) => {
    if (!sesion) {
      return;
    }

    setCargandoResumenPlanificacion(true);

    try {
      const resumen = await obtenerPlanificacionesResumen(sesion.token, opciones);
      setResumenPlanificaciones(resumen);
      setResumenPlanificacionCargado(true);
      setPlanificacionEstado('Resumen de planificaciones cargado.');
    } catch {
      setResumenPlanificaciones(resumenPlanificacionVacio);
      setResumenPlanificacionCargado(true);
      setPlanificacionEstado('No se pudo cargar el resumen de planificaciones.');
    } finally {
      setCargandoResumenPlanificacion(false);
    }
  }, [sesion]);

  const refrescarPlanificacion = useCallback(async (opciones: OpcionesRefresco = {}) => {
    if (!sesion) {
      return undefined;
    }

    setCargandoPlanificacion(true);

    try {
      const siguiente = await obtenerPlanificacionSnapshot(sesion.token, opciones);

      planificacionRef.current = siguiente;
      setPlanificacion(siguiente);
      setResumenPlanificaciones({
        planificaciones: siguiente.planificaciones.map(resumirPlanificacionLocal),
        camposProvisorios: siguiente.camposApp.filter((campo) => campo.estadoVinculacion === 'provisorio').length,
        sincronizadoEn: siguiente.sincronizadoEn,
      });
      setResumenPlanificacionCargado(true);
      setPlanificacionCargada(true);
      setPlanificacionEstado('Planificacion actualizada desde API.');
      return siguiente;
    } catch {
      setPlanificacion(planificacionVacia);
      planificacionRef.current = planificacionVacia;
      setPlanificacionCargada(true);
      setPlanificacionEstado('No se pudo refrescar la planificacion desde API.');
      return undefined;
    } finally {
      setCargandoPlanificacion(false);
    }
  }, [sesion]);

  const cargarDetallePlanificacion = useCallback(async (planificacionId: string, opciones: OpcionesRefresco = {}) => {
    if (!sesion) {
      return undefined;
    }

    setCargandoPlanificacion(true);

    try {
      const detalle = await obtenerPlanificacionDetalleSnapshot(planificacionId, sesion.token, opciones);

      planificacionRef.current = {
        ...detalle,
        planificaciones: [
          ...detalle.planificaciones,
          ...planificacionRef.current.planificaciones.filter((item) => !detalle.planificaciones.some((detalleItem) => detalleItem.id === item.id)),
        ],
      };
      setPlanificacion(planificacionRef.current);
      setResumenPlanificaciones((actual) => ({
        planificaciones: [
          ...detalle.planificaciones
            .filter((planificacion) => !actual.planificaciones.some((item) => item.id === planificacion.id))
            .map(resumirPlanificacionLocal),
          ...actual.planificaciones.map((item) => {
            const planificacionActualizada = detalle.planificaciones.find((planificacion) => planificacion.id === item.id);
            return planificacionActualizada ? resumirPlanificacionLocal(planificacionActualizada) : item;
          }),
        ],
        camposProvisorios: detalle.camposApp.filter((campo) => campo.estadoVinculacion === 'provisorio').length,
        sincronizadoEn: detalle.sincronizadoEn,
      }));
      setPlanificacionEstado('Detalle de planificacion cargado desde API.');
      return detalle;
    } catch {
      setPlanificacionEstado('No se pudo cargar el detalle de la planificacion.');
      return undefined;
    } finally {
      setCargandoPlanificacion(false);
    }
  }, [sesion]);

  const incorporarProtocoloPlanificacion = useCallback((protocolo: ProtocoloProductivoResumen) => {
    setPlanificacion((actual) => {
      const existe = actual.protocolos.some((item) => item.id === protocolo.id);

      return {
        ...actual,
        protocolos: existe
          ? actual.protocolos.map((item) => (item.id === protocolo.id ? protocolo : item))
          : [protocolo, ...actual.protocolos],
        sincronizadoEn: new Date().toISOString(),
      };
    });
  }, []);

  useEffect(() => {
    if (!sesion) {
      setPlanificacion(planificacionVacia);
      setResumenPlanificaciones(resumenPlanificacionVacio);
      setPlanificacionCargada(false);
      setResumenPlanificacionCargado(false);
      setPlanificacionEstado('Planificacion sin sesion');
      return;
    }

    const modoCarga = cargarAutomaticamente === true ? 'snapshot' : cargarAutomaticamente;

    if (!modoCarga) {
      return;
    }

    if (modoCarga === 'resumen') {
      if (!resumenPlanificacionCargado && !cargandoResumenPlanificacion) {
        void refrescarResumenPlanificacion();
      }
      return;
    }

    if (!planificacionCargada && !cargandoPlanificacion) {
      void refrescarPlanificacion();
    }
  }, [
    cargarAutomaticamente,
    cargandoPlanificacion,
    cargandoResumenPlanificacion,
    planificacionCargada,
    refrescarPlanificacion,
    refrescarResumenPlanificacion,
    resumenPlanificacionCargado,
    sesion,
  ]);

  const asegurarPlanificacion = useCallback(async () => {
    if (!planificacionCargada && !cargandoPlanificacion) {
      return refrescarPlanificacion();
    }
    return planificacionRef.current;
  }, [cargandoPlanificacion, planificacionCargada, refrescarPlanificacion]);

  return {
    planificacion,
    setPlanificacion,
    resumenPlanificaciones,
    planificacionEstado,
    setPlanificacionEstado,
    planificacionCargada,
    resumenPlanificacionCargado,
    cargandoPlanificacion,
    cargandoResumenPlanificacion,
    asegurarPlanificacion,
    cargarDetallePlanificacion,
    refrescarPlanificacion,
    incorporarProtocoloPlanificacion,
  };
}
