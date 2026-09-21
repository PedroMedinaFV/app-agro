import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ConceptoGastoComercial,
  DestinoApp,
  ErpSnapshot,
  GastosComercialesReferencia,
  InsumoApp,
  ServicioApp,
  LoteApp,
  PlanificacionAgricola,
  PlanificacionAgricolaLinea,
  PlanificacionSnapshot,
  PrecioReferencia,
  ProtocoloProductivoResumen,
  SesionUsuario,
} from '@agro/tipos';
import {
  cerrarPlanificacion,
  guardarConceptoGastoComercial,
  guardarDestinoVenta,
  guardarGastoComercialReferencia,
  guardarInsumoApp,
  guardarServicioApp,
  guardarPlanificacion,
  guardarPrecioReferencia,
  obtenerPlanificacionesResumen,
  obtenerPlanificacionSnapshot,
} from '../services/api';
import {
  anexarDestinoSiNoExiste,
  calcularGastosComercialesLinea,
  calcularResumenPlanificacion,
  limpiarTextoVisible,
  normalizarTexto,
  obtenerClavesDuplicadas,
  obtenerSuperficieInicialLote,
  recalcularLineaPlanificacion,
  resumirPlanificacionLocal,
  tieneLineasDuplicadasEnPlanificacion,
} from '../utils/planificacion/ayudantesPlanificacion';
import {
  ModoCargaPlanificacion,
  NotificarPlanificacion,
  planificacionVacia,
  resumenPlanificacionVacio,
} from './planificacion/estadoPlanificacion';

export function usePlanificacion(sesion: SesionUsuario | null, snapshot: ErpSnapshot, notificar?: NotificarPlanificacion, cargarAutomaticamente: ModoCargaPlanificacion = true) {
  const [planificacion, setPlanificacion] = useState<PlanificacionSnapshot>(planificacionVacia);
  const planificacionRef = useRef(planificacionVacia);
  const [resumenPlanificaciones, setResumenPlanificaciones] = useState(resumenPlanificacionVacio);
  const [planificacionEstado, setPlanificacionEstado] = useState('Planificacion sin cargar');
  const [planificacionCargada, setPlanificacionCargada] = useState(false);
  const [resumenPlanificacionCargado, setResumenPlanificacionCargado] = useState(false);
  const [cargandoPlanificacion, setCargandoPlanificacion] = useState(false);
  const [cargandoResumenPlanificacion, setCargandoResumenPlanificacion] = useState(false);
  const [guardandoPlanificacion, setGuardandoPlanificacion] = useState(false);
  const [cerrandoPlanificacion, setCerrandoPlanificacion] = useState(false);
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const [guardandoGastos, setGuardandoGastos] = useState(false);
  const [guardandoConceptosGastos, setGuardandoConceptosGastos] = useState(false);
  const [guardandoDestinos, setGuardandoDestinos] = useState(false);
  const [guardandoLabores, setGuardandoLabores] = useState(false);
  const [guardandoInsumos, setGuardandoInsumos] = useState(false);
  const [planificacionSeleccionadaId, setPlanificacionSeleccionadaId] = useState<string>();

  useEffect(() => {
    planificacionRef.current = planificacion;
  }, [planificacion]);

  const refrescarResumenPlanificacion = useCallback(async (opciones: { forzar?: boolean } = {}) => {
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

  const refrescarPlanificacion = useCallback(async (opciones: { forzar?: boolean } = {}) => {
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
    } catch (error) {
      setPlanificacion(planificacionVacia);
      planificacionRef.current = planificacionVacia;
      setPlanificacionCargada(true);
      setPlanificacionEstado('No se pudo refrescar la planificacion desde API.');
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

  const planificacionActiva = planificacion.planificaciones.find((item) => item.id === planificacionSeleccionadaId) || planificacion.planificaciones[0];
  const lineasPlanificacion = planificacionActiva?.lineas || [];
  const camposAppPorId = useMemo(() => new Map(planificacion.camposApp.map((campo) => [campo.id, campo])), [planificacion.camposApp]);
  const lotesAppPorId = useMemo(() => new Map(planificacion.lotesApp.map((lote) => [lote.id, lote])), [planificacion.lotesApp]);
  const protocolosPorId = useMemo(() => new Map(planificacion.protocolos.map((protocolo) => [protocolo.id, protocolo])), [planificacion.protocolos]);
  const gastosComercialesReferenciaPorId = useMemo(
    () => new Map(planificacion.gastosComercialesReferencia.map((gasto) => [gasto.id, gasto])),
    [planificacion.gastosComercialesReferencia],
  );
  const resumenPlanificacion = useMemo(() => calcularResumenPlanificacion(lineasPlanificacion), [lineasPlanificacion]);
  const margenBrutoTotal = resumenPlanificacion.margenBrutoTotal;
  const ingresoNetoTotal = resumenPlanificacion.ingresoNetoTotal;
  const costoTotal = resumenPlanificacion.costoTotal;
  const hectareasPlanificadas = resumenPlanificacion.hectareasPlanificadas;
  const camposProvisorios = useMemo(() => (
    planificacionCargada
      ? planificacion.camposApp.filter((campo) => campo.estadoVinculacion === 'provisorio').length
      : resumenPlanificaciones.camposProvisorios
  ), [planificacion.camposApp, planificacionCargada, resumenPlanificaciones.camposProvisorios]);
  const planificacionesResumen = useMemo(() => (
    planificacionCargada
      ? planificacion.planificaciones.map(resumirPlanificacionLocal)
      : resumenPlanificaciones.planificaciones
  ), [planificacion.planificaciones, planificacionCargada, resumenPlanificaciones.planificaciones]);
  const puedeEditarPlanificacionPorPermiso = Boolean(sesion?.permisos.includes('planificacion:editar'));
  const planificacionActivaBloqueada = planificacionActiva?.estado === 'cerrada' || planificacionActiva?.estado === 'deshabilitada';
  const puedeEditarPlanificacion = Boolean(puedeEditarPlanificacionPorPermiso && !planificacionActivaBloqueada);
  const puedeConfigurarPlanificacion = Boolean(sesion?.permisos.includes('planificacion:configurar'));
  const puedeCerrarPlanificacion = Boolean(sesion?.permisos.includes('planificacion:cerrar') && planificacionActiva && !planificacionActivaBloqueada);

  const clavesDuplicadas = useMemo(
    () => obtenerClavesDuplicadas(lineasPlanificacion, planificacionActiva?.campaniaErpId),
    [lineasPlanificacion, planificacionActiva?.campaniaErpId],
  );
  const tieneLineasDuplicadas = clavesDuplicadas.size > 0;

  function recalcularLinea(linea: PlanificacionAgricolaLinea): PlanificacionAgricolaLinea {
    return recalcularLineaPlanificacion(linea, { protocolosPorId, gastosComercialesReferenciaPorId });
  }

  function calcularGastosComerciales(linea: PlanificacionAgricolaLinea, referenciaId?: string) {
    return calcularGastosComercialesLinea(linea, referenciaId ? gastosComercialesReferenciaPorId.get(referenciaId) : undefined);
  }

  function buscarDestinoSugerido(linea: Pick<PlanificacionAgricolaLinea, 'campoAppId' | 'campoErpId'>) {
    return planificacion.destinosReferencia
      .filter((item) => item.activo)
      .sort((a, b) => {
        const pesoA = (a.campoAppId === linea.campoAppId ? 3 : 0) + (a.campoErpId === linea.campoErpId ? 2 : 0);
        const pesoB = (b.campoAppId === linea.campoAppId ? 3 : 0) + (b.campoErpId === linea.campoErpId ? 2 : 0);

        return pesoB - pesoA || a.destinoVenta.localeCompare(b.destinoVenta);
      })[0];
  }

  function buscarPrecioSugerido(actividadAppId: string, destinoVenta: string) {
    if (!destinoVenta) {
      return undefined;
    }

    const actividad = planificacion.actividadesApp?.find((item) => item.id === actividadAppId);

    return planificacion.preciosReferencia.find((item) => (
      item.activo
      && item.destinoVenta === destinoVenta
      && (
        (actividad?.especieAppId && item.especieAppId === actividad.especieAppId)
        || (actividad?.especieErpId && item.especieErpId === actividad.especieErpId)
        || item.actividadAppId === actividadAppId
      )
    ));
  }

  function buscarGastosSugeridos(
    linea: Pick<PlanificacionAgricolaLinea, 'campoAppId' | 'campoErpId' | 'actividadAppId' | 'destinoVenta'>,
    campaniaErpId = planificacionActiva?.campaniaErpId,
  ) {
    const campo = camposAppPorId.get(linea.campoAppId);

    return planificacion.gastosComercialesReferencia
      .filter((item) => (
        item.activo
        && item.campaniaErpId === campaniaErpId
        && item.actividadAppId === linea.actividadAppId
        && Boolean(linea.destinoVenta)
        && item.destinoVenta === linea.destinoVenta
        && (!item.zonaAppId || item.zonaAppId === campo?.zonaAppId)
        && (!item.zonaErpId || item.zonaErpId === campo?.zonaErpId)
      ))
      .sort((a, b) => {
        const pesoA = (
          (a.campoAppId === linea.campoAppId ? 6 : 0)
          + (a.campoErpId === linea.campoErpId ? 4 : 0)
          + (a.zonaAppId === campo?.zonaAppId ? 3 : 0)
          + (a.zonaErpId === campo?.zonaErpId ? 2 : 0)
        );
        const pesoB = (
          (b.campoAppId === linea.campoAppId ? 6 : 0)
          + (b.campoErpId === linea.campoErpId ? 4 : 0)
          + (b.zonaAppId === campo?.zonaAppId ? 3 : 0)
          + (b.zonaErpId === campo?.zonaErpId ? 2 : 0)
        );

        return pesoB - pesoA;
      })[0];
  }

  function obtenerProtocolosCompatibles(linea: Pick<PlanificacionAgricolaLinea, 'actividadAppId' | 'campoAppId' | 'campoErpId'>) {
    const campo = camposAppPorId.get(linea.campoAppId);

    return planificacion.protocolos
      .filter((protocolo) => {
        if (!protocolo.activo || protocolo.actividadAppId !== linea.actividadAppId) {
          return false;
        }

        const coincideCampo = !protocolo.campoAppId || protocolo.campoAppId === linea.campoAppId;
        const coincideZona = !protocolo.zonaAppId || protocolo.zonaAppId === campo?.zonaAppId;

        return coincideCampo && coincideZona;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }

  function actualizarPlanificacionActiva(mutador: (actual: PlanificacionAgricola) => PlanificacionAgricola) {
    setPlanificacion((actual) => ({
      ...actual,
      planificaciones: actual.planificaciones.map((item) => (item.id === planificacionActiva?.id ? mutador(item) : item)),
    }));
  }

  function seleccionarPlanificacion(planificacionId: string) {
    setPlanificacionSeleccionadaId(planificacionId);
  }

  async function persistirEscenarioBorrador(
    planificacionNueva: PlanificacionAgricola,
    motivo: string,
    mensajeOk: string,
  ) {
    setGuardandoPlanificacion(true);

    try {
      const respuesta = await guardarPlanificacion(planificacionNueva.id, {
        planificacion: planificacionNueva,
        origen: 'web',
        motivo,
      }, sesion?.token);
      const ahora = new Date().toISOString();

      setPlanificacion((actual) => {
        const existe = actual.planificaciones.some((item) => item.id === respuesta.planificacion.id);

        return {
          ...actual,
          planificaciones: existe
            ? actual.planificaciones.map((item) => (item.id === respuesta.planificacion.id ? respuesta.planificacion : item))
            : [respuesta.planificacion, ...actual.planificaciones],
          sincronizadoEn: ahora,
        };
      });
      setPlanificacionSeleccionadaId(respuesta.planificacion.id);
      setPlanificacionEstado(respuesta.mensaje);
      notificar?.({
        tipo: 'success',
        titulo: mensajeOk,
        mensaje: respuesta.auditado ? 'El escenario quedo persistido y auditado.' : respuesta.mensaje,
      });

      return respuesta.planificacion.id;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo persistir el escenario.';
      setPlanificacionEstado(mensaje);
      notificar?.({
        tipo: 'error',
        titulo: 'No se guardo el escenario',
        mensaje,
      });

      return undefined;
    } finally {
      setGuardandoPlanificacion(false);
    }
  }

  async function crearEscenarioPlanificacion(datos: { nombre: string; campaniaErpId: string; descripcion?: string }) {
    if (!sesion || !puedeEditarPlanificacionPorPermiso) {
      notificar?.({ tipo: 'error', titulo: 'Sin permisos', mensaje: 'No tenes permisos para crear escenarios de planificacion.' });
      return undefined;
    }

    const nombre = limpiarTextoVisible(datos.nombre);
    const descripcion = datos.descripcion ? limpiarTextoVisible(datos.descripcion) : undefined;

    if (!nombre) {
      notificar?.({ tipo: 'error', titulo: 'Falta nombre', mensaje: 'El escenario debe tener un nombre para poder identificarlo.' });
      return undefined;
    }

    const snapshotPlanificacion = planificacionCargada ? planificacion : await asegurarPlanificacion();

    if (!snapshotPlanificacion) {
      return undefined;
    }

    const existeOriginalCerrado = snapshotPlanificacion.planificaciones.some((item) => (
      item.campaniaErpId === datos.campaniaErpId
      && item.estado === 'cerrada'
      && item.escenarioOriginal
    ));

    if (existeOriginalCerrado) {
      notificar?.({
        tipo: 'error',
        titulo: 'Campania cerrada',
        mensaje: 'Esa campania ya tiene un escenario original cerrado. No se pueden crear nuevas simulaciones.',
      });
      return undefined;
    }

    const ahora = new Date().toISOString();
    const id = `planificacion-${Date.now()}`;
    const nuevaPlanificacion: PlanificacionAgricola = {
      id,
      clienteId: sesion.usuario.clienteId || 'cliente-demo',
      campaniaErpId: datos.campaniaErpId,
      nombre,
      descripcion,
      estado: 'borrador',
      escenarioOriginal: false,
      lineas: snapshotPlanificacion.lotesApp
        .map((lote, indice) => crearLineaDesdeLote(lote, id, indice, datos.campaniaErpId, snapshotPlanificacion))
        .filter((linea): linea is PlanificacionAgricolaLinea => Boolean(linea)),
      createdAt: ahora,
      updatedAt: ahora,
    };

    return persistirEscenarioBorrador(
      nuevaPlanificacion,
      'Creacion de escenario de planificacion desde resumen web',
      'Escenario creado',
    );
  }

  async function copiarEscenarioPlanificacion(planificacionId: string) {
    if (!sesion || !puedeEditarPlanificacionPorPermiso) {
      notificar?.({ tipo: 'error', titulo: 'Sin permisos', mensaje: 'No tenes permisos para copiar escenarios de planificacion.' });
      return undefined;
    }

    const snapshotPlanificacion = planificacionCargada ? planificacion : await asegurarPlanificacion();
    const origen = snapshotPlanificacion?.planificaciones.find((item) => item.id === planificacionId);

    if (!snapshotPlanificacion || !origen) {
      return undefined;
    }

    const existeOriginalCerrado = snapshotPlanificacion.planificaciones.some((item) => (
      item.id !== origen.id
      && item.campaniaErpId === origen.campaniaErpId
      && item.estado === 'cerrada'
      && item.escenarioOriginal
    )) || (origen.estado === 'cerrada' && origen.escenarioOriginal);

    if (existeOriginalCerrado) {
      notificar?.({
        tipo: 'error',
        titulo: 'Campania cerrada',
        mensaje: 'Esa campania ya tiene escenario original cerrado. No se puede copiar para crear otra simulacion.',
      });
      return undefined;
    }

    const ahora = new Date().toISOString();
    const id = `planificacion-copia-${Date.now()}`;
    const copia: PlanificacionAgricola = {
      ...origen,
      id,
      nombre: `${origen.nombre} - copia`,
      estado: 'borrador',
      escenarioOriginal: false,
      escenarioBloqueadoPorId: undefined,
      cerradaPor: undefined,
      cerradaAt: undefined,
      motivoCierre: undefined,
      createdAt: ahora,
      updatedAt: ahora,
      lineas: origen.lineas.map((linea, indice) => ({
        ...linea,
        id: `linea-planificacion-copia-${Date.now()}-${indice}`,
        planificacionId: id,
        estado: 'borrador',
        createdAt: ahora,
        updatedAt: ahora,
      })),
    };

    return persistirEscenarioBorrador(
      copia,
      `Copia de escenario de planificacion ${origen.id}`,
      'Escenario copiado',
    );
  }

  function actualizarCabeceraPlanificacion(cambios: Partial<Pick<PlanificacionAgricola, 'nombre' | 'descripcion'>>) {
    actualizarPlanificacionActiva((actual) => ({
      ...actual,
      ...cambios,
      updatedAt: new Date().toISOString(),
    }));
  }

  function cambiarCampaniaPlanificacion(campaniaErpId: string) {
    const ahora = new Date().toISOString();

    actualizarPlanificacionActiva((actual) => ({
      ...actual,
      campaniaErpId,
      lineas: actual.lineas.map((linea) => ({
        ...linea,
        protocoloId: undefined,
        destinoReferenciaId: undefined,
        destinoVenta: '',
        destinoVentaManual: false,
        precioReferenciaId: undefined,
        precioVentaEstimado: 0,
        precioVentaManual: false,
        rindeEstimado: 0,
        gastosComercialesReferenciaId: undefined,
        gastosComercialesEstimados: 0,
        ingresoBrutoEstimado: 0,
        ingresoNetoEstimado: 0,
        costoProduccionEstimado: 0,
        margenBrutoEstimado: 0,
        margenBrutoActualizado: 0,
        updatedAt: ahora,
      })),
      updatedAt: ahora,
    }));
  }

  function actualizarLinea(id: string, cambios: Partial<PlanificacionAgricolaLinea>) {
    actualizarPlanificacionActiva((actual) => ({
      ...actual,
      lineas: actual.lineas.map((linea) => {
        if (linea.id !== id) {
          return linea;
        }

        const lineaActualizada = { ...linea, ...cambios };
        const debeRecalcularGastos = Boolean(
          lineaActualizada.gastosComercialesReferenciaId
          && (
            Object.prototype.hasOwnProperty.call(cambios, 'hectareasPlanificadas')
            || Object.prototype.hasOwnProperty.call(cambios, 'rindeEstimado')
          ),
        );

        return recalcularLinea({
          ...lineaActualizada,
          gastosComercialesEstimados: debeRecalcularGastos
            ? calcularGastosComerciales(lineaActualizada, lineaActualizada.gastosComercialesReferenciaId)
            : lineaActualizada.gastosComercialesEstimados,
        });
      }),
    }));
  }

  function actualizarLineas(
    lineaIds: string[],
    obtenerCambios: (linea: PlanificacionAgricolaLinea) => Partial<PlanificacionAgricolaLinea> | undefined,
  ) {
    if (lineaIds.length === 0) {
      return 0;
    }

    const ids = new Set(lineaIds);
    const ahora = new Date().toISOString();
    let aplicadas = 0;

    actualizarPlanificacionActiva((actual) => ({
      ...actual,
      lineas: actual.lineas.map((linea) => {
        if (!ids.has(linea.id)) {
          return linea;
        }

        const cambios = obtenerCambios(linea);

        if (!cambios) {
          return linea;
        }

        aplicadas += 1;

        const lineaActualizada = { ...linea, ...cambios, updatedAt: ahora };
        const debeRecalcularGastos = Boolean(
          lineaActualizada.gastosComercialesReferenciaId
          && (
            Object.prototype.hasOwnProperty.call(cambios, 'hectareasPlanificadas')
            || Object.prototype.hasOwnProperty.call(cambios, 'rindeEstimado')
          ),
        );

        return recalcularLinea({
          ...lineaActualizada,
          gastosComercialesEstimados: debeRecalcularGastos
            ? calcularGastosComerciales(lineaActualizada, lineaActualizada.gastosComercialesReferenciaId)
            : lineaActualizada.gastosComercialesEstimados,
        });
      }),
      updatedAt: ahora,
    }));

    return aplicadas;
  }

  function obtenerActividadDesdeProtocolo(protocoloId?: string) {
    const protocolo = protocoloId ? protocolosPorId.get(protocoloId) : undefined;

    return protocolo
      ? planificacion.actividadesApp?.find((actividad) => actividad.id === protocolo.actividadAppId)
      : undefined;
  }

  function aplicarSugerenciasComerciales(linea: PlanificacionAgricolaLinea, destinoForzado?: string): Partial<PlanificacionAgricolaLinea> {
    const destino = destinoForzado
      ? planificacion.destinosReferencia.find((item) => (
        item.destinoVenta === destinoForzado
        && (!item.actividadAppId || item.actividadAppId === linea.actividadAppId)
      ))
      : buscarDestinoSugerido(linea);
    const destinoVenta = destinoForzado || destino?.destinoVenta || '';
    const precio = buscarPrecioSugerido(linea.actividadAppId, destinoVenta);
    const gastos = buscarGastosSugeridos({ ...linea, destinoVenta });

    return {
      destinoReferenciaId: destino?.id,
      destinoVenta,
      destinoVentaManual: Boolean(destinoForzado && destinoForzado !== destino?.destinoVenta),
      precioReferenciaId: precio?.id,
      precioVentaEstimado: precio?.valor || 0,
      precioVentaManual: false,
      gastosComercialesReferenciaId: gastos?.id,
      gastosComercialesEstimados: gastos ? calcularGastosComerciales({ ...linea, destinoVenta, precioVentaEstimado: precio?.valor || 0 }, gastos.id) : 0,
    };
  }

  function obtenerCambiosProtocolo(linea: PlanificacionAgricolaLinea, protocoloId?: string): Partial<PlanificacionAgricolaLinea> {
    if (!protocoloId) {
      return {
        protocoloId: undefined,
        precioReferenciaId: undefined,
        precioVentaEstimado: 0,
        precioVentaManual: false,
        gastosComercialesReferenciaId: undefined,
        gastosComercialesEstimados: 0,
        costoProduccionEstimado: 0,
        margenBrutoEstimado: 0,
        margenBrutoActualizado: 0,
      };
    }

    const actividad = obtenerActividadDesdeProtocolo(protocoloId);
    const base = {
      ...linea,
      protocoloId,
      actividadAppId: actividad?.id || linea.actividadAppId,
      actividadErpId: actividad?.actividadErpId || linea.actividadErpId,
    };

    return {
      ...base,
      ...aplicarSugerenciasComerciales(base, base.destinoVenta || undefined),
    };
  }

  function obtenerCambiosDestino(linea: PlanificacionAgricolaLinea, destinoVenta: string): Partial<PlanificacionAgricolaLinea> {
    if (!linea.protocoloId) {
      return {
        destinoReferenciaId: undefined,
        destinoVenta,
        destinoVentaManual: true,
        precioReferenciaId: undefined,
        precioVentaEstimado: 0,
        precioVentaManual: false,
        gastosComercialesReferenciaId: undefined,
        gastosComercialesEstimados: 0,
      };
    }

    return aplicarSugerenciasComerciales(linea, destinoVenta);
  }

  function crearLineaDesdeLote(
    lote: LoteApp,
    planificacionId: string,
    indice: number,
    campaniaErpId: string,
    snapshotBase = planificacion,
  ): PlanificacionAgricolaLinea | undefined {
    const camposBasePorId = snapshotBase === planificacion
      ? camposAppPorId
      : new Map(snapshotBase.camposApp.map((campo) => [campo.id, campo]));
    const campo = camposBasePorId.get(lote.campoAppId);
    const actividad = snapshotBase.actividadesApp?.[0];
    const ahora = new Date().toISOString();

    if (!campo || !actividad) {
      return undefined;
    }

    const base: PlanificacionAgricolaLinea = {
      id: `linea-planificacion-${planificacionId}-${indice}-${Date.now()}`,
      planificacionId,
      empresaErpId: campo.empresaErpId,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      loteAppId: lote.id,
      loteErpId: lote.loteErpId,
      actividadAppId: actividad.id,
      actividadErpId: actividad.actividadErpId,
      destinoReferenciaId: undefined,
      destinoVenta: '',
      destinoVentaManual: false,
      precioReferenciaId: undefined,
      precioVentaEstimado: 0,
      precioVentaManual: false,
      hectareasPlanificadas: obtenerSuperficieInicialLote(lote),
      rindeEstimado: 0,
      gastosComercialesReferenciaId: undefined,
      gastosComercialesEstimados: 0,
      protocoloId: undefined,
      ingresoBrutoEstimado: 0,
      ingresoNetoEstimado: 0,
      costoProduccionEstimado: 0,
      margenBrutoEstimado: 0,
      margenBrutoActualizado: 0,
      estado: 'borrador',
      createdAt: ahora,
      updatedAt: ahora,
    };
    const protocolosCompatibles = snapshotBase.protocolos
      .filter((item) => {
        if (!item.activo || item.actividadAppId !== base.actividadAppId) {
          return false;
        }

        const coincideCampo = !item.campoAppId || item.campoAppId === base.campoAppId;
        const coincideZona = !item.zonaAppId || item.zonaAppId === campo.zonaAppId;

        return coincideCampo && coincideZona;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    const protocolo = protocolosCompatibles.find((item) => item.campaniaErpId === campaniaErpId) || protocolosCompatibles[0];
    const actividadProtocolo = protocolo
      ? snapshotBase.actividadesApp?.find((item) => item.id === protocolo.actividadAppId)
      : undefined;
    const lineaConProtocolo = {
      ...base,
      protocoloId: protocolo?.id,
      actividadAppId: actividadProtocolo?.id || base.actividadAppId,
      actividadErpId: actividadProtocolo?.actividadErpId || base.actividadErpId,
    };

    if (snapshotBase === planificacion) {
      return recalcularLinea({ ...lineaConProtocolo, ...aplicarSugerenciasComerciales(lineaConProtocolo) });
    }

    const destino = snapshotBase.destinosReferencia
      .filter((item) => item.activo)
      .sort((a, b) => {
        const pesoA = (a.campoAppId === lineaConProtocolo.campoAppId ? 3 : 0) + (a.campoErpId === lineaConProtocolo.campoErpId ? 2 : 0);
        const pesoB = (b.campoAppId === lineaConProtocolo.campoAppId ? 3 : 0) + (b.campoErpId === lineaConProtocolo.campoErpId ? 2 : 0);

        return pesoB - pesoA || a.destinoVenta.localeCompare(b.destinoVenta);
      })[0];
    const destinoVenta = destino?.destinoVenta || '';
    const precio = snapshotBase.preciosReferencia.find((item) => (
      item.activo
      && item.destinoVenta === destinoVenta
      && (
        (actividadProtocolo?.especieAppId && item.especieAppId === actividadProtocolo.especieAppId)
        || (actividadProtocolo?.especieErpId && item.especieErpId === actividadProtocolo.especieErpId)
        || item.actividadAppId === lineaConProtocolo.actividadAppId
      )
    ));
    const gastos = snapshotBase.gastosComercialesReferencia.find((item) => (
      item.activo
      && item.campaniaErpId === campaniaErpId
      && item.actividadAppId === lineaConProtocolo.actividadAppId
      && item.destinoVenta === destinoVenta
      && (!item.zonaAppId || item.zonaAppId === campo.zonaAppId)
      && (!item.zonaErpId || item.zonaErpId === campo.zonaErpId)
    ));
    const lineaConComercial = {
      ...lineaConProtocolo,
      destinoReferenciaId: destino?.id,
      destinoVenta,
      precioReferenciaId: precio?.id,
      precioVentaEstimado: precio?.valor || 0,
      gastosComercialesReferenciaId: gastos?.id,
      gastosComercialesEstimados: gastos
        ? gastos.items.reduce((total, item) => {
          const produccionEstimadaTn = lineaConProtocolo.hectareasPlanificadas * lineaConProtocolo.rindeEstimado;
          const baseCalculo = item.unidadCalculo === 'Ha' ? lineaConProtocolo.hectareasPlanificadas : produccionEstimadaTn;

          return total + item.valorPorTonelada * baseCalculo;
        }, 0)
        : 0,
    };

    return recalcularLinea(lineaConComercial);
  }

  function cambiarCampo(lineaId: string, campoAppId: string) {
    const campo = camposAppPorId.get(campoAppId);
    const lote = planificacion.lotesApp.find((item) => item.campoAppId === campoAppId);
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!campo || !lote || !linea) {
      return;
    }

    const base = {
      ...linea,
      empresaErpId: campo.empresaErpId,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      loteAppId: lote.id,
      loteErpId: lote.loteErpId,
      hectareasPlanificadas: obtenerSuperficieInicialLote(lote),
    };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarLote(lineaId: string, loteAppId: string) {
    const lote = lotesAppPorId.get(loteAppId);
    const campo = lote ? camposAppPorId.get(lote.campoAppId) : undefined;
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!lote || !campo || !linea) {
      return;
    }

    const base = {
      ...linea,
      empresaErpId: campo.empresaErpId,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      loteAppId: lote.id,
      loteErpId: lote.loteErpId,
      hectareasPlanificadas: obtenerSuperficieInicialLote(lote),
    };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarActividad(lineaId: string, actividadAppId: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);
    if (!linea) {
      return;
    }

    const actividad = planificacion.actividadesApp?.find((item) => item.id === actividadAppId);
    const base = { ...linea, actividadAppId, actividadErpId: actividad?.actividadErpId };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarProtocolo(lineaId: string, protocoloId?: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!linea) {
      return;
    }

    actualizarLinea(lineaId, obtenerCambiosProtocolo(linea, protocoloId));
  }

  function cambiarDestino(lineaId: string, destinoVenta: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!linea) {
      return;
    }

    actualizarLinea(lineaId, obtenerCambiosDestino(linea, destinoVenta));
  }

  function aplicarProtocoloALineas(lineaIds: string[], protocoloId: string) {
    if (!puedeEditarPlanificacion || !protocoloId) {
      return 0;
    }

    return actualizarLineas(lineaIds, (linea) => obtenerCambiosProtocolo(linea, protocoloId));
  }

  function aplicarDestinoALineas(lineaIds: string[], destinoVenta: string) {
    if (!puedeEditarPlanificacion || !destinoVenta) {
      return 0;
    }

    return actualizarLineas(lineaIds, (linea) => obtenerCambiosDestino(linea, destinoVenta));
  }

  function aplicarRindeALineas(lineaIds: string[], rindeEstimado: number) {
    if (!puedeEditarPlanificacion || !Number.isFinite(rindeEstimado) || rindeEstimado < 0) {
      return 0;
    }

    return actualizarLineas(lineaIds, () => ({ rindeEstimado }));
  }

  function eliminarLineaPlanificacion(lineaId: string) {
    if (!puedeEditarPlanificacion) {
      return;
    }

    actualizarPlanificacionActiva((actual) => ({ ...actual, lineas: actual.lineas.filter((linea) => linea.id !== lineaId) }));
  }

  function eliminarLineasPlanificacion(lineaIds: string[]) {
    if (!puedeEditarPlanificacion || lineaIds.length === 0) {
      return 0;
    }

    const ids = new Set(lineaIds);
    const eliminadas = lineasPlanificacion.filter((linea) => ids.has(linea.id)).length;

    actualizarPlanificacionActiva((actual) => {
      const lineas = actual.lineas.filter((linea) => !ids.has(linea.id));

      return { ...actual, lineas, updatedAt: new Date().toISOString() };
    });

    return eliminadas;
  }

  function agregarLotesAEscenario(loteAppIds: string[]) {
    if (!planificacionActiva || !puedeEditarPlanificacion || loteAppIds.length === 0) {
      return 0;
    }

    const idsSolicitados = new Set(loteAppIds);
    const lotesYaIncluidosActuales = new Set(planificacionActiva.lineas.map((linea) => linea.loteAppId));
    const lotesParaAgregar = planificacion.lotesApp.filter((lote) => idsSolicitados.has(lote.id) && !lotesYaIncluidosActuales.has(lote.id));

    actualizarPlanificacionActiva((actual) => {
      const lotesYaIncluidos = new Set(actual.lineas.map((linea) => linea.loteAppId));
      const nuevasLineas = lotesParaAgregar
        .filter((lote) => !lotesYaIncluidos.has(lote.id))
        .map((lote, indice) => crearLineaDesdeLote(lote, actual.id, actual.lineas.length + indice, actual.campaniaErpId))
        .filter((linea): linea is PlanificacionAgricolaLinea => Boolean(linea));

      if (!nuevasLineas.length) {
        return actual;
      }

      return {
        ...actual,
        lineas: [...actual.lineas, ...nuevasLineas],
        updatedAt: new Date().toISOString(),
      };
    });

    return lotesParaAgregar.length;
  }

  function copiarLineaPlanificacion(lineaId: string) {
    if (!puedeEditarPlanificacion) {
      return;
    }

    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!linea) {
      return;
    }

    const ahora = new Date().toISOString();
    const copia = recalcularLinea({
      ...linea,
      id: `linea-planificacion-copia-${Date.now()}`,
      createdAt: ahora,
      updatedAt: ahora,
    });

    actualizarPlanificacionActiva((actual) => {
      const indice = actual.lineas.findIndex((item) => item.id === lineaId);
      const lineas = [...actual.lineas];
      lineas.splice(indice + 1, 0, copia);

      return { ...actual, lineas, updatedAt: ahora };
    });
  }

  async function guardarPrecioReferenciaDesdeModal(precio: PrecioReferencia) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoPrecios(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar precios.');
      }

      const respuesta = await guardarPrecioReferencia(precio.id, {
        precio,
        origen: 'web',
        motivo: 'Alta o edicion de precio de referencia desde modal web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.preciosReferencia.some((item) => item.id === respuesta.precio.id);
        const siguiente = anexarDestinoSiNoExiste(actual, respuesta.precio);

        return {
          ...siguiente,
          preciosReferencia: existe
            ? siguiente.preciosReferencia.map((item) => (item.id === respuesta.precio.id ? respuesta.precio : item))
            : [respuesta.precio, ...siguiente.preciosReferencia],
        };
      });
      setPlanificacionEstado('Precio de referencia guardado con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Precio guardado',
        mensaje: 'El cambio quedo guardado y auditado.',
      });

      return true;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el precio en la base.';
      setPlanificacionEstado(`No se pudo guardar el precio: ${mensaje}`);
      notificar?.({
        tipo: 'error',
        titulo: 'No se guardo el precio',
        mensaje,
      });

      return false;
    } finally {
      setGuardandoPrecios(false);
    }
  }

  async function guardarGastoComercialDesdeModal(gasto: GastosComercialesReferencia) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoGastos(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar gastos comerciales.');
      }

      const respuesta = await guardarGastoComercialReferencia(gasto.id, {
        gasto,
        origen: 'web',
        motivo: 'Alta o edicion de gastos comerciales de referencia desde modal web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.gastosComercialesReferencia.some((item) => item.id === respuesta.gasto.id);

        return {
          ...actual,
          gastosComercialesReferencia: existe
            ? actual.gastosComercialesReferencia.map((item) => (item.id === respuesta.gasto.id ? respuesta.gasto : item))
            : [respuesta.gasto, ...actual.gastosComercialesReferencia],
        };
      });
      setPlanificacionEstado('Gastos comerciales guardados con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Gastos guardados',
        mensaje: 'El cambio quedo guardado y auditado.',
      });

      return true;
    } catch (error) {
      const gastoDemo = { ...gasto, updatedAt: new Date().toISOString() };

      setPlanificacion((actual) => {
        const existe = actual.gastosComercialesReferencia.some((item) => item.id === gastoDemo.id);

        return {
          ...actual,
          gastosComercialesReferencia: existe
            ? actual.gastosComercialesReferencia.map((item) => (item.id === gastoDemo.id ? gastoDemo : item))
            : [gastoDemo, ...actual.gastosComercialesReferencia],
        };
      });
      setPlanificacionEstado('API de gastos comerciales no disponible. Gasto guardado en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Gastos guardados en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoGastos(false);
    }
  }

  async function guardarConceptoGastoComercialDesdeModal(concepto: ConceptoGastoComercial) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoConceptosGastos(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar conceptos de gastos comerciales.');
      }

      const respuesta = await guardarConceptoGastoComercial(concepto.id, {
        concepto,
        origen: 'web',
        motivo: 'Alta o edicion de concepto de gasto comercial desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.conceptosGastosComerciales.some((item) => item.id === respuesta.concepto.id);

        return {
          ...actual,
          conceptosGastosComerciales: existe
            ? actual.conceptosGastosComerciales.map((item) => (item.id === respuesta.concepto.id ? respuesta.concepto : item))
            : [respuesta.concepto, ...actual.conceptosGastosComerciales],
        };
      });
      setPlanificacionEstado('Concepto de gasto comercial guardado con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Concepto guardado',
        mensaje: 'El padron maestro quedo actualizado y auditado.',
      });

      return true;
    } catch (error) {
      const nombre = limpiarTextoVisible(concepto.nombre);
      const conceptoDemo: ConceptoGastoComercial = {
        ...concepto,
        codigo: normalizarTexto(concepto.codigo || nombre),
        nombre,
        nombreNormalizado: normalizarTexto(nombre),
        unidadCalculo: concepto.unidadCalculo || 'Tn',
        descripcion: concepto.descripcion ? limpiarTextoVisible(concepto.descripcion) : undefined,
        updatedAt: new Date().toISOString(),
      };

      setPlanificacion((actual) => {
        const existe = actual.conceptosGastosComerciales.some((item) => item.id === conceptoDemo.id);

        return {
          ...actual,
          conceptosGastosComerciales: existe
            ? actual.conceptosGastosComerciales.map((item) => (item.id === conceptoDemo.id ? conceptoDemo : item))
            : [conceptoDemo, ...actual.conceptosGastosComerciales],
        };
      });
      setPlanificacionEstado('API de conceptos no disponible. Concepto guardado en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Concepto guardado en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoConceptosGastos(false);
    }
  }

  async function guardarDestinoVentaDesdeModal(destino: DestinoApp) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoDestinos(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar destinos de venta.');
      }

      const respuesta = await guardarDestinoVenta(destino.id, {
        destino,
        origen: 'web',
        motivo: 'Alta o edicion de destino de venta desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.destinosReferencia.some((item) => item.id === respuesta.destino.id);

        return {
          ...actual,
          destinosReferencia: existe
            ? actual.destinosReferencia.map((item) => (item.id === respuesta.destino.id ? respuesta.destino : item))
            : [respuesta.destino, ...actual.destinosReferencia],
        };
      });
      setPlanificacionEstado('Destino de venta guardado con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Destino guardado',
        mensaje: 'El padron maestro quedo actualizado y auditado.',
      });

      return true;
    } catch (error) {
      const destinoVenta = limpiarTextoVisible(destino.destinoVenta);
      const destinoDemo: DestinoApp = {
        ...destino,
        destinoVenta,
        destinoVentaNormalizado: normalizarTexto(destinoVenta),
        descripcion: destino.descripcion ? limpiarTextoVisible(destino.descripcion) : undefined,
        origen: 'app',
        updatedAt: new Date().toISOString(),
      };

      setPlanificacion((actual) => {
        const existe = actual.destinosReferencia.some((item) => item.id === destinoDemo.id);

        return {
          ...actual,
          destinosReferencia: existe
            ? actual.destinosReferencia.map((item) => (item.id === destinoDemo.id ? destinoDemo : item))
            : [destinoDemo, ...actual.destinosReferencia],
        };
      });
      setPlanificacionEstado('API de destinos no disponible. Destino guardado en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Destino guardado en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoDestinos(false);
    }
  }

  async function guardarServicioAppDesdeModal(labor: ServicioApp) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoLabores(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar labores.');
      }

      const respuesta = await guardarServicioApp(labor.id, {
        servicio: labor,
        origen: 'web',
        motivo: 'Alta o edicion de labor desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.serviciosApp.some((item) => item.id === respuesta.servicio.id);

        return {
          ...actual,
          serviciosApp: existe
            ? actual.serviciosApp.map((item) => (item.id === respuesta.servicio.id ? respuesta.servicio : item))
            : [respuesta.servicio, ...actual.serviciosApp],
        };
      });
      setPlanificacionEstado('Labor guardada con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Labor guardada',
        mensaje: 'El padron maestro quedo actualizado y auditado.',
      });

      return true;
    } catch (error) {
      const nombre = limpiarTextoVisible(labor.nombre);
      const laborDemo: ServicioApp = {
        ...labor,
        codigo: normalizarTexto(labor.codigo || nombre),
        nombre,
        descripcionAbreviada: labor.descripcionAbreviada ? limpiarTextoVisible(labor.descripcionAbreviada) : undefined,
        unidadSugerida: limpiarTextoVisible(labor.unidadSugerida || 'Ha'),
        estadoVinculacion: labor.estadoVinculacion || 'provisorio',
        origen: labor.origen || 'provisorio',
        updatedAt: new Date().toISOString(),
      };

      setPlanificacion((actual) => {
        const existe = actual.serviciosApp.some((item) => item.id === laborDemo.id);

        return {
          ...actual,
          serviciosApp: existe
            ? actual.serviciosApp.map((item) => (item.id === laborDemo.id ? laborDemo : item))
            : [laborDemo, ...actual.serviciosApp],
        };
      });
      setPlanificacionEstado('API de labores no disponible. Labor guardada en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Labor guardada en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoLabores(false);
    }
  }

  async function guardarInsumoAppDesdeModal(insumo: InsumoApp) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoInsumos(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar insumos.');
      }

      const respuesta = await guardarInsumoApp(insumo.id, {
        insumo,
        origen: 'web',
        motivo: 'Alta o edicion de insumo desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const insumosActuales = actual.insumosApp || [];
        const existe = insumosActuales.some((item) => item.id === respuesta.insumo.id);

        return {
          ...actual,
          insumosApp: existe
            ? insumosActuales.map((item) => (item.id === respuesta.insumo.id ? respuesta.insumo : item))
            : [respuesta.insumo, ...insumosActuales],
        };
      });
      setPlanificacionEstado('Insumo guardado con auditoria.');
      notificar?.({
        tipo: 'success',
        titulo: 'Insumo guardado',
        mensaje: 'El padron maestro quedo actualizado y auditado.',
      });

      return true;
    } catch (error) {
      const nombre = limpiarTextoVisible(insumo.nombre);
      const insumoDemo: InsumoApp = {
        ...insumo,
        nombre,
        codigoInterno: normalizarTexto(insumo.codigoInterno || nombre),
        tipo: insumo.tipo ? limpiarTextoVisible(insumo.tipo) : undefined,
        unidad: limpiarTextoVisible(insumo.unidad || 'Unid'),
        moneda: limpiarTextoVisible(insumo.moneda || 'USD').toUpperCase(),
        estadoVinculacion: insumo.estadoVinculacion || 'provisorio',
        updatedAt: new Date().toISOString(),
      };

      setPlanificacion((actual) => {
        const insumosActuales = actual.insumosApp || [];
        const existe = insumosActuales.some((item) => item.id === insumoDemo.id);

        return {
          ...actual,
          insumosApp: existe
            ? insumosActuales.map((item) => (item.id === insumoDemo.id ? insumoDemo : item))
            : [insumoDemo, ...insumosActuales],
        };
      });
      setPlanificacionEstado('API de insumos no disponible. Insumo guardado en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Insumo guardado en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
    } finally {
      setGuardandoInsumos(false);
    }
  }

  async function guardarBorradorPlanificacion() {
    if (!sesion || !planificacionActiva) {
      return;
    }

    setGuardandoPlanificacion(true);

    try {
      if (tieneLineasDuplicadas) {
        setPlanificacionEstado('No se puede guardar: hay lineas duplicadas para la misma campania, campo, lote y actividad.');
        notificar?.({
          tipo: 'error',
          titulo: 'No se pudo guardar',
          mensaje: 'Hay lineas duplicadas para la misma campania, campo, lote y actividad.',
        });
        return;
      }

      const respuesta = await guardarPlanificacion(planificacionActiva.id, {
        planificacion: planificacionActiva,
        origen: 'web',
        motivo: 'Guardado de borrador desde planilla web',
      }, sesion.token);

      actualizarPlanificacionActiva(() => respuesta.planificacion);
      setPlanificacionEstado(respuesta.mensaje);
      notificar?.({
        tipo: 'success',
        titulo: 'Planificacion guardada',
        mensaje: respuesta.auditado ? 'El borrador fue persistido con auditoria.' : respuesta.mensaje,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Borrador guardado localmente. API/DB no disponible para persistir.';
      setPlanificacionEstado(mensaje);
      notificar?.({
        tipo: 'error',
        titulo: 'No se pudo persistir',
        mensaje,
      });
    } finally {
      setGuardandoPlanificacion(false);
    }
  }

  async function cerrarPlanificacionActiva(planificacionId: string) {
    const snapshotPlanificacion = planificacionCargada ? planificacion : await asegurarPlanificacion();
    const planificacionObjetivo = snapshotPlanificacion?.planificaciones.find((item) => item.id === planificacionId);

    if (!sesion || !planificacionObjetivo || !sesion.permisos.includes('planificacion:cerrar')) {
      return;
    }

    if (planificacionObjetivo.estado === 'cerrada' || planificacionObjetivo.estado === 'deshabilitada') {
      return;
    }

    setCerrandoPlanificacion(true);

    try {
      if (tieneLineasDuplicadasEnPlanificacion(planificacionObjetivo)) {
        setPlanificacionEstado('No se puede cerrar: hay lineas duplicadas para la misma campania, campo, lote y actividad.');
        notificar?.({
          tipo: 'error',
          titulo: 'No se pudo cerrar',
          mensaje: 'Resolvé las lineas duplicadas antes de cerrar la planificacion.',
        });
        return;
      }

      const respuesta = await cerrarPlanificacion(planificacionObjetivo.id, {
        origen: 'web',
        motivo: 'Cierre de planificacion desde demo web',
      }, sesion.token);

      setPlanificacion((actual) => ({
        ...actual,
        planificaciones: actual.planificaciones.map((item) => {
          if (item.id === respuesta.planificacion.id) {
            return respuesta.planificacion;
          }

          if (item.campaniaErpId === respuesta.planificacion.campaniaErpId && item.estado !== 'deshabilitada') {
            return {
              ...item,
              estado: 'deshabilitada',
              escenarioOriginal: false,
              escenarioBloqueadoPorId: respuesta.planificacion.id,
              updatedAt: new Date().toISOString(),
            };
          }

          return item;
        }),
      }));
      setPlanificacionSeleccionadaId(respuesta.planificacion.id);
      setPlanificacionEstado(respuesta.mensaje);
      notificar?.({
        tipo: 'success',
        titulo: 'Planificacion cerrada',
        mensaje: respuesta.auditado ? 'Quedo como escenario original y se deshabilitaron escenarios alternativos de la campania.' : respuesta.mensaje,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cerrar la planificacion.';
      setPlanificacionEstado(mensaje);
      notificar?.({
        tipo: 'error',
        titulo: 'No se pudo cerrar',
        mensaje,
      });
    } finally {
      setCerrandoPlanificacion(false);
    }
  }

  return {
    planificacion,
    planificacionesResumen,
    planificacionEstado,
    planificacionCargada,
    resumenPlanificacionCargado,
    cargandoPlanificacion,
    cargandoResumenPlanificacion,
    guardandoPlanificacion,
    cerrandoPlanificacion,
    guardandoPrecios,
    guardandoGastos,
    guardandoConceptosGastos,
    guardandoDestinos,
    guardandoLabores,
    guardandoInsumos,
    planificacionActiva,
    lineasPlanificacion,
    camposAppPorId,
    lotesAppPorId,
    protocolosPorId,
    margenBrutoTotal,
    ingresoNetoTotal,
    costoTotal,
    hectareasPlanificadas,
    camposProvisorios,
    puedeEditarPlanificacion,
    puedeEditarPlanificacionPorPermiso,
    puedeConfigurarPlanificacion,
    puedeCerrarPlanificacion,
    clavesDuplicadas,
    tieneLineasDuplicadas,
    asegurarPlanificacion,
    seleccionarPlanificacion,
    crearEscenarioPlanificacion,
    copiarEscenarioPlanificacion,
    actualizarCabeceraPlanificacion,
    cambiarCampaniaPlanificacion,
    actualizarLinea,
    cambiarCampo,
    cambiarLote,
    cambiarActividad,
    cambiarProtocolo,
    cambiarDestino,
    aplicarProtocoloALineas,
    aplicarDestinoALineas,
    aplicarRindeALineas,
    agregarLotesAEscenario,
    copiarLineaPlanificacion,
    eliminarLineaPlanificacion,
    eliminarLineasPlanificacion,
    guardarPrecioReferenciaDesdeModal,
    guardarGastoComercialDesdeModal,
    guardarConceptoGastoComercialDesdeModal,
    guardarDestinoVentaDesdeModal,
    guardarServicioAppDesdeModal,
    guardarInsumoAppDesdeModal,
    obtenerProtocolosCompatibles,
    refrescarPlanificacion,
    incorporarProtocoloPlanificacion,
    guardarBorradorPlanificacion,
    cerrarPlanificacionActiva,
  };
}
