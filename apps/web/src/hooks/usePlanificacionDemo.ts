import { useCallback, useEffect, useMemo, useState } from 'react';
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
  obtenerPlanificacionSnapshot,
} from '../services/api';
import { planificacionFallback } from '../data/demoData';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarTexto(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function obtenerSuperficieInicialLote(lote: LoteApp) {
  if (Number.isFinite(lote.superficieProductiva) && lote.superficieProductiva > 0) {
    return lote.superficieProductiva;
  }

  if (Number.isFinite(lote.superficieTotal) && lote.superficieTotal > 0) {
    return lote.superficieTotal;
  }

  return 0;
}

export function usePlanificacionDemo(sesion: SesionUsuario | null, snapshot: ErpSnapshot, notificar?: Notificar, cargarAutomaticamente = true) {
  const [planificacion, setPlanificacion] = useState<PlanificacionSnapshot>(planificacionFallback);
  const [planificacionEstado, setPlanificacionEstado] = useState('Planificacion demo local');
  const [planificacionCargada, setPlanificacionCargada] = useState(false);
  const [cargandoPlanificacion, setCargandoPlanificacion] = useState(false);
  const [guardandoPlanificacion, setGuardandoPlanificacion] = useState(false);
  const [cerrandoPlanificacion, setCerrandoPlanificacion] = useState(false);
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const [guardandoGastos, setGuardandoGastos] = useState(false);
  const [guardandoConceptosGastos, setGuardandoConceptosGastos] = useState(false);
  const [guardandoDestinos, setGuardandoDestinos] = useState(false);
  const [guardandoLabores, setGuardandoLabores] = useState(false);
  const [guardandoInsumos, setGuardandoInsumos] = useState(false);
  const [planificacionSeleccionadaId, setPlanificacionSeleccionadaId] = useState<string>();

  const refrescarPlanificacion = useCallback(async (opciones: { forzar?: boolean } = {}) => {
    if (!sesion) {
      return;
    }

    setCargandoPlanificacion(true);

    try {
      setPlanificacion(await obtenerPlanificacionSnapshot(sesion.token, opciones));
      setPlanificacionCargada(true);
      setPlanificacionEstado('Planificacion actualizada desde API.');
    } catch (error) {
      setPlanificacion(planificacionFallback);
      setPlanificacionCargada(true);
      setPlanificacionEstado('No se pudo refrescar la planificacion desde API.');
    } finally {
      setCargandoPlanificacion(false);
    }
  }, [sesion]);

  useEffect(() => {
    if (!sesion) {
      setPlanificacion(planificacionFallback);
      setPlanificacionCargada(false);
      setPlanificacionEstado('Planificacion demo local');
      return;
    }

    if (!cargarAutomaticamente || planificacionCargada || cargandoPlanificacion) {
      return;
    }

    void refrescarPlanificacion();
  }, [cargarAutomaticamente, cargandoPlanificacion, planificacionCargada, refrescarPlanificacion, sesion]);

  const asegurarPlanificacion = useCallback(async () => {
    if (!planificacionCargada && !cargandoPlanificacion) {
      await refrescarPlanificacion();
    }
  }, [cargandoPlanificacion, planificacionCargada, refrescarPlanificacion]);

  const planificacionActiva = planificacion.planificaciones.find((item) => item.id === planificacionSeleccionadaId) || planificacion.planificaciones[0];
  const lineasPlanificacion = planificacionActiva?.lineas || [];
  const camposAppPorId = useMemo(() => new Map(planificacion.camposApp.map((campo) => [campo.id, campo])), [planificacion.camposApp]);
  const lotesAppPorId = useMemo(() => new Map(planificacion.lotesApp.map((lote) => [lote.id, lote])), [planificacion.lotesApp]);
  const protocolosPorId = useMemo(() => new Map(planificacion.protocolos.map((protocolo) => [protocolo.id, protocolo])), [planificacion.protocolos]);
  const resumenPlanificacion = useMemo(() => lineasPlanificacion.reduce((total, linea) => ({
    margenBrutoTotal: total.margenBrutoTotal + linea.margenBrutoEstimado,
    ingresoNetoTotal: total.ingresoNetoTotal + linea.ingresoNetoEstimado,
    costoTotal: total.costoTotal + linea.costoProduccionEstimado,
    hectareasPlanificadas: total.hectareasPlanificadas + linea.hectareasPlanificadas,
  }), {
    margenBrutoTotal: 0,
    ingresoNetoTotal: 0,
    costoTotal: 0,
    hectareasPlanificadas: 0,
  }), [lineasPlanificacion]);
  const margenBrutoTotal = resumenPlanificacion.margenBrutoTotal;
  const ingresoNetoTotal = resumenPlanificacion.ingresoNetoTotal;
  const costoTotal = resumenPlanificacion.costoTotal;
  const hectareasPlanificadas = resumenPlanificacion.hectareasPlanificadas;
  const camposProvisorios = useMemo(() => planificacion.camposApp.filter((campo) => campo.estadoVinculacion === 'provisorio').length, [planificacion.camposApp]);
  const puedeEditarPlanificacionPorPermiso = Boolean(sesion?.permisos.includes('planificacion:editar'));
  const planificacionActivaBloqueada = planificacionActiva?.estado === 'cerrada' || planificacionActiva?.estado === 'deshabilitada';
  const puedeEditarPlanificacion = Boolean(puedeEditarPlanificacionPorPermiso && !planificacionActivaBloqueada);
  const puedeConfigurarPlanificacion = Boolean(sesion?.permisos.includes('planificacion:configurar'));
  const puedeCerrarPlanificacion = Boolean(sesion?.permisos.includes('planificacion:cerrar') && !planificacionActivaBloqueada);

  function crearDestinoReferenciaDesdePrecio(precio: PrecioReferencia): DestinoApp {
    const ahora = new Date().toISOString();
    const destinoVenta = limpiarTextoVisible(precio.destinoVenta);

    return {
      id: `destino-precio-${precio.id}`,
      clienteId: precio.clienteId,
      empresaErpId: precio.empresaErpId,
      destinoVenta,
      destinoVentaNormalizado: normalizarTexto(destinoVenta),
      descripcion: `Destino creado desde precio ${destinoVenta}`,
      activo: true,
      origen: 'app',
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  function anexarDestinoSiNoExiste(snapshotActual: PlanificacionSnapshot, precio: PrecioReferencia): PlanificacionSnapshot {
    const destinoNormalizado = normalizarTexto(precio.destinoVenta);
    const existeDestino = snapshotActual.destinosReferencia.some((destino) => (
      (destino.destinoVentaNormalizado || normalizarTexto(destino.destinoVenta)) === destinoNormalizado
    ));

    if (existeDestino) {
      return snapshotActual;
    }

    return {
      ...snapshotActual,
      destinosReferencia: [crearDestinoReferenciaDesdePrecio(precio), ...snapshotActual.destinosReferencia],
    };
  }
  const clavesDuplicadas = useMemo(() => {
    const cantidades = new Map<string, number>();

    for (const linea of lineasPlanificacion) {
      const clave = `${planificacionActiva?.campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;
      cantidades.set(clave, (cantidades.get(clave) || 0) + 1);
    }

    return new Set(Array.from(cantidades.entries()).filter(([, cantidad]) => cantidad > 1).map(([clave]) => clave));
  }, [lineasPlanificacion, planificacionActiva?.campaniaErpId]);
  const tieneLineasDuplicadas = clavesDuplicadas.size > 0;

  function recalcularLinea(linea: PlanificacionAgricolaLinea): PlanificacionAgricolaLinea {
    const gastosComercialesEstimados = linea.gastosComercialesReferenciaId
      ? calcularGastosComerciales(linea, linea.gastosComercialesReferenciaId)
      : linea.gastosComercialesEstimados;
    const protocolo = linea.protocoloId ? protocolosPorId.get(linea.protocoloId) : undefined;
    const ingresoBrutoEstimado = linea.hectareasPlanificadas * linea.rindeEstimado * linea.precioVentaEstimado;
    const ingresoNetoEstimado = ingresoBrutoEstimado - gastosComercialesEstimados;
    const costoProduccionEstimado = linea.hectareasPlanificadas * (protocolo?.costoEstimadoPorHa || 0);

    return {
      ...linea,
      gastosComercialesEstimados,
      ingresoBrutoEstimado,
      ingresoNetoEstimado,
      costoProduccionEstimado,
      margenBrutoEstimado: ingresoNetoEstimado - costoProduccionEstimado,
      margenBrutoActualizado: ingresoNetoEstimado - costoProduccionEstimado,
    };
  }

  function calcularGastosComerciales(linea: PlanificacionAgricolaLinea, referenciaId?: string) {
    const referencia = planificacion.gastosComercialesReferencia.find((item) => item.id === referenciaId);

    if (!referencia) {
      return linea.gastosComercialesEstimados;
    }

    const produccionEstimadaTn = linea.hectareasPlanificadas * linea.rindeEstimado;

    return referencia.items.reduce((total, item) => {
      const baseCalculo = item.unidadCalculo === 'Ha' ? linea.hectareasPlanificadas : produccionEstimadaTn;

      return total + item.valorPorTonelada * baseCalculo;
    }, 0);
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
    return planificacion.preciosReferencia.find((item) => item.activo && item.actividadAppId === actividadAppId && item.destinoVenta === destinoVenta)
      || planificacion.preciosReferencia.find((item) => item.activo && item.actividadAppId === actividadAppId);
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
        && (!item.destinoVenta || item.destinoVenta === linea.destinoVenta)
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

    const existeOriginalCerrado = planificacion.planificaciones.some((item) => (
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
      lineas: planificacion.lotesApp
        .map((lote, indice) => crearLineaDesdeLote(lote, id, indice, datos.campaniaErpId))
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

    const origen = planificacion.planificaciones.find((item) => item.id === planificacionId);

    if (!origen) {
      return undefined;
    }

    const existeOriginalCerrado = planificacion.planificaciones.some((item) => (
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
    actualizarPlanificacionActiva((actual) => ({
      ...actual,
      campaniaErpId,
      lineas: actual.lineas.map((linea) => {
        const gastos = buscarGastosSugeridos(linea, campaniaErpId);

        return recalcularLinea({
          ...linea,
          gastosComercialesReferenciaId: gastos?.id,
          gastosComercialesEstimados: gastos ? calcularGastosComerciales(linea, gastos.id) : 0,
          updatedAt: new Date().toISOString(),
        });
      }),
    }));
  }

  function actualizarLinea(id: string, cambios: Partial<PlanificacionAgricolaLinea>) {
    actualizarPlanificacionActiva((actual) => ({
      ...actual,
      lineas: actual.lineas.map((linea) => (linea.id === id ? recalcularLinea({ ...linea, ...cambios }) : linea)),
    }));
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
      precioVentaEstimado: precio?.valor || linea.precioVentaEstimado,
      precioVentaManual: !precio,
      gastosComercialesReferenciaId: gastos?.id,
      gastosComercialesEstimados: calcularGastosComerciales({ ...linea, destinoVenta, precioVentaEstimado: precio?.valor || linea.precioVentaEstimado }, gastos?.id),
    };
  }

  function crearLineaDesdeLote(lote: LoteApp, planificacionId: string, indice: number, campaniaErpId: string): PlanificacionAgricolaLinea | undefined {
    const campo = camposAppPorId.get(lote.campoAppId);
    const actividad = planificacion.actividadesApp?.[0];
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
    const protocolo = obtenerProtocolosCompatibles(base).find((item) => item.campaniaErpId === campaniaErpId) || obtenerProtocolosCompatibles(base)[0];
    const actividadProtocolo = obtenerActividadDesdeProtocolo(protocolo?.id);
    const lineaConProtocolo = {
      ...base,
      protocoloId: protocolo?.id,
      actividadAppId: actividadProtocolo?.id || base.actividadAppId,
      actividadErpId: actividadProtocolo?.actividadErpId || base.actividadErpId,
    };

    return recalcularLinea({ ...lineaConProtocolo, ...aplicarSugerenciasComerciales(lineaConProtocolo) });
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

    const actividad = obtenerActividadDesdeProtocolo(protocoloId);
    const base = {
      ...linea,
      protocoloId,
      actividadAppId: actividad?.id || linea.actividadAppId,
      actividadErpId: actividad?.actividadErpId || linea.actividadErpId,
    };

    actualizarLinea(lineaId, {
      ...base,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarDestino(lineaId: string, destinoVenta: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!linea) {
      return;
    }

    actualizarLinea(lineaId, aplicarSugerenciasComerciales(linea, destinoVenta));
  }

  function agregarLineaPlanificacion() {
    if (!planificacionActiva || !puedeEditarPlanificacion) {
      return;
    }

    const ultimaLinea = planificacionActiva.lineas[planificacionActiva.lineas.length - 1];
    const campoPorDefectoId = ultimaLinea?.campoAppId || planificacion.camposApp[0]?.id;
    const lote = planificacion.lotesApp.find((item) => item.campoAppId === campoPorDefectoId) || planificacion.lotesApp[0];
    const campo = lote ? camposAppPorId.get(lote.campoAppId) : undefined;
    const actividad = planificacion.actividadesApp?.[0];
    const destino = actividad ? planificacion.destinosReferencia.find((item) => item.activo) : undefined;
    const precio = actividad ? planificacion.preciosReferencia.find((item) => item.actividadAppId === actividad.id && (!destino || item.destinoVenta === destino.destinoVenta)) : undefined;
    const ahora = new Date().toISOString();

    if (!lote || !campo || !actividad) {
      return;
    }

    const base: PlanificacionAgricolaLinea = {
      id: `linea-planificacion-${Date.now()}`,
      planificacionId: planificacionActiva.id,
      empresaErpId: campo.empresaErpId,
      campoAppId: campo.id,
      campoErpId: campo.campoErpId,
      loteAppId: lote.id,
      loteErpId: lote.loteErpId,
      actividadAppId: actividad.id,
      actividadErpId: actividad.actividadErpId,
      destinoReferenciaId: destino?.id,
      destinoVenta: destino?.destinoVenta || '',
      destinoVentaManual: !destino,
      precioReferenciaId: precio?.id,
      precioVentaEstimado: precio?.valor || 0,
      precioVentaManual: !precio,
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
    const protocolo = obtenerProtocolosCompatibles(base)[0];
    const nuevaLinea = recalcularLinea({ ...base, protocoloId: protocolo?.id, ...aplicarSugerenciasComerciales(base) });

    actualizarPlanificacionActiva((actual) => ({ ...actual, lineas: [...actual.lineas, nuevaLinea] }));
  }

  function eliminarLineaPlanificacion(lineaId: string) {
    if (!puedeEditarPlanificacion) {
      return;
    }

    actualizarPlanificacionActiva((actual) => ({ ...actual, lineas: actual.lineas.filter((linea) => linea.id !== lineaId) }));
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

  async function cerrarPlanificacionActiva() {
    if (!sesion || !planificacionActiva || !puedeCerrarPlanificacion) {
      return;
    }

    setCerrandoPlanificacion(true);

    try {
      if (tieneLineasDuplicadas) {
        setPlanificacionEstado('No se puede cerrar: hay lineas duplicadas para la misma campania, campo, lote y actividad.');
        notificar?.({
          tipo: 'error',
          titulo: 'No se pudo cerrar',
          mensaje: 'Resolvé las lineas duplicadas antes de cerrar la planificacion.',
        });
        return;
      }

      const respuesta = await cerrarPlanificacion(planificacionActiva.id, {
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
    planificacionEstado,
    planificacionCargada,
    cargandoPlanificacion,
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
    agregarLineaPlanificacion,
    copiarLineaPlanificacion,
    eliminarLineaPlanificacion,
    guardarPrecioReferenciaDesdeModal,
    guardarGastoComercialDesdeModal,
    guardarConceptoGastoComercialDesdeModal,
    guardarDestinoVentaDesdeModal,
    guardarServicioAppDesdeModal,
    guardarInsumoAppDesdeModal,
    obtenerProtocolosCompatibles,
    refrescarPlanificacion,
    guardarBorradorPlanificacion,
    cerrarPlanificacionActiva,
  };
}
