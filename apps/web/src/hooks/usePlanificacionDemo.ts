import { useEffect, useState } from 'react';
import {
  ConceptoGastoComercial,
  DestinoVentaReferencia,
  ErpSnapshot,
  GastosComercialesReferencia,
  InsumoPlanificacion,
  LaborReferencia,
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
  guardarInsumoPlanificacion,
  guardarLaborReferencia,
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

export function usePlanificacionDemo(sesion: SesionUsuario | null, snapshot: ErpSnapshot, notificar?: Notificar) {
  const [planificacion, setPlanificacion] = useState<PlanificacionSnapshot>(planificacionFallback);
  const [planificacionEstado, setPlanificacionEstado] = useState('Planificacion demo local');
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
    async function cargarPlanificacion() {
      if (!sesion) {
        return;
      }

      try {
        setPlanificacion(await obtenerPlanificacionSnapshot(sesion.token));
        setPlanificacionEstado('Planificacion desde API mock');
      } catch (error) {
        setPlanificacion(planificacionFallback);
        setPlanificacionEstado('API de planificacion no disponible. Usando mock local.');
      }
    }

    cargarPlanificacion();
  }, [sesion]);

  const planificacionActiva = planificacion.planificaciones.find((item) => item.id === planificacionSeleccionadaId) || planificacion.planificaciones[0];
  const lineasPlanificacion = planificacionActiva?.lineas || [];
  const camposPlanificacionPorId = new Map(planificacion.camposPlanificacion.map((campo) => [campo.id, campo]));
  const lotesPlanificacionPorId = new Map(planificacion.lotesPlanificacion.map((lote) => [lote.id, lote]));
  const protocolosPorId = new Map(planificacion.protocolos.map((protocolo) => [protocolo.id, protocolo]));
  const margenBrutoTotal = lineasPlanificacion.reduce((total, linea) => total + linea.margenBrutoEstimado, 0);
  const ingresoNetoTotal = lineasPlanificacion.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0);
  const costoTotal = lineasPlanificacion.reduce((total, linea) => total + linea.costoProduccionEstimado, 0);
  const hectareasPlanificadas = lineasPlanificacion.reduce((total, linea) => total + linea.hectareasPlanificadas, 0);
  const camposProvisorios = planificacion.camposPlanificacion.filter((campo) => campo.estadoVinculacion === 'provisorio').length;
  const puedeEditarPlanificacionPorPermiso = Boolean(sesion?.permisos.includes('planificacion:editar'));
  const puedeEditarPlanificacion = Boolean(puedeEditarPlanificacionPorPermiso && planificacionActiva?.estado !== 'cerrada');
  const puedeConfigurarPlanificacion = Boolean(sesion?.permisos.includes('planificacion:configurar'));
  const puedeCerrarPlanificacion = Boolean(sesion?.permisos.includes('planificacion:cerrar') && planificacionActiva?.estado !== 'cerrada');

  function crearDestinoReferenciaDesdePrecio(precio: PrecioReferencia): DestinoVentaReferencia {
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
  const clavesLineas = lineasPlanificacion.map((linea) => `${planificacionActiva?.campaniaErpId}|${linea.campoPlanificacionId}|${linea.lotePlanificacionId}|${linea.actividadPlanificacionId}`);
  const clavesDuplicadas = new Set(clavesLineas.filter((clave, indice) => clavesLineas.indexOf(clave) !== indice));
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

    return referencia.items.reduce((total, item) => total + item.valorPorTonelada * produccionEstimadaTn, 0);
  }

  function buscarDestinoSugerido(linea: Pick<PlanificacionAgricolaLinea, 'campoPlanificacionId' | 'campoErpId' | 'actividadPlanificacionId'>) {
    return planificacion.destinosReferencia
      .filter((item) => item.activo && (!item.actividadPlanificacionId || item.actividadPlanificacionId === linea.actividadPlanificacionId))
      .sort((a, b) => {
        const pesoA = (a.campoPlanificacionId === linea.campoPlanificacionId ? 3 : 0) + (a.campoErpId === linea.campoErpId ? 2 : 0);
        const pesoB = (b.campoPlanificacionId === linea.campoPlanificacionId ? 3 : 0) + (b.campoErpId === linea.campoErpId ? 2 : 0);

        return pesoB - pesoA || a.destinoVenta.localeCompare(b.destinoVenta);
      })[0];
  }

  function buscarPrecioSugerido(actividadPlanificacionId: string, destinoVenta: string) {
    return planificacion.preciosReferencia.find((item) => item.activo && item.actividadPlanificacionId === actividadPlanificacionId && item.destinoVenta === destinoVenta)
      || planificacion.preciosReferencia.find((item) => item.activo && item.actividadPlanificacionId === actividadPlanificacionId);
  }

  function buscarGastosSugeridos(
    linea: Pick<PlanificacionAgricolaLinea, 'campoPlanificacionId' | 'campoErpId' | 'actividadPlanificacionId' | 'destinoVenta'>,
    campaniaErpId = planificacionActiva?.campaniaErpId,
  ) {
    const campo = camposPlanificacionPorId.get(linea.campoPlanificacionId);

    return planificacion.gastosComercialesReferencia
      .filter((item) => (
        item.activo
        && item.campaniaErpId === campaniaErpId
        && item.actividadPlanificacionId === linea.actividadPlanificacionId
        && (!item.destinoVenta || item.destinoVenta === linea.destinoVenta)
        && (!item.zonaPlanificacionId || item.zonaPlanificacionId === campo?.zonaPlanificacionId)
        && (!item.zonaErpId || item.zonaErpId === campo?.zonaErpId)
      ))
      .sort((a, b) => {
        const pesoA = (
          (a.campoPlanificacionId === linea.campoPlanificacionId ? 6 : 0)
          + (a.campoErpId === linea.campoErpId ? 4 : 0)
          + (a.zonaPlanificacionId === campo?.zonaPlanificacionId ? 3 : 0)
          + (a.zonaErpId === campo?.zonaErpId ? 2 : 0)
        );
        const pesoB = (
          (b.campoPlanificacionId === linea.campoPlanificacionId ? 6 : 0)
          + (b.campoErpId === linea.campoErpId ? 4 : 0)
          + (b.zonaPlanificacionId === campo?.zonaPlanificacionId ? 3 : 0)
          + (b.zonaErpId === campo?.zonaErpId ? 2 : 0)
        );

        return pesoB - pesoA;
      })[0];
  }

  function obtenerProtocolosCompatibles(linea: Pick<PlanificacionAgricolaLinea, 'actividadPlanificacionId' | 'campoPlanificacionId' | 'campoErpId'>) {
    const campo = camposPlanificacionPorId.get(linea.campoPlanificacionId);

    return planificacion.protocolos
      .filter((protocolo) => {
        if (!protocolo.activo || protocolo.actividadPlanificacionId !== linea.actividadPlanificacionId) {
          return false;
        }

        const coincideCampo = !protocolo.campoPlanificacionId || protocolo.campoPlanificacionId === linea.campoPlanificacionId;
        const coincideZona = !protocolo.zonaPlanificacionId || protocolo.zonaPlanificacionId === campo?.zonaPlanificacionId;

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

  function aplicarSugerenciasComerciales(linea: PlanificacionAgricolaLinea, destinoForzado?: string): Partial<PlanificacionAgricolaLinea> {
    const destino = destinoForzado
      ? planificacion.destinosReferencia.find((item) => (
        item.destinoVenta === destinoForzado
        && (!item.actividadPlanificacionId || item.actividadPlanificacionId === linea.actividadPlanificacionId)
      ))
      : buscarDestinoSugerido(linea);
    const destinoVenta = destinoForzado || destino?.destinoVenta || '';
    const precio = buscarPrecioSugerido(linea.actividadPlanificacionId, destinoVenta);
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

  function cambiarCampo(lineaId: string, campoPlanificacionId: string) {
    const campo = camposPlanificacionPorId.get(campoPlanificacionId);
    const lote = planificacion.lotesPlanificacion.find((item) => item.campoPlanificacionId === campoPlanificacionId);
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!campo || !lote || !linea) {
      return;
    }

    const base = {
      ...linea,
      empresaErpId: campo.empresaErpId,
      campoPlanificacionId: campo.id,
      campoErpId: campo.campoErpId,
      lotePlanificacionId: lote.id,
      loteErpId: lote.loteErpId,
      hectareasPlanificadas: lote.superficieProductiva,
    };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarLote(lineaId: string, lotePlanificacionId: string) {
    const lote = lotesPlanificacionPorId.get(lotePlanificacionId);
    const campo = lote ? camposPlanificacionPorId.get(lote.campoPlanificacionId) : undefined;
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);

    if (!lote || !campo || !linea) {
      return;
    }

    const base = {
      ...linea,
      empresaErpId: campo.empresaErpId,
      campoPlanificacionId: campo.id,
      campoErpId: campo.campoErpId,
      lotePlanificacionId: lote.id,
      loteErpId: lote.loteErpId,
      hectareasPlanificadas: lote.superficieProductiva,
    };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
      ...aplicarSugerenciasComerciales(base),
    });
  }

  function cambiarActividad(lineaId: string, actividadPlanificacionId: string) {
    const linea = lineasPlanificacion.find((item) => item.id === lineaId);
    if (!linea) {
      return;
    }

    const actividad = planificacion.actividadesPlanificacion?.find((item) => item.id === actividadPlanificacionId);
    const base = { ...linea, actividadPlanificacionId, actividadErpId: actividad?.actividadErpId };
    const protocolo = obtenerProtocolosCompatibles(base)[0];

    actualizarLinea(lineaId, {
      ...base,
      protocoloId: protocolo?.id,
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
    const campoPorDefectoId = ultimaLinea?.campoPlanificacionId || planificacion.camposPlanificacion[0]?.id;
    const lote = planificacion.lotesPlanificacion.find((item) => item.campoPlanificacionId === campoPorDefectoId) || planificacion.lotesPlanificacion[0];
    const campo = lote ? camposPlanificacionPorId.get(lote.campoPlanificacionId) : undefined;
    const actividad = planificacion.actividadesPlanificacion?.[0];
    const destino = actividad ? planificacion.destinosReferencia.find((item) => !item.actividadPlanificacionId || item.actividadPlanificacionId === actividad.id) : undefined;
    const precio = actividad ? planificacion.preciosReferencia.find((item) => item.actividadPlanificacionId === actividad.id && (!destino || item.destinoVenta === destino.destinoVenta)) : undefined;
    const ahora = new Date().toISOString();

    if (!lote || !campo || !actividad) {
      return;
    }

    const base: PlanificacionAgricolaLinea = {
      id: `linea-planificacion-${Date.now()}`,
      planificacionId: planificacionActiva.id,
      empresaErpId: campo.empresaErpId,
      campoPlanificacionId: campo.id,
      campoErpId: campo.campoErpId,
      lotePlanificacionId: lote.id,
      loteErpId: lote.loteErpId,
      actividadPlanificacionId: actividad.id,
      actividadErpId: actividad.actividadErpId,
      destinoReferenciaId: destino?.id,
      destinoVenta: destino?.destinoVenta || '',
      destinoVentaManual: !destino,
      precioReferenciaId: precio?.id,
      precioVentaEstimado: precio?.valor || 0,
      precioVentaManual: !precio,
      hectareasPlanificadas: lote.superficieProductiva,
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
      const precioDemo = { ...precio, destinoVenta: limpiarTextoVisible(precio.destinoVenta), updatedAt: new Date().toISOString() };

      setPlanificacion((actual) => {
        const existe = actual.preciosReferencia.some((item) => item.id === precioDemo.id);
        const siguiente = anexarDestinoSiNoExiste(actual, precioDemo);

        return {
          ...siguiente,
          preciosReferencia: existe
            ? siguiente.preciosReferencia.map((item) => (item.id === precioDemo.id ? precioDemo : item))
            : [precioDemo, ...siguiente.preciosReferencia],
        };
      });
      setPlanificacionEstado('API de precios no disponible. Precio guardado en memoria demo.');
      notificar?.({
        tipo: 'info',
        titulo: 'Precio guardado en demo',
        mensaje: 'Cuando la base este disponible, esta accion se guardara con auditoria real.',
      });

      return true;
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

  async function guardarDestinoVentaDesdeModal(destino: DestinoVentaReferencia) {
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
      const destinoDemo: DestinoVentaReferencia = {
        ...destino,
        destinoVenta,
        destinoVentaNormalizado: normalizarTexto(destinoVenta),
        descripcion: destino.descripcion ? limpiarTextoVisible(destino.descripcion) : undefined,
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

  async function guardarLaborReferenciaDesdeModal(labor: LaborReferencia) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoLabores(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar labores.');
      }

      const respuesta = await guardarLaborReferencia(labor.id, {
        labor,
        origen: 'web',
        motivo: 'Alta o edicion de labor desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const existe = actual.laboresReferencia.some((item) => item.id === respuesta.labor.id);

        return {
          ...actual,
          laboresReferencia: existe
            ? actual.laboresReferencia.map((item) => (item.id === respuesta.labor.id ? respuesta.labor : item))
            : [respuesta.labor, ...actual.laboresReferencia],
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
      const laborDemo: LaborReferencia = {
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
        const existe = actual.laboresReferencia.some((item) => item.id === laborDemo.id);

        return {
          ...actual,
          laboresReferencia: existe
            ? actual.laboresReferencia.map((item) => (item.id === laborDemo.id ? laborDemo : item))
            : [laborDemo, ...actual.laboresReferencia],
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

  async function guardarInsumoPlanificacionDesdeModal(insumo: InsumoPlanificacion) {
    if (!puedeConfigurarPlanificacion) {
      return false;
    }

    setGuardandoInsumos(true);

    try {
      if (!sesion) {
        throw new Error('No hay sesion activa para auditar insumos.');
      }

      const respuesta = await guardarInsumoPlanificacion(insumo.id, {
        insumo,
        origen: 'web',
        motivo: 'Alta o edicion de insumo desde padron maestro web',
      }, sesion.token);

      setPlanificacion((actual) => {
        const insumosActuales = actual.insumosPlanificacion || [];
        const existe = insumosActuales.some((item) => item.id === respuesta.insumo.id);

        return {
          ...actual,
          insumosPlanificacion: existe
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
      const insumoDemo: InsumoPlanificacion = {
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
        const insumosActuales = actual.insumosPlanificacion || [];
        const existe = insumosActuales.some((item) => item.id === insumoDemo.id);

        return {
          ...actual,
          insumosPlanificacion: existe
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
        motivo: 'Guardado de borrador desde planilla web demo',
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

      actualizarPlanificacionActiva(() => respuesta.planificacion);
      setPlanificacionEstado(respuesta.mensaje);
      notificar?.({
        tipo: 'success',
        titulo: 'Planificacion cerrada',
        mensaje: respuesta.auditado ? 'Quedo bloqueada para edicion y registrada en auditoria.' : respuesta.mensaje,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? `${error.message}. Cierre aplicado localmente para demo.` : 'Planificacion cerrada localmente para demo.';
      actualizarPlanificacionActiva((actual) => ({
        ...actual,
        estado: 'cerrada',
        cerradaPor: sesion.usuario.id,
        cerradaAt: new Date().toISOString(),
        motivoCierre: 'Cierre local para validar UX sin base de datos disponible.',
      }));
      setPlanificacionEstado(mensaje);
      notificar?.({
        tipo: 'info',
        titulo: 'Cierre simulado',
        mensaje,
      });
    } finally {
      setCerrandoPlanificacion(false);
    }
  }

  return {
    planificacion,
    planificacionEstado,
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
    camposPlanificacionPorId,
    lotesPlanificacionPorId,
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
    seleccionarPlanificacion,
    actualizarCabeceraPlanificacion,
    cambiarCampaniaPlanificacion,
    actualizarLinea,
    cambiarCampo,
    cambiarLote,
    cambiarActividad,
    cambiarDestino,
    agregarLineaPlanificacion,
    eliminarLineaPlanificacion,
    guardarPrecioReferenciaDesdeModal,
    guardarGastoComercialDesdeModal,
    guardarConceptoGastoComercialDesdeModal,
    guardarDestinoVentaDesdeModal,
    guardarLaborReferenciaDesdeModal,
    guardarInsumoPlanificacionDesdeModal,
    obtenerProtocolosCompatibles,
    guardarBorradorPlanificacion,
    cerrarPlanificacionActiva,
  };
}
