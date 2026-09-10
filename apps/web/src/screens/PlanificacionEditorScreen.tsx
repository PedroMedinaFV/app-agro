import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { PlanificacionAgricolaLinea } from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';
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

export function PlanificacionEditorScreen({
  planificacion,
  snapshot,
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
        if (destino.activo && (!destino.actividadAppId || destino.actividadAppId === linea.actividadAppId)) {
          destinos.set(normalizarTexto(destino.destinoVenta), destino.destinoVenta);
        }
      }
    }

    return Array.from(destinos.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }, [lineasFiltradas, planificacion.destinosReferencia]);

  useEffect(() => {
    setZonasAbiertas((actuales) => {
      const siguientes = new Set(actuales);

      for (const zona of lineasAgrupadas) {
        if (!siguientes.has(zona.id)) {
          siguientes.add(zona.id);
        }
      }

      return siguientes;
    });
    setCamposAbiertos((actuales) => {
      const siguientes = new Set(actuales);

      for (const zona of lineasAgrupadas) {
        for (const campo of zona.campos) {
          if (!siguientes.has(campo.id)) {
            siguientes.add(campo.id);
          }
        }
      }

      return siguientes;
    });
  }, [lineasAgrupadas]);

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
        && (!destino.actividadAppId || destino.actividadAppId === linea.actividadAppId)
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
      hectareas: lineas.reduce((total, linea) => total + linea.hectareasPlanificadas, 0),
      margen: lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
      pendientes: lineas.filter((linea) => !lineaEstaCompleta(linea)).length,
      duplicadas: lineas.filter((linea) => {
        const claveLinea = `${planificacionActiva?.campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;
        return clavesDuplicadas.has(claveLinea);
      }).length,
    };
  }

  function obtenerNombreZona(zonaAppId?: string, zonaErpId?: string) {
    const zonaPropia = planificacion.zonasApp?.find((zona) => zona.id === zonaAppId);

    if (zonaPropia) {
      return zonaPropia.nombre;
    }

    const zonaErp = snapshot.zonas.find((zona) => zona.erpId === zonaErpId || zonaErpId?.endsWith(`:${zona.idZona}`));

    return zonaErp?.nombre || 'Sin zona';
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
    const gastoReferencia = linea.gastosComercialesReferenciaId
      ? planificacion.gastosComercialesReferencia.find((item) => item.id === linea.gastosComercialesReferenciaId)
      : undefined;
    const gastosResumen = gastoReferencia?.items
      .map((item) => `${formatearUsd(item.valorPorTonelada)} / ${item.unidadCalculo || 'Tn'}`)
      .join(' + ');
    const produccionEstimada = linea.hectareasPlanificadas * linea.rindeEstimado;
    const margenPorHa = linea.hectareasPlanificadas > 0 ? linea.margenBrutoEstimado / linea.hectareasPlanificadas : 0;
    const costoProduccionPorHa = protocolo?.costoEstimadoPorHa || 0;
    const lotesDelCampo = planificacion.lotesApp.filter((item) => item.campoAppId === linea.campoAppId);
    const destinosDisponibles = planificacion.destinosReferencia
      .filter((item) => item.activo && (!item.actividadAppId || item.actividadAppId === linea.actividadAppId))
      .sort((a, b) => a.destinoVenta.localeCompare(b.destinoVenta));
    const protocolosCompatibles = obtenerProtocolosParaLinea(linea);
    const claveLinea = `${planificacionActiva?.campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;
    const lineaDuplicada = clavesDuplicadas.has(claveLinea);

    return (
      <div className={`planning-row ${lineaDuplicada ? 'duplicated' : ''}`} key={linea.id}>
        <div className="planning-cell-wide">
          <span className="cell-label">Lote</span>
          <select value={linea.loteAppId} onChange={(event) => cambiarLote(linea.id, event.target.value)} disabled={!puedeEditarPlanificacion}>
            {lotesDelCampo.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <span>prod. {lote?.superficieProductiva ?? '-'}</span>
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
          <input type="number" min="0" step="0.01" value={linea.hectareasPlanificadas} onChange={(event) => actualizarLinea(linea.id, { hectareasPlanificadas: leerNumero(event.target.value) })} disabled={!puedeEditarPlanificacion} />
          <span>ha</span>
        </div>

        <div className="planning-cell-medium">
          <span className="cell-label">Rinde</span>
          <input type="number" min="0" step="0.01" value={linea.rindeEstimado} onChange={(event) => actualizarLinea(linea.id, { rindeEstimado: leerNumero(event.target.value) })} disabled={!puedeEditarPlanificacion} />
          <span>tn/ha - prod. {produccionEstimada.toFixed(2)} tn</span>
        </div>

        <div className="planning-cell-medium">
          <span className="cell-label">Precio venta</span>
          <input type="number" min="0" step="0.01" value={linea.precioVentaEstimado} onChange={(event) => actualizarLinea(linea.id, { precioVentaEstimado: leerNumero(event.target.value), precioVentaManual: true })} disabled={!puedeEditarPlanificacion} />
          <span>{linea.precioVentaManual ? 'Manual' : 'Referencia'}</span>
        </div>

        <div className="planning-cell-medium">
          <span className="cell-label">Gastos comerciales</span>
          <input type="number" min="0" step="0.01" value={linea.gastosComercialesEstimados} onChange={(event) => actualizarLinea(linea.id, { gastosComercialesEstimados: leerNumero(event.target.value), gastosComercialesReferenciaId: undefined })} disabled={!puedeEditarPlanificacion} />
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
          <button
            className="icon-button"
            type="button"
            onClick={() => copiarLineaPlanificacion(linea.id)}
            disabled={!puedeEditarPlanificacion}
            aria-label="Copiar linea"
            title="Copiar linea"
          >
            <span aria-hidden="true">Cop.</span>
          </button>
          <button
            className="icon-button danger-icon"
            type="button"
            onClick={() => eliminarLineaPlanificacion(linea.id)}
            disabled={!puedeEditarPlanificacion || lineasPlanificacion.length === 1}
            aria-label="Quitar linea"
            title="Quitar linea"
          >
            <span aria-hidden="true">X</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Edicion de planificacion</p>
          <h2>{planificacionActiva?.nombre || 'Planificacion sin nombre'}</h2>
          <p className="hint">Carga por zona, campo y lote. Al elegir protocolo se define la actividad de la linea.</p>
        </div>
        <button className="secondary" onClick={onVolverResumen}>
          Volver al resumen
        </button>
        <div className={`status-pill ${planificacionActiva?.estado === 'cerrada' || planificacionActiva?.estado === 'deshabilitada' ? 'locked' : ''}`}>
          {planificacionActiva?.estado || 'sin_estado'}
        </div>
      </section>

      {tieneLineasDuplicadas && (
        <div className="status-error">
          Hay lineas duplicadas: para una misma campania, campo, lote y actividad solo puede existir una linea.
        </div>
      )}

      <section className="panel planning-editor-page">
        <div className="panel-header">
          <div>
            <h2>Datos de cabecera</h2>
            <p className="hint">Estos datos identifican la planificacion y se guardan junto con el borrador.</p>
          </div>
          <div className="button-row">
            <button className="small" onClick={agregarLineaPlanificacion} disabled={!puedeEditarPlanificacion}>
              Nueva linea
            </button>
            <button className="primary" onClick={guardarBorradorPlanificacion} disabled={!puedeEditarPlanificacion || guardandoPlanificacion || tieneLineasDuplicadas}>
              <span className="button-content">
                {guardandoPlanificacion && <LoadingSpinner label="Guardando planificacion" />}
                {guardandoPlanificacion ? 'Guardando...' : 'Guardar borrador'}
              </span>
            </button>
          </div>
        </div>

        <div className="planning-editor-header">
          <label>
            Nombre
            <input value={planificacionActiva?.nombre || ''} onChange={(event) => actualizarCabeceraPlanificacion({ nombre: event.target.value })} disabled={!puedeEditarPlanificacion} />
          </label>
          <label>
            Campania
            <select value={planificacionActiva?.campaniaErpId || ''} onChange={(event) => cambiarCampaniaPlanificacion(event.target.value)} disabled={!puedeEditarPlanificacion}>
              {snapshot.campanias.map((campania) => (
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
            <strong>{hectareasPlanificadas}</strong>
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
            <button className="small" type="button" onClick={limpiarFiltros} disabled={!busqueda && !filtroZonaId && !filtroCampoId && filtroEstadoCarga === 'todos'}>
              Limpiar
            </button>
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
          <button className="small" type="button" onClick={aplicarProtocoloAFiltradas} disabled={!puedeEditarPlanificacion || !protocoloMasivoId || lineasFiltradas.length === 0}>
            Aplicar protocolo
          </button>
          <label>
            Destino
            <select value={destinoMasivo} onChange={(event) => setDestinoMasivo(event.target.value)}>
              <option value="">Seleccionar destino</option>
              {destinosParaAccionMasiva.map((destino) => (
                <option key={destino} value={destino}>{destino}</option>
              ))}
            </select>
          </label>
          <button className="small" type="button" onClick={aplicarDestinoAFiltradas} disabled={!puedeEditarPlanificacion || !destinoMasivo || lineasFiltradas.length === 0}>
            Aplicar destino
          </button>
          <label>
            Rinde tn/ha
            <input
              type="number"
              min="0"
              step="0.01"
              value={rindeMasivo}
              onChange={(event) => setRindeMasivo(event.target.value)}
              placeholder="Ej. 3.20"
            />
          </label>
          <button className="small" type="button" onClick={aplicarRindeAFiltradas} disabled={!puedeEditarPlanificacion || !rindeMasivo || lineasFiltradas.length === 0}>
            Aplicar rinde
          </button>
          {resultadoAccionMasiva && <span className="bulk-action-result">{resultadoAccionMasiva}</span>}
        </section>

        <div className="planning-table">
          {lineasAgrupadas.length === 0 && (
            <p className="hint">{lineasPlanificacion.length === 0 ? 'No hay lotes activos para planificar. Primero crea o sincroniza lotes.' : 'No hay lineas que coincidan con los filtros aplicados.'}</p>
          )}
          {lineasAgrupadas.length > 0 && (
            <div className="planning-tree-toolbar">
              <span>Vista por zona y campo</span>
              <div className="button-row">
                <button className="small tree-toggle-button" type="button" onClick={alternarTodoArbol}>
                  {lineasAgrupadas.length > 0
                    && lineasAgrupadas.every((zona) => zonasAbiertas.has(zona.id))
                    && lineasAgrupadas.flatMap((zona) => zona.campos).every((campo) => camposAbiertos.has(campo.id))
                    ? 'Contraer todo'
                    : 'Expandir todo'}
                </button>
              </div>
            </div>
          )}
          {lineasAgrupadas.map((zona) => (
            (() => {
              const lineasZona = zona.campos.flatMap((campo) => campo.lineas);
              const resumenZona = calcularResumenGrupo(lineasZona);

              return (
                <details
                  className="planning-tree-zone"
                  key={zona.id}
                  open={zonasAbiertas.has(zona.id)}
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
                      <button className="small tree-toggle-button" type="button" onClick={(event) => alternarCamposDeZona(event, zona.id, zona.campos.map((campo) => campo.id))}>
                        {zona.campos.every((campo) => camposAbiertos.has(campo.id)) ? 'Contraer campos' : 'Expandir campos'}
                      </button>
                    </div>
                  </summary>
                  {zona.campos.map((campo) => {
                    const resumenCampo = calcularResumenGrupo(campo.lineas);

                    return (
                      <details
                        className="planning-tree-field"
                        key={campo.id}
                        open={camposAbiertos.has(campo.id)}
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
                        <div className="planning-tree-lines">
                          {campo.lineas.map(renderLinea)}
                        </div>
                      </details>
                    );
                  })}
                </details>
              );
            })()
          ))}
        </div>
      </section>
    </section>
  );
}

