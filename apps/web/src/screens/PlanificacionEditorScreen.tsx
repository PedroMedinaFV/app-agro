import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { ErpCultivo, PlanificacionAgricolaLinea } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DecimalInput } from '../components/DecimalInput';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { PlanificacionBulkActions } from '../components/planificacion/PlanificacionBulkActions';
import { EstadoCargaFiltro, PlanificacionFilters } from '../components/planificacion/PlanificacionFilters';
import { PlanificacionScopeActions, TipoAlcancePlanificacion } from '../components/planificacion/PlanificacionScopeActions';
import { formatearNumero } from '../utils/formatters';
import {
  calcularResumenGrupoPlanificacion,
  formatearCultivosAntecesores,
  idsErpCoinciden,
  lineaPlanificacionEstaCompleta,
  lineaPlanificacionTieneDatos,
  normalizarTexto,
  obtenerClaveLinea,
  obtenerCodigoCampaniaAnterior,
} from '../utils/planificacion/planificacionHelpers';
import { PlanificacionBaseProps } from './planificacionTypes';

type PlanificacionEditorScreenProps = PlanificacionBaseProps & {
  onVolverResumen: () => void;
};

export function PlanificacionEditorScreen({
  planificacion,
  snapshot,
  campaniasDisponibles,
  puedeEditarPlanificacion,
  guardandoPlanificacion,
  planificacionActiva,
  lineasPlanificacion,
  hectareasPlanificadas,
  ingresoNetoTotal,
  costoTotal,
  margenBrutoTotal,
  tieneLineasDuplicadas,
  clavesDuplicadas,
  camposAppPorId,
  lotesAppPorId,
  protocolosPorId,
  actualizarCabeceraPlanificacion,
  cambiarCampaniaPlanificacion,
  agregarLotesAEscenario,
  guardarBorradorPlanificacion,
  cambiarLote,
  cambiarProtocolo,
  cambiarDestino,
  actualizarLinea,
  aplicarProtocoloALineas,
  aplicarDestinoALineas,
  aplicarRindeALineas,
  copiarLineaPlanificacion,
  eliminarLineaPlanificacion,
  eliminarLineasPlanificacion,
  obtenerProtocolosCompatibles,
  formatearUsd,
  leerNumero,
  onVolverResumen,
}: PlanificacionEditorScreenProps) {
  const [zonasAbiertas, setZonasAbiertas] = useState<Set<string>>(new Set());
  const [camposAbiertos, setCamposAbiertos] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [filtroZonaId, setFiltroZonaId] = useState('');
  const [filtroCampoId, setFiltroCampoId] = useState('');
  const [filtroEstadoCarga, setFiltroEstadoCarga] = useState<EstadoCargaFiltro>('todos');
  const [protocoloMasivoId, setProtocoloMasivoId] = useState('');
  const [destinoMasivo, setDestinoMasivo] = useState('');
  const [rindeMasivo, setRindeMasivo] = useState('');
  const [resultadoAccionMasiva, setResultadoAccionMasiva] = useState('');
  const [tipoAlcanceAgregar, setTipoAlcanceAgregar] = useState<TipoAlcancePlanificacion>('zona');
  const [alcanceAgregarId, setAlcanceAgregarId] = useState('');
  const [confirmacionQuitarAlcance, setConfirmacionQuitarAlcance] = useState<{
    etiqueta: string;
    lineaIds: string[];
    totalLineas: number;
    lineasConDatos: number;
  } | null>(null);
  const [confirmacionCambioCampania, setConfirmacionCambioCampania] = useState<{
    campaniaErpId: string;
    codigo: string;
  } | null>(null);
  const zonasAppPorId = useMemo(() => new Map((planificacion.zonasApp || []).map((zona) => [zona.id, zona])), [planificacion.zonasApp]);
  const zonasErpPorId = useMemo(() => new Map(snapshot.zonas.flatMap((zona) => [
    [zona.erpId, zona.nombre],
    [`${zona.empresaErpId}:${zona.idZona}`, zona.nombre],
    [`zona:${zona.idZona}`, zona.nombre],
    [String(zona.idZona), zona.nombre],
  ])), [snapshot.zonas]);
  const lotesPorCampo = useMemo(() => {
    const grupos = new Map<string, typeof planificacion.lotesApp>();

    for (const lote of planificacion.lotesApp) {
      const lotes = grupos.get(lote.campoAppId) || [];
      lotes.push(lote);
      grupos.set(lote.campoAppId, lotes);
    }

    return grupos;
  }, [planificacion.lotesApp]);
  const destinosDisponibles = useMemo(() => (
    planificacion.destinosReferencia
      .filter((item) => item.activo)
      .sort((a, b) => a.destinoVenta.localeCompare(b.destinoVenta))
  ), [planificacion.destinosReferencia]);
  const actividadNombrePorErpId = useMemo(() => {
    const actividades = new Map<string, string>();

    for (const actividad of planificacion.actividadesApp || []) {
      if (actividad.actividadErpId) {
        actividades.set(actividad.actividadErpId, actividad.nombre);
      }
    }

    return actividades;
  }, [planificacion.actividadesApp]);
  const campaniaPlanificada = useMemo(() => campaniasDisponibles.find((campania) => (
    idsErpCoinciden(campania.erpId, planificacionActiva?.campaniaErpId)
  )), [campaniasDisponibles, planificacionActiva?.campaniaErpId]);
  const campaniaAnterior = useMemo(() => {
    const codigoAnterior = obtenerCodigoCampaniaAnterior(campaniaPlanificada?.codigo);

    if (!codigoAnterior) {
      return undefined;
    }

    return campaniasDisponibles.find((campania) => campania.codigo === codigoAnterior);
  }, [campaniaPlanificada?.codigo, campaniasDisponibles]);
  const cultivosAntecesoresPorLote = useMemo(() => {
    const grupos = new Map<string, ErpCultivo[]>();
    const cultivosDisponibles = planificacion.cultivosErp || snapshot.cultivos;

    if (!campaniaAnterior) {
      return grupos;
    }

    for (const cultivo of cultivosDisponibles) {
      if (!cultivo.activo || !idsErpCoinciden(cultivo.campaniaErpId, campaniaAnterior.erpId)) {
        continue;
      }

      const cultivos = grupos.get(cultivo.loteErpId) || [];
      cultivos.push(cultivo);
      grupos.set(cultivo.loteErpId, cultivos);
    }

    for (const cultivos of grupos.values()) {
      cultivos.sort((a, b) => b.hectareas - a.hectareas || a.nombre.localeCompare(b.nombre, 'es'));
    }

    return grupos;
  }, [planificacion.cultivosErp, snapshot.cultivos, campaniaAnterior]);
  const gastosComercialesPorId = useMemo(() => (
    new Map(planificacion.gastosComercialesReferencia.map((gasto) => [gasto.id, gasto]))
  ), [planificacion.gastosComercialesReferencia]);
  const zonasParaFiltro = useMemo(() => {
    const zonas = new Map<string, string>();

    for (const linea of lineasPlanificacion) {
      const campo = camposAppPorId.get(linea.campoAppId);
      const zonaId = campo?.zonaAppId || campo?.zonaErpId || 'sin-zona';
      zonas.set(zonaId, obtenerNombreZona(campo?.zonaAppId, campo?.zonaErpId));
    }

    return Array.from(zonas.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [lineasPlanificacion, camposAppPorId, planificacion.zonasApp, snapshot.zonas]);
  const camposParaFiltro = useMemo(() => {
    const campos = new Map<string, { id: string; nombre: string; zonaId: string }>();

    for (const linea of lineasPlanificacion) {
      const campo = camposAppPorId.get(linea.campoAppId);
      const zonaId = campo?.zonaAppId || campo?.zonaErpId || 'sin-zona';

      if (!filtroZonaId || filtroZonaId === zonaId) {
        campos.set(linea.campoAppId, {
          id: linea.campoAppId,
          nombre: campo?.nombre || 'Campo no disponible',
          zonaId,
        });
      }
    }

    return Array.from(campos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [lineasPlanificacion, camposAppPorId, filtroZonaId]);
  const busquedaNormalizada = normalizarTexto(busqueda);
  const lineasFiltradas = useMemo(() => lineasPlanificacion.filter((linea) => {
    const campo = camposAppPorId.get(linea.campoAppId);
    const lote = lotesAppPorId.get(linea.loteAppId);
    const protocolo = linea.protocoloId ? protocolosPorId.get(linea.protocoloId) : undefined;
    const zonaId = campo?.zonaAppId || campo?.zonaErpId || 'sin-zona';
    const zonaNombre = obtenerNombreZona(campo?.zonaAppId, campo?.zonaErpId);
    const claveLinea = obtenerClaveLinea(planificacionActiva?.campaniaErpId, linea);
    const lineaDuplicada = clavesDuplicadas.has(claveLinea);
    const lineaCompleta = lineaPlanificacionEstaCompleta(linea);
    const textoLinea = normalizarTexto([
      zonaNombre,
      campo?.nombre,
      lote?.nombre,
      protocolo?.nombre,
      linea.destinoVenta,
    ].filter(Boolean).join(' '));

    if (filtroZonaId && filtroZonaId !== zonaId) {
      return false;
    }

    if (filtroCampoId && filtroCampoId !== linea.campoAppId) {
      return false;
    }

    if (filtroEstadoCarga === 'completas' && !lineaCompleta) {
      return false;
    }

    if (filtroEstadoCarga === 'pendientes' && lineaCompleta) {
      return false;
    }

    if (filtroEstadoCarga === 'duplicadas' && !lineaDuplicada) {
      return false;
    }

    return !busquedaNormalizada || textoLinea.includes(busquedaNormalizada);
  }), [
    lineasPlanificacion,
    camposAppPorId,
    lotesAppPorId,
    protocolosPorId,
    planificacionActiva?.campaniaErpId,
    clavesDuplicadas,
    filtroZonaId,
    filtroCampoId,
    filtroEstadoCarga,
    busquedaNormalizada,
    planificacion.zonasApp,
    snapshot.zonas,
  ]);
  const lineasAgrupadas = useMemo(() => {
    const zonas = new Map<string, { id: string; nombre: string; campos: Map<string, { id: string; nombre: string; lineas: PlanificacionAgricolaLinea[] }> }>();

    for (const linea of lineasFiltradas) {
      const campo = camposAppPorId.get(linea.campoAppId);
      const zonaId = campo?.zonaAppId || campo?.zonaErpId || 'sin-zona';
      const zonaNombre = obtenerNombreZona(campo?.zonaAppId, campo?.zonaErpId);
      const zona = zonas.get(zonaId) || { id: zonaId, nombre: zonaNombre, campos: new Map() };
      const campoId = campo?.id || linea.campoAppId;
      const campoGrupo = zona.campos.get(campoId) || { id: campoId, nombre: campo?.nombre || 'Campo no disponible', lineas: [] };

      campoGrupo.lineas.push(linea);
      zona.campos.set(campoId, campoGrupo);
      zonas.set(zonaId, zona);
    }

    return Array.from(zonas.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((zona) => ({
        ...zona,
        campos: Array.from(zona.campos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      }));
  }, [lineasFiltradas, camposAppPorId, planificacion.zonasApp, snapshot.zonas]);
  const protocolosParaAccionMasiva = useMemo(() => {
    const protocolos = new Map<string, { id: string; nombre: string }>();

    for (const linea of lineasFiltradas) {
      for (const protocolo of obtenerProtocolosParaLinea(linea)) {
        protocolos.set(protocolo.id, { id: protocolo.id, nombre: protocolo.nombre });
      }
    }

    return Array.from(protocolos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [lineasFiltradas, planificacion.protocolos, planificacionActiva?.campaniaErpId, camposAppPorId]);
  const destinosParaAccionMasiva = useMemo(() => {
    const destinos = new Map<string, string>();

    for (const linea of lineasFiltradas) {
      for (const destino of planificacion.destinosReferencia) {
        if (destino.activo) {
          destinos.set(normalizarTexto(destino.destinoVenta), destino.destinoVenta);
        }
      }
    }

    return Array.from(destinos.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }, [lineasFiltradas, destinosDisponibles]);
  const lineasConHectareasExcedidas = useMemo(() => lineasPlanificacion.filter((linea) => {
    const lote = lotesAppPorId.get(linea.loteAppId);

    return Boolean(
      lote
      && Number.isFinite(lote.superficieTotal)
      && lote.superficieTotal >= 0
      && linea.hectareasPlanificadas > lote.superficieTotal
    );
  }), [lineasPlanificacion, lotesAppPorId]);
  const lotesIncluidosIds = useMemo(() => new Set(lineasPlanificacion.map((linea) => linea.loteAppId)), [lineasPlanificacion]);
  const lotesDisponiblesParaAgregar = useMemo(() => (
    planificacion.lotesApp
      .filter((lote) => !lotesIncluidosIds.has(lote.id))
      .sort((a, b) => {
        const campoA = camposAppPorId.get(a.campoAppId)?.nombre || '';
        const campoB = camposAppPorId.get(b.campoAppId)?.nombre || '';
        return campoA.localeCompare(campoB, 'es') || a.nombre.localeCompare(b.nombre, 'es');
      })
  ), [planificacion.lotesApp, lotesIncluidosIds, camposAppPorId]);
  const opcionesAlcanceAgregar = useMemo(() => {
    if (tipoAlcanceAgregar === 'lote') {
      return lotesDisponiblesParaAgregar.map((lote) => {
        const campo = camposAppPorId.get(lote.campoAppId);
        return { id: lote.id, nombre: `${campo?.nombre || 'Campo no disponible'} / ${lote.nombre}` };
      });
    }

    if (tipoAlcanceAgregar === 'campo') {
      const campos = new Map<string, string>();

      for (const lote of lotesDisponiblesParaAgregar) {
        const campo = camposAppPorId.get(lote.campoAppId);
        if (campo) {
          campos.set(campo.id, campo.nombre);
        }
      }

      return Array.from(campos.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }

    const zonas = new Map<string, string>();

    for (const lote of lotesDisponiblesParaAgregar) {
      const campo = camposAppPorId.get(lote.campoAppId);
      const zonaId = campo?.zonaAppId || campo?.zonaErpId || 'sin-zona';
      zonas.set(zonaId, obtenerNombreZona(campo?.zonaAppId, campo?.zonaErpId));
    }

    return Array.from(zonas.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [tipoAlcanceAgregar, lotesDisponiblesParaAgregar, camposAppPorId, planificacion.zonasApp, snapshot.zonas]);

  function alternarZona(zonaId: string, abierta: boolean) {
    setZonasAbiertas((actuales) => {
      const siguientes = new Set(actuales);

      if (abierta) {
        siguientes.add(zonaId);
      } else {
        siguientes.delete(zonaId);
      }

      return siguientes;
    });
  }

  function alternarCampo(campoId: string, abierto: boolean) {
    setCamposAbiertos((actuales) => {
      const siguientes = new Set(actuales);

      if (abierto) {
        siguientes.add(campoId);
      } else {
        siguientes.delete(campoId);
      }

      return siguientes;
    });
  }

  function expandirTodo() {
    setZonasAbiertas(new Set(lineasAgrupadas.map((zona) => zona.id)));
    setCamposAbiertos(new Set(lineasAgrupadas.flatMap((zona) => zona.campos.map((campo) => campo.id))));
  }

  function contraerTodo() {
    setZonasAbiertas(new Set());
    setCamposAbiertos(new Set());
  }

  function alternarTodoArbol() {
    const todasLasZonasAbiertas = lineasAgrupadas.length > 0 && lineasAgrupadas.every((zona) => zonasAbiertas.has(zona.id));
    const todosLosCamposAbiertos = lineasAgrupadas
      .flatMap((zona) => zona.campos)
      .every((campo) => camposAbiertos.has(campo.id));

    if (todasLasZonasAbiertas && todosLosCamposAbiertos) {
      contraerTodo();
    } else {
      expandirTodo();
    }
  }

  function expandirCamposDeZona(campoIds: string[]) {
    setCamposAbiertos((actuales) => new Set([...actuales, ...campoIds]));
  }

  function contraerCamposDeZona(campoIds: string[]) {
    setCamposAbiertos((actuales) => {
      const siguientes = new Set(actuales);

      for (const campoId of campoIds) {
        siguientes.delete(campoId);
      }

      return siguientes;
    });
  }

  function alternarCamposDeZona(event: MouseEvent<HTMLButtonElement>, zonaId: string, campoIds: string[]) {
    event.preventDefault();
    event.stopPropagation();

    setZonasAbiertas((actuales) => new Set([...actuales, zonaId]));

    const zonaEstaAbierta = zonasAbiertas.has(zonaId);
    const todosLosCamposAbiertos = campoIds.length > 0 && campoIds.every((campoId) => camposAbiertos.has(campoId));

    if (zonaEstaAbierta && todosLosCamposAbiertos) {
      contraerCamposDeZona(campoIds);
    } else {
      expandirCamposDeZona(campoIds);
    }
  }

  function limpiarFiltros() {
    setBusqueda('');
    setFiltroZonaId('');
    setFiltroCampoId('');
    setFiltroEstadoCarga('todos');
  }

  function aplicarProtocoloAFiltradas() {
    if (!protocoloMasivoId || !puedeEditarPlanificacion) {
      return;
    }

    const lineaIds = lineasFiltradas
      .filter((linea) => obtenerProtocolosParaLinea(linea).some((protocolo) => protocolo.id === protocoloMasivoId))
      .map((linea) => linea.id);
    const aplicadas = aplicarProtocoloALineas(lineaIds, protocoloMasivoId);

    setResultadoAccionMasiva(`Protocolo aplicado en ${aplicadas} de ${lineasFiltradas.length} linea(s) filtradas.`);
  }

  function aplicarDestinoAFiltradas() {
    if (!destinoMasivo || !puedeEditarPlanificacion) {
      return;
    }

    const destinoCompatible = planificacion.destinosReferencia.some((destino) => (
      destino.activo
      && destino.destinoVenta === destinoMasivo
    ));
    const lineaIds = destinoCompatible ? lineasFiltradas.map((linea) => linea.id) : [];
    const aplicadas = aplicarDestinoALineas(lineaIds, destinoMasivo);

    setResultadoAccionMasiva(`Destino aplicado en ${aplicadas} de ${lineasFiltradas.length} linea(s) filtradas.`);
  }

  function aplicarRindeAFiltradas() {
    const rinde = leerNumero(rindeMasivo);

    if (!Number.isFinite(rinde) || rinde < 0 || !puedeEditarPlanificacion) {
      return;
    }

    const aplicadas = aplicarRindeALineas(lineasFiltradas.map((linea) => linea.id), rinde);

    setResultadoAccionMasiva(`Rinde aplicado en ${aplicadas} de ${lineasFiltradas.length} linea(s) filtradas.`);
  }

  function obtenerLoteIdsParaAgregar() {
    if (!alcanceAgregarId) {
      return [];
    }

    if (tipoAlcanceAgregar === 'lote') {
      return lotesDisponiblesParaAgregar.some((lote) => lote.id === alcanceAgregarId) ? [alcanceAgregarId] : [];
    }

    if (tipoAlcanceAgregar === 'campo') {
      return lotesDisponiblesParaAgregar
        .filter((lote) => lote.campoAppId === alcanceAgregarId)
        .map((lote) => lote.id);
    }

    return lotesDisponiblesParaAgregar
      .filter((lote) => {
        const campo = camposAppPorId.get(lote.campoAppId);
        const zonaId = campo?.zonaAppId || campo?.zonaErpId || 'sin-zona';

        return zonaId === alcanceAgregarId;
      })
      .map((lote) => lote.id);
  }

  function agregarAlcanceEscenario() {
    const loteIds = obtenerLoteIdsParaAgregar();

    if (!puedeEditarPlanificacion || loteIds.length === 0) {
      return;
    }

    const agregadas = agregarLotesAEscenario(loteIds);
    setResultadoAccionMasiva(`Se agregaron ${agregadas} linea(s) al escenario.`);
    setAlcanceAgregarId('');
  }

  function solicitarCambioCampania(campaniaErpId: string) {
    if (!planificacionActiva || campaniaErpId === planificacionActiva.campaniaErpId) {
      return;
    }

    const campania = campaniasDisponibles.find((item) => item.erpId === campaniaErpId);

    setConfirmacionCambioCampania({
      campaniaErpId,
      codigo: campania?.codigo || campaniaErpId,
    });
  }

  function confirmarCambioCampania() {
    if (!confirmacionCambioCampania) {
      return;
    }

    cambiarCampaniaPlanificacion(confirmacionCambioCampania.campaniaErpId);
    setResultadoAccionMasiva('Se cambio la campania y se resetearon protocolos, rindes, precios, gastos, costos y resultados.');
    setConfirmacionCambioCampania(null);
  }

  function quitarLineasDelEscenario(event: MouseEvent<HTMLButtonElement>, lineas: PlanificacionAgricolaLinea[], etiqueta: string) {
    event.preventDefault();
    event.stopPropagation();

    if (!puedeEditarPlanificacion || lineas.length === 0) {
      return;
    }

    setConfirmacionQuitarAlcance({
      etiqueta,
      lineaIds: lineas.map((linea) => linea.id),
      totalLineas: lineas.length,
      lineasConDatos: lineas.filter(lineaPlanificacionTieneDatos).length,
    });
  }

  function confirmarQuitarAlcance() {
    if (!confirmacionQuitarAlcance) {
      return;
    }

    const eliminadas = eliminarLineasPlanificacion(confirmacionQuitarAlcance.lineaIds);
    setResultadoAccionMasiva(`Se quitaron ${eliminadas} linea(s) de ${confirmacionQuitarAlcance.etiqueta}.`);
    setConfirmacionQuitarAlcance(null);
  }

  function calcularResumenGrupo(lineas: PlanificacionAgricolaLinea[]) {
    return calcularResumenGrupoPlanificacion(lineas, planificacionActiva?.campaniaErpId, clavesDuplicadas);
  }

  function obtenerNombreZona(zonaAppId?: string, zonaErpId?: string) {
    const zonaPropia = zonaAppId ? zonasAppPorId.get(zonaAppId) : undefined;

    if (zonaPropia) {
      return zonaPropia.nombre;
    }

    if (!zonaErpId) {
      return 'Sin zona';
    }

    return zonasErpPorId.get(zonaErpId)
      || Array.from(zonasErpPorId.entries()).find(([id]) => zonaErpId.endsWith(`:${id}`))?.[1]
      || 'Sin zona';
  }

  function obtenerProtocolosParaLinea(linea: PlanificacionAgricolaLinea) {
    const campo = camposAppPorId.get(linea.campoAppId);

    return planificacion.protocolos
      .filter((protocolo) => {
        if (!protocolo.activo || protocolo.campaniaErpId !== planificacionActiva?.campaniaErpId) {
          return false;
        }

        const coincideCampo = !protocolo.campoAppId || protocolo.campoAppId === linea.campoAppId;
        const coincideZona = !protocolo.zonaAppId || protocolo.zonaAppId === campo?.zonaAppId;

        return coincideCampo && coincideZona;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }

  function renderLinea(linea: PlanificacionAgricolaLinea) {
    const lote = lotesAppPorId.get(linea.loteAppId);
    const protocolo = linea.protocoloId ? protocolosPorId.get(linea.protocoloId) : undefined;
    const gastoReferencia = linea.gastosComercialesReferenciaId ? gastosComercialesPorId.get(linea.gastosComercialesReferenciaId) : undefined;
    const gastosResumen = gastoReferencia?.items
      .map((item) => `${formatearUsd(item.valorPorTonelada)} / ${item.unidadCalculo || 'Tn'}`)
      .join(' + ');
    const produccionEstimada = linea.hectareasPlanificadas * linea.rindeEstimado;
    const margenPorHa = linea.hectareasPlanificadas > 0 ? linea.margenBrutoEstimado / linea.hectareasPlanificadas : 0;
    const ingresoNetoPorHa = linea.hectareasPlanificadas > 0 ? linea.ingresoNetoEstimado / linea.hectareasPlanificadas : 0;
    const costoProduccionPorHa = linea.hectareasPlanificadas > 0 ? linea.costoProduccionEstimado / linea.hectareasPlanificadas : 0;
    const gastosComercialesPorHa = linea.hectareasPlanificadas > 0 ? linea.gastosComercialesEstimados / linea.hectareasPlanificadas : 0;
    const gastosComercialesPorTn = produccionEstimada > 0 ? linea.gastosComercialesEstimados / produccionEstimada : 0;
    const lotesDelCampo = lotesPorCampo.get(linea.campoAppId) || [];
    const protocolosCompatibles = obtenerProtocolosParaLinea(linea);
    const claveLinea = obtenerClaveLinea(planificacionActiva?.campaniaErpId, linea);
    const lineaDuplicada = clavesDuplicadas.has(claveLinea);
    const cultivosAntecesores = lote?.loteErpId ? cultivosAntecesoresPorLote.get(lote.loteErpId) || [] : [];
    const hectareasExcedidas = Boolean(lote && linea.hectareasPlanificadas > lote.superficieTotal);

    return (
      <div className={`planning-row ${lineaDuplicada ? 'duplicated' : ''} ${hectareasExcedidas ? 'planning-row-error' : ''}`} key={linea.id}>
        <div className="planning-row-main">
          <div className="planning-cell-wide">
            <span className="cell-label">Lote</span>
            <select value={linea.loteAppId} onChange={(event) => cambiarLote(linea.id, event.target.value)} disabled={!puedeEditarPlanificacion}>
              {lotesDelCampo.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
            <span>prod. {lote?.superficieProductiva ?? '-'} ha / total {lote?.superficieTotal ?? '-'} ha</span>
          </div>

          <div className="planning-cell-wide planning-cell-antecesor">
            <span className="cell-label">Antecesor</span>
            <span>{formatearCultivosAntecesores(cultivosAntecesores, actividadNombrePorErpId)}</span>
          </div>

          <div className="planning-cell-wide">
            <span className="cell-label">Protocolo</span>
            <select value={linea.protocoloId || ''} onChange={(event) => cambiarProtocolo(linea.id, event.target.value || undefined)} disabled={!puedeEditarPlanificacion}>
              <option value="">Sin protocolo</option>
              {protocolosCompatibles.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
            <span>{protocolo ? `${formatearUsd(protocolo.costoEstimadoPorHa)} / ha - act. ${new Date(protocolo.updatedAt).toLocaleDateString('es-AR')}` : 'Selecciona protocolo para definir actividad'}</span>
            {lineaDuplicada && <span className="cell-error">Actividad duplicada para este lote</span>}
          </div>

          <div className="planning-cell-wide">
            <span className="cell-label">Destino</span>
            <select value={linea.destinoVenta} onChange={(event) => cambiarDestino(linea.id, event.target.value)} disabled={!puedeEditarPlanificacion}>
              {destinosDisponibles.map((destino) => (
                <option key={destino.id} value={destino.destinoVenta}>{destino.destinoVenta}</option>
              ))}
              {!destinosDisponibles.some((destino) => destino.destinoVenta === linea.destinoVenta) && (
                <option value={linea.destinoVenta}>{linea.destinoVenta || 'Sin destino'}</option>
              )}
            </select>
            <span>{linea.destinoVentaManual ? 'Manual' : 'Sugerido'}</span>
          </div>
        </div>

        <div className="planning-row-inputs">
          <div className="planning-cell-number">
            <span className="cell-label">Hectareas</span>
            <DecimalInput value={linea.hectareasPlanificadas} onValueChange={(value) => actualizarLinea(linea.id, { hectareasPlanificadas: value })} disabled={!puedeEditarPlanificacion} commitOnBlur />
            <span>max. {lote?.superficieTotal ?? '-'} ha</span>
            {hectareasExcedidas && <span className="cell-error">Supera la superficie total del lote</span>}
          </div>

          <div className="planning-cell-number">
            <span className="cell-label">Rinde</span>
            <DecimalInput value={linea.rindeEstimado} onValueChange={(value) => actualizarLinea(linea.id, { rindeEstimado: value })} disabled={!puedeEditarPlanificacion} commitOnBlur />
            <span>tn/ha - prod. {produccionEstimada.toFixed(2)} tn</span>
          </div>

          <div className="planning-cell-number">
            <span className="cell-label">P. venta</span>
            <DecimalInput value={linea.precioVentaEstimado} onValueChange={(value) => actualizarLinea(linea.id, { precioVentaEstimado: value, precioVentaManual: true })} disabled={!puedeEditarPlanificacion} commitOnBlur />
            <span>{linea.precioVentaManual ? 'Manual' : 'Referencia'}</span>
          </div>

          <div className="planning-cell-number">
            <span className="cell-label">Gtos com</span>
            <DecimalInput value={linea.gastosComercialesEstimados} onValueChange={(value) => actualizarLinea(linea.id, { gastosComercialesEstimados: value, gastosComercialesReferenciaId: undefined })} disabled={!puedeEditarPlanificacion} commitOnBlur />
            <span>{gastoReferencia ? `${gastosResumen} - ${gastoReferencia.items.length} items` : `${formatearUsd(gastosComercialesPorTn, 2)} / tn equiv.`}</span>
          </div>
        </div>

        <div className="planning-row-summary">
          <div className="planning-cell-summary">
            <span className="cell-label">Ingreso neto</span>
            <strong>{formatearUsd(linea.ingresoNetoEstimado)}</strong>
            <span>{formatearNumero(ingresoNetoPorHa, 2)} USD/ha</span>
           
          </div>

          <div className="planning-cell-summary">
            <span className="cell-label">Margen bruto</span>
            <strong>{formatearUsd(linea.margenBrutoEstimado)}</strong>
            <span>{formatearNumero((linea.ingresoNetoEstimado - linea.costoProduccionEstimado) / linea.hectareasPlanificadas, 2)} USD/ha </span>
          </div>

          <div className="row-actions planning-cell-actions">
            <IconButton
              icon="copy"
              label="Copiar linea"
              onClick={() => copiarLineaPlanificacion(linea.id)}
              disabled={!puedeEditarPlanificacion}
            />
            <IconButton
              icon="close"
              className="danger-icon"
              label="Quitar linea"
              onClick={() => eliminarLineaPlanificacion(linea.id)}
              disabled={!puedeEditarPlanificacion || lineasPlanificacion.length === 1}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Edicion de planificacion"
        title={planificacionActiva?.nombre || 'Planificacion sin nombre'}
        description="Carga por zona, campo y lote. Al elegir protocolo se define la actividad de la linea."
        aside={<div className={`status-pill ${planificacionActiva?.estado === 'cerrada' || planificacionActiva?.estado === 'deshabilitada' ? 'locked' : ''}`}>{planificacionActiva?.estado || 'sin_estado'}</div>}
        actions={<Button variant="secondary" onClick={onVolverResumen}>Volver al resumen</Button>}
      />

      {tieneLineasDuplicadas && (
        <div className="status-error">
          Hay lineas duplicadas: para una misma campania, campo, lote y actividad solo puede existir una linea.
        </div>
      )}
      {lineasConHectareasExcedidas.length > 0 && (
        <div className="status-error">
          Hay {lineasConHectareasExcedidas.length} linea(s) con hectareas mayores a la superficie total del lote.
        </div>
      )}

      <Panel
        className="planning-editor-page"
        title="Datos de cabecera"
        description="Estos datos identifican la planificacion y se guardan junto con el borrador."
        actions={(
          <ActionBar align="end">
            <Button variant="primary" onClick={guardarBorradorPlanificacion} disabled={!puedeEditarPlanificacion || guardandoPlanificacion || tieneLineasDuplicadas || lineasConHectareasExcedidas.length > 0}>
              <span className="button-content">
                {guardandoPlanificacion && <LoadingSpinner label="Guardando planificacion" />}
                {guardandoPlanificacion ? 'Guardando...' : 'Guardar borrador'}
              </span>
            </Button>
          </ActionBar>
        )}
      >

        <div className="planning-editor-header">
          <label>
            Nombre
            <input value={planificacionActiva?.nombre || ''} onChange={(event) => actualizarCabeceraPlanificacion({ nombre: event.target.value })} disabled={!puedeEditarPlanificacion} />
          </label>
          <label>
            Campania
            <select value={planificacionActiva?.campaniaErpId || ''} onChange={(event) => solicitarCambioCampania(event.target.value)} disabled={!puedeEditarPlanificacion}>
              {campaniasDisponibles.map((campania) => (
                <option key={campania.erpId} value={campania.erpId}>
                  {campania.codigo} {campania.esActual ? '(actual)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="planning-editor-description">
            Descripcion
            <input value={planificacionActiva?.descripcion || ''} onChange={(event) => actualizarCabeceraPlanificacion({ descripcion: event.target.value })} disabled={!puedeEditarPlanificacion} />
          </label>
        </div>

        <section className="metrics planning-metrics">
          <article>
            <span>Hectareas</span>
            <strong>{hectareasPlanificadas.toFixed(2)}</strong>
          </article>
          <article>
            <span>Ingreso neto</span>
            <strong>{formatearUsd(ingresoNetoTotal)}</strong>
          </article>
          <article>
            <span>Costo produccion</span>
            <strong>{formatearUsd(costoTotal)}</strong>
          </article>
          <article>
            <span>Margen bruto</span>
            <strong>{formatearUsd(margenBrutoTotal)}</strong>
          </article>
        </section>

        <PlanificacionFilters
          busqueda={busqueda}
          filtroZonaId={filtroZonaId}
          filtroCampoId={filtroCampoId}
          filtroEstadoCarga={filtroEstadoCarga}
          zonas={zonasParaFiltro}
          campos={camposParaFiltro}
          lineasFiltradas={lineasFiltradas.length}
          totalLineas={lineasPlanificacion.length}
          onBusquedaChange={setBusqueda}
          onZonaChange={(zonaId) => {
            setFiltroZonaId(zonaId);
            setFiltroCampoId('');
          }}
          onCampoChange={setFiltroCampoId}
          onEstadoCargaChange={setFiltroEstadoCarga}
          onLimpiar={limpiarFiltros}
        />

        <PlanificacionScopeActions
          tipoAlcance={tipoAlcanceAgregar}
          alcanceId={alcanceAgregarId}
          opciones={opcionesAlcanceAgregar}
          puedeEditar={puedeEditarPlanificacion}
          onTipoAlcanceChange={(tipo) => {
            setTipoAlcanceAgregar(tipo);
            setAlcanceAgregarId('');
          }}
          onAlcanceChange={setAlcanceAgregarId}
          onAgregar={agregarAlcanceEscenario}
        />

        <PlanificacionBulkActions
          protocoloId={protocoloMasivoId}
          destino={destinoMasivo}
          rinde={rindeMasivo}
          protocolos={protocolosParaAccionMasiva}
          destinos={destinosParaAccionMasiva}
          resultado={resultadoAccionMasiva}
          puedeEditar={puedeEditarPlanificacion}
          totalLineasFiltradas={lineasFiltradas.length}
          onProtocoloChange={setProtocoloMasivoId}
          onDestinoChange={setDestinoMasivo}
          onRindeChange={setRindeMasivo}
          onAplicarProtocolo={aplicarProtocoloAFiltradas}
          onAplicarDestino={aplicarDestinoAFiltradas}
          onAplicarRinde={aplicarRindeAFiltradas}
        />

        <div className="planning-table">
          {lineasAgrupadas.length === 0 && (
            <p className="hint">{lineasPlanificacion.length === 0 ? 'No hay lotes activos para planificar. Primero crea o sincroniza lotes.' : 'No hay lineas que coincidan con los filtros aplicados.'}</p>
          )}
          {lineasAgrupadas.length > 0 && (
            <div className="planning-tree-toolbar">
              <span>Vista por zona y campo</span>
              <ActionBar compact>
                <Button variant="small" className="tree-toggle-button" onClick={alternarTodoArbol}>
                  {lineasAgrupadas.length > 0
                    && lineasAgrupadas.every((zona) => zonasAbiertas.has(zona.id))
                    && lineasAgrupadas.flatMap((zona) => zona.campos).every((campo) => camposAbiertos.has(campo.id))
                    ? 'Contraer todo'
                    : 'Expandir todo'}
                </Button>
              </ActionBar>
            </div>
          )}
          {lineasAgrupadas.map((zona) => (
            (() => {
              const lineasZona = zona.campos.flatMap((campo) => campo.lineas);
              const resumenZona = calcularResumenGrupo(lineasZona);
              const zonaAbierta = zonasAbiertas.has(zona.id);

              return (
                <details
                  className="planning-tree-zone"
                  key={zona.id}
                  open={zonaAbierta}
                  onToggle={(event) => alternarZona(zona.id, event.currentTarget.open)}
                >
                  <summary>
                    <strong>{zona.nombre}</strong>
                    <span>{lineasZona.length} linea(s)</span>
                    <span>{resumenZona.hectareas.toFixed(2)} ha</span>
                    <span>{formatearUsd(resumenZona.margen)}</span>
                    {resumenZona.pendientes > 0 && <em>{resumenZona.pendientes} pendiente(s)</em>}
                    {resumenZona.duplicadas > 0 && <em className="summary-danger">{resumenZona.duplicadas} duplicada(s)</em>}
                    <div className="planning-tree-summary-actions">
                      <Button
                        variant="small"
                        className="tree-toggle-button danger-button"
                        onClick={(event) => quitarLineasDelEscenario(event, lineasZona, zona.nombre)}
                        disabled={!puedeEditarPlanificacion}
                      >
                        Quitar zona
                      </Button>
                      <Button variant="small" className="tree-toggle-button" onClick={(event) => alternarCamposDeZona(event, zona.id, zona.campos.map((campo) => campo.id))}>
                        {zonaAbierta && zona.campos.every((campo) => camposAbiertos.has(campo.id)) ? 'Contraer campos' : 'Expandir campos'}
                      </Button>
                    </div>
                  </summary>
                  {zonaAbierta && zona.campos.map((campo) => {
                    const resumenCampo = calcularResumenGrupo(campo.lineas);
                    const campoAbierto = camposAbiertos.has(campo.id);

                    return (
                      <details
                        className="planning-tree-field"
                        key={campo.id}
                        open={campoAbierto}
                        onToggle={(event) => alternarCampo(campo.id, event.currentTarget.open)}
                      >
                        <summary>
                          <strong>{campo.nombre}</strong>
                          <span>{campo.lineas.length} linea(s)</span>
                          <span>{resumenCampo.hectareas.toFixed(2)} ha</span>
                          <span>{formatearUsd(resumenCampo.margen)}</span>
                          {resumenCampo.pendientes > 0 && <em>{resumenCampo.pendientes} pendiente(s)</em>}
                          {resumenCampo.duplicadas > 0 && <em className="summary-danger">{resumenCampo.duplicadas} duplicada(s)</em>}
                          <div className="planning-tree-summary-actions">
                            <Button
                              variant="small"
                              className="tree-toggle-button danger-button"
                              onClick={(event) => quitarLineasDelEscenario(event, campo.lineas, campo.nombre)}
                              disabled={!puedeEditarPlanificacion}
                            >
                              Quitar campo
                            </Button>
                          </div>
                        </summary>
                        {campoAbierto && (
                          <div className="planning-tree-lines">
                            {campo.lineas.map(renderLinea)}
                          </div>
                        )}
                      </details>
                    );
                  })}
                </details>
              );
            })()
          ))}
        </div>
      </Panel>
      {confirmacionQuitarAlcance && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel modal-panel-narrow" role="dialog" aria-modal="true" aria-labelledby="quitar-alcance-title">
            <div className="modal-header">
              <div>
                <h2 id="quitar-alcance-title">Quitar del escenario</h2>
                <p className="hint">Esta accion solo modifica la planificacion actual. No elimina zonas, campos ni lotes del padron.</p>
              </div>
              <Button variant="ghost" onClick={() => setConfirmacionQuitarAlcance(null)}>
                Cerrar
              </Button>
            </div>

            <div className="confirmation-summary">
              <article>
                <span>Alcance</span>
                <strong>{confirmacionQuitarAlcance.etiqueta}</strong>
              </article>
              <article>
                <span>Lineas a quitar</span>
                <strong>{confirmacionQuitarAlcance.totalLineas}</strong>
              </article>
              <article>
                <span>Con datos cargados</span>
                <strong>{confirmacionQuitarAlcance.lineasConDatos}</strong>
              </article>
            </div>

            <p className="hint">
              Al confirmar, estas lineas se quitaran del borrador. Para hacer efectivo el cambio en la base, despues guarda el borrador.
            </p>

            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setConfirmacionQuitarAlcance(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmarQuitarAlcance}>
                Quitar lineas
              </Button>
            </div>
          </section>
        </div>
      )}
      {confirmacionCambioCampania && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel modal-panel-narrow" role="dialog" aria-modal="true" aria-labelledby="cambio-campania-title">
            <div className="modal-header">
              <div>
                <h2 id="cambio-campania-title">Cambiar campania</h2>
                <p className="hint">La campania define los protocolos disponibles y los calculos economicos del escenario.</p>
              </div>
              <Button variant="ghost" onClick={() => setConfirmacionCambioCampania(null)}>
                Cerrar
              </Button>
            </div>

            <div className="confirmation-summary">
              <article>
                <span>Campania actual</span>
                <strong>{campaniaPlanificada?.codigo || planificacionActiva?.campaniaErpId || '-'}</strong>
              </article>
              <article>
                <span>Nueva campania</span>
                <strong>{confirmacionCambioCampania.codigo}</strong>
              </article>
              <article>
                <span>Lineas afectadas</span>
                <strong>{lineasPlanificacion.length}</strong>
              </article>
            </div>

            <p className="hint">
              Al confirmar se quitaran los protocolos aplicados y se resetearan destino, rinde, precio, gastos comerciales, costos e indicadores economicos.
              Se conservan los lotes y hectareas cargadas.
            </p>

            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setConfirmacionCambioCampania(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmarCambioCampania}>
                Cambiar y resetear
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
