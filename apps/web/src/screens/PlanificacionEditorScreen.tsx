import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { ErpCultivo, PlanificacionAgricolaLinea } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DecimalInput } from '../components/DecimalInput';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { PlanificacionBaseProps } from './planificacionTypes';

type PlanificacionEditorScreenProps = PlanificacionBaseProps & {
  onVolverResumen: () => void;
};

type EstadoCargaFiltro = 'todos' | 'completas' | 'pendientes' | 'duplicadas';

function normalizarTexto(valor: string) {
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function obtenerCodigoCampaniaAnterior(codigo?: string) {
  const partes = codigo?.match(/^(\d{2})\/(\d{2})$/);

  if (!partes) {
    return undefined;
  }

  const inicio = Number(partes[1]);
  const fin = Number(partes[2]);

  if (!Number.isFinite(inicio) || !Number.isFinite(fin)) {
    return undefined;
  }

  return `${String(inicio - 1).padStart(2, '0')}/${String(fin - 1).padStart(2, '0')}`;
}

function idsErpCoinciden(idA?: string, idB?: string) {
  if (!idA || !idB) {
    return false;
  }

  return idA === idB || idA.endsWith(`:${idB}`) || idB.endsWith(`:${idA}`);
}

function formatearCultivosAntecesores(cultivos: ErpCultivo[], actividadNombrePorErpId: Map<string, string>) {
  if (cultivos.length === 0) {
    return 'Antecesor: sin datos ERP';
  }

  return `Antecesor: ${cultivos
    .map((cultivo) => {
      const actividad = cultivo.actividadErpId ? actividadNombrePorErpId.get(cultivo.actividadErpId) : undefined;
      const nombre = actividad || cultivo.nombre;

      return `${nombre} (${cultivo.hectareasSembradas.toFixed(2)} ha)`;
    })
    .join(' / ')}`;
}

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
  agregarLineaPlanificacion,
  guardarBorradorPlanificacion,
  cambiarLote,
  cambiarProtocolo,
  cambiarDestino,
  actualizarLinea,
  copiarLineaPlanificacion,
  eliminarLineaPlanificacion,
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
    const claveLinea = `${planificacionActiva?.campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;
    const lineaDuplicada = clavesDuplicadas.has(claveLinea);
    const lineaCompleta = Boolean(linea.protocoloId && linea.destinoVenta && linea.hectareasPlanificadas > 0 && linea.rindeEstimado > 0 && linea.precioVentaEstimado > 0);
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

  const estructuraArbolKey = useMemo(() => (
    lineasAgrupadas
      .map((zona) => `${zona.id}:${zona.campos.map((campo) => campo.id).join(',')}`)
      .join('|')
  ), [lineasAgrupadas]);

  useEffect(() => {
    setZonasAbiertas((actuales) => {
      if (actuales.size > 0) {
        return actuales;
      }

      const primeraZona = lineasAgrupadas[0];

      return primeraZona ? new Set([primeraZona.id]) : actuales;
    });
    setCamposAbiertos((actuales) => {
      if (actuales.size > 0) {
        return actuales;
      }

      const primerCampo = lineasAgrupadas[0]?.campos[0];

      return primerCampo ? new Set([primerCampo.id]) : actuales;
    });
  }, [estructuraArbolKey, lineasAgrupadas]);

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

    if (campoIds.every((campoId) => camposAbiertos.has(campoId))) {
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

    let aplicadas = 0;

    for (const linea of lineasFiltradas) {
      if (obtenerProtocolosParaLinea(linea).some((protocolo) => protocolo.id === protocoloMasivoId)) {
        cambiarProtocolo(linea.id, protocoloMasivoId);
        aplicadas += 1;
      }
    }

    setResultadoAccionMasiva(`Protocolo aplicado en ${aplicadas} de ${lineasFiltradas.length} linea(s) filtradas.`);
  }

  function aplicarDestinoAFiltradas() {
    if (!destinoMasivo || !puedeEditarPlanificacion) {
      return;
    }

    let aplicadas = 0;

    for (const linea of lineasFiltradas) {
      const destinoCompatible = planificacion.destinosReferencia.some((destino) => (
        destino.activo
        && destino.destinoVenta === destinoMasivo
      ));

      if (destinoCompatible) {
        cambiarDestino(linea.id, destinoMasivo);
        aplicadas += 1;
      }
    }

    setResultadoAccionMasiva(`Destino aplicado en ${aplicadas} de ${lineasFiltradas.length} linea(s) filtradas.`);
  }

  function aplicarRindeAFiltradas() {
    const rinde = leerNumero(rindeMasivo);

    if (!Number.isFinite(rinde) || rinde < 0 || !puedeEditarPlanificacion) {
      return;
    }

    for (const linea of lineasFiltradas) {
      actualizarLinea(linea.id, { rindeEstimado: rinde });
    }

    setResultadoAccionMasiva(`Rinde aplicado en ${lineasFiltradas.length} linea(s) filtradas.`);
  }

  function lineaEstaCompleta(linea: PlanificacionAgricolaLinea) {
    return Boolean(linea.protocoloId && linea.destinoVenta && linea.hectareasPlanificadas > 0 && linea.rindeEstimado > 0 && linea.precioVentaEstimado > 0);
  }

  function calcularResumenGrupo(lineas: PlanificacionAgricolaLinea[]) {
    return {
      hectareas: lineas.reduce((total, linea) => total + (linea.protocoloId ? linea.hectareasPlanificadas : 0), 0),
      margen: lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
      pendientes: lineas.filter((linea) => !lineaEstaCompleta(linea)).length,
      duplicadas: lineas.filter((linea) => {
        const claveLinea = `${planificacionActiva?.campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;
        return clavesDuplicadas.has(claveLinea);
      }).length,
    };
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
    const costoProduccionPorHa = protocolo?.costoEstimadoPorHa || 0;
    const lotesDelCampo = lotesPorCampo.get(linea.campoAppId) || [];
    const protocolosCompatibles = obtenerProtocolosParaLinea(linea);
    const claveLinea = `${planificacionActiva?.campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;
    const lineaDuplicada = clavesDuplicadas.has(claveLinea);
    const cultivosAntecesores = lote?.loteErpId ? cultivosAntecesoresPorLote.get(lote.loteErpId) || [] : [];

    return (
      <div className={`planning-row ${lineaDuplicada ? 'duplicated' : ''}`} key={linea.id}>
        <div className="planning-cell-wide">
          <span className="cell-label">Lote</span>
          <select value={linea.loteAppId} onChange={(event) => cambiarLote(linea.id, event.target.value)} disabled={!puedeEditarPlanificacion}>
            {lotesDelCampo.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <span>prod. {lote?.superficieProductiva ?? '-'} ha / total {lote?.superficieTotal ?? '-'} ha</span>
        </div>

        <div className="planning-cell-wide">
          <span className="cell-label">Antecesor</span>
          <span>{formatearCultivosAntecesores(cultivosAntecesores, actividadNombrePorErpId)}</span>
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

        <div className="planning-cell-medium">
          <span className="cell-label">Hectareas</span>
          <DecimalInput value={linea.hectareasPlanificadas} onValueChange={(value) => actualizarLinea(linea.id, { hectareasPlanificadas: value })} disabled={!puedeEditarPlanificacion} />
          <span>max. {lote?.superficieTotal ?? '-'} ha</span>
        </div>

        <div className="planning-cell-medium">
          <span className="cell-label">Rinde</span>
          <DecimalInput value={linea.rindeEstimado} onValueChange={(value) => actualizarLinea(linea.id, { rindeEstimado: value })} disabled={!puedeEditarPlanificacion} />
          <span>tn/ha - prod. {produccionEstimada.toFixed(2)} tn</span>
        </div>

        <div className="planning-cell-medium">
          <span className="cell-label">Precio venta</span>
          <DecimalInput value={linea.precioVentaEstimado} onValueChange={(value) => actualizarLinea(linea.id, { precioVentaEstimado: value, precioVentaManual: true })} disabled={!puedeEditarPlanificacion} />
          <span>{linea.precioVentaManual ? 'Manual' : 'Referencia'}</span>
        </div>

        <div className="planning-cell-medium">
          <span className="cell-label">Gastos comerciales</span>
          <DecimalInput value={linea.gastosComercialesEstimados} onValueChange={(value) => actualizarLinea(linea.id, { gastosComercialesEstimados: value, gastosComercialesReferenciaId: undefined })} disabled={!puedeEditarPlanificacion} />
          <span>{gastoReferencia ? `${gastosResumen} - ${gastoReferencia.items.length} items` : 'Manual'}</span>
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

        <div className="planning-cell-summary">
          <span className="cell-label">Margen bruto</span>
          <strong>{formatearUsd(linea.margenBrutoEstimado)}</strong>
          <span>{formatearUsd(margenPorHa)} / ha</span>
        </div>

        <div className="planning-cell-summary">
          <span className="cell-label">Resumen economico</span>
          <strong>Neto {formatearUsd(linea.ingresoNetoEstimado)}</strong>
          <span>Bruto {formatearUsd(linea.ingresoBrutoEstimado)}</span>
          <span>Costo prod. {formatearUsd(costoProduccionPorHa)} / ha</span>
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

      <Panel
        className="planning-editor-page"
        title="Datos de cabecera"
        description="Estos datos identifican la planificacion y se guardan junto con el borrador."
        actions={(
          <ActionBar align="end">
            <Button variant="small" onClick={agregarLineaPlanificacion} disabled={!puedeEditarPlanificacion}>
              Nueva linea
            </Button>
            <Button variant="primary" onClick={guardarBorradorPlanificacion} disabled={!puedeEditarPlanificacion || guardandoPlanificacion || tieneLineasDuplicadas}>
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
            <select value={planificacionActiva?.campaniaErpId || ''} onChange={(event) => cambiarCampaniaPlanificacion(event.target.value)} disabled={!puedeEditarPlanificacion}>
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

        <section className="planning-filters" aria-label="Filtros de planificacion">
          <label>
            Buscar
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Zona, campo, lote, protocolo o destino"
            />
          </label>
          <label>
            Zona
            <select
              value={filtroZonaId}
              onChange={(event) => {
                setFiltroZonaId(event.target.value);
                setFiltroCampoId('');
              }}
            >
              <option value="">Todas las zonas</option>
              {zonasParaFiltro.map((zona) => (
                <option key={zona.id} value={zona.id}>{zona.nombre}</option>
              ))}
            </select>
          </label>
          <label>
            Campo
            <select value={filtroCampoId} onChange={(event) => setFiltroCampoId(event.target.value)}>
              <option value="">Todos los campos</option>
              {camposParaFiltro.map((campo) => (
                <option key={campo.id} value={campo.id}>{campo.nombre}</option>
              ))}
            </select>
          </label>
          <label>
            Estado de carga
            <select value={filtroEstadoCarga} onChange={(event) => setFiltroEstadoCarga(event.target.value as EstadoCargaFiltro)}>
              <option value="todos">Todos</option>
              <option value="completas">Completas</option>
              <option value="pendientes">Pendientes</option>
              <option value="duplicadas">Duplicadas</option>
            </select>
          </label>
          <div className="planning-filter-summary">
            <strong>{lineasFiltradas.length}</strong>
            <span>de {lineasPlanificacion.length} lineas</span>
            <Button variant="small" onClick={limpiarFiltros} disabled={!busqueda && !filtroZonaId && !filtroCampoId && filtroEstadoCarga === 'todos'}>
              Limpiar
            </Button>
          </div>
        </section>

        <section className="planning-bulk-actions" aria-label="Acciones masivas de planificacion">
          <div>
            <p className="eyebrow">Acciones masivas</p>
            <h3>Aplicar sobre lineas filtradas</h3>
          </div>
          <label>
            Protocolo
            <select value={protocoloMasivoId} onChange={(event) => setProtocoloMasivoId(event.target.value)}>
              <option value="">Seleccionar protocolo</option>
              {protocolosParaAccionMasiva.map((protocolo) => (
                <option key={protocolo.id} value={protocolo.id}>{protocolo.nombre}</option>
              ))}
            </select>
          </label>
          <Button variant="small" onClick={aplicarProtocoloAFiltradas} disabled={!puedeEditarPlanificacion || !protocoloMasivoId || lineasFiltradas.length === 0}>
            Aplicar protocolo
          </Button>
          <label>
            Destino
            <select value={destinoMasivo} onChange={(event) => setDestinoMasivo(event.target.value)}>
              <option value="">Seleccionar destino</option>
              {destinosParaAccionMasiva.map((destino) => (
                <option key={destino} value={destino}>{destino}</option>
              ))}
            </select>
          </label>
          <Button variant="small" onClick={aplicarDestinoAFiltradas} disabled={!puedeEditarPlanificacion || !destinoMasivo || lineasFiltradas.length === 0}>
            Aplicar destino
          </Button>
          <label>
            Rinde tn/ha
            <input type="text" inputMode="decimal" value={rindeMasivo} onChange={(event) => setRindeMasivo(event.target.value)} placeholder="Ej. 3.20" />
          </label>
          <Button variant="small" onClick={aplicarRindeAFiltradas} disabled={!puedeEditarPlanificacion || !rindeMasivo || lineasFiltradas.length === 0}>
            Aplicar rinde
          </Button>
          {resultadoAccionMasiva && <span className="bulk-action-result">{resultadoAccionMasiva}</span>}
        </section>

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
                      <Button variant="small" className="tree-toggle-button" onClick={(event) => alternarCamposDeZona(event, zona.id, zona.campos.map((campo) => campo.id))}>
                        {zona.campos.every((campo) => camposAbiertos.has(campo.id)) ? 'Contraer campos' : 'Expandir campos'}
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
    </section>
  );
}
