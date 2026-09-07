import { useMemo } from 'react';
import { PlanificacionAgricolaLinea } from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlanificacionBaseProps } from './planificacionTypes';

type PlanificacionEditorScreenProps = PlanificacionBaseProps & {
  onVolverResumen: () => void;
};

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
  camposPlanificacionPorId,
  lotesPlanificacionPorId,
  protocolosPorId,
  actualizarCabeceraPlanificacion,
  cambiarCampaniaPlanificacion,
  agregarLineaPlanificacion,
  guardarBorradorPlanificacion,
  cambiarCampo,
  cambiarLote,
  cambiarActividad,
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
  const lineasAgrupadas = useMemo(() => {
    const zonas = new Map<string, { id: string; nombre: string; campos: Map<string, { id: string; nombre: string; lineas: PlanificacionAgricolaLinea[] }> }>();

    for (const linea of lineasPlanificacion) {
      const campo = camposPlanificacionPorId.get(linea.campoPlanificacionId);
      const zonaId = campo?.zonaPlanificacionId || campo?.zonaErpId || 'sin-zona';
      const zonaNombre = obtenerNombreZona(campo?.zonaPlanificacionId, campo?.zonaErpId);
      const zona = zonas.get(zonaId) || { id: zonaId, nombre: zonaNombre, campos: new Map() };
      const campoId = campo?.id || linea.campoPlanificacionId;
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
  }, [lineasPlanificacion, camposPlanificacionPorId, planificacion.zonasPlanificacion, snapshot.zonas]);

  function obtenerNombreZona(zonaPlanificacionId?: string, zonaErpId?: string) {
    const zonaPropia = planificacion.zonasPlanificacion?.find((zona) => zona.id === zonaPlanificacionId);

    if (zonaPropia) {
      return zonaPropia.nombre;
    }

    const zonaErp = snapshot.zonas.find((zona) => zona.erpId === zonaErpId || zonaErpId?.endsWith(`:${zona.idZona}`));

    return zonaErp?.nombre || 'Sin zona';
  }

  function obtenerProtocolosParaLinea(linea: PlanificacionAgricolaLinea) {
    const campo = camposPlanificacionPorId.get(linea.campoPlanificacionId);

    return planificacion.protocolos
      .filter((protocolo) => {
        if (!protocolo.activo || protocolo.campaniaErpId !== planificacionActiva?.campaniaErpId) {
          return false;
        }

        const coincideCampo = !protocolo.campoPlanificacionId || protocolo.campoPlanificacionId === linea.campoPlanificacionId;
        const coincideZona = !protocolo.zonaPlanificacionId || protocolo.zonaPlanificacionId === campo?.zonaPlanificacionId;

        return coincideCampo && coincideZona;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }

  function renderLinea(linea: PlanificacionAgricolaLinea) {
    const campo = camposPlanificacionPorId.get(linea.campoPlanificacionId);
    const lote = lotesPlanificacionPorId.get(linea.lotePlanificacionId);
    const actividad = planificacion.actividadesPlanificacion?.find((item) => item.id === linea.actividadPlanificacionId);
    const protocolo = linea.protocoloId ? protocolosPorId.get(linea.protocoloId) : undefined;
    const gastoReferencia = linea.gastosComercialesReferenciaId
      ? planificacion.gastosComercialesReferencia.find((item) => item.id === linea.gastosComercialesReferenciaId)
      : undefined;
    const gastosPorTonelada = gastoReferencia?.items.reduce((total, item) => total + item.valorPorTonelada, 0) || 0;
    const produccionEstimada = linea.hectareasPlanificadas * linea.rindeEstimado;
    const margenPorHa = linea.hectareasPlanificadas > 0 ? linea.margenBrutoEstimado / linea.hectareasPlanificadas : 0;
    const costoProduccionPorHa = protocolo?.costoEstimadoPorHa || 0;
    const lotesDelCampo = planificacion.lotesPlanificacion.filter((item) => item.campoPlanificacionId === linea.campoPlanificacionId);
    const destinosDisponibles = planificacion.destinosReferencia
      .filter((item) => item.activo && (!item.actividadPlanificacionId || item.actividadPlanificacionId === linea.actividadPlanificacionId))
      .sort((a, b) => a.destinoVenta.localeCompare(b.destinoVenta));
    const protocolosCompatibles = obtenerProtocolosParaLinea(linea);
    const claveLinea = `${planificacionActiva?.campaniaErpId}|${linea.campoPlanificacionId}|${linea.lotePlanificacionId}|${linea.actividadPlanificacionId}`;
    const lineaDuplicada = clavesDuplicadas.has(claveLinea);

    return (
      <div className={`planning-row ${lineaDuplicada ? 'duplicated' : ''}`} key={linea.id}>
        <div className="planning-cell-wide">
          <span className="cell-label">Campo</span>
          <select value={linea.campoPlanificacionId} onChange={(event) => cambiarCampo(linea.id, event.target.value)} disabled={!puedeEditarPlanificacion}>
            {planificacion.camposPlanificacion.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <em>{campo?.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP'}</em>
        </div>

        <div className="planning-cell-wide">
          <span className="cell-label">Lote</span>
          <select value={linea.lotePlanificacionId} onChange={(event) => cambiarLote(linea.id, event.target.value)} disabled={!puedeEditarPlanificacion}>
            {lotesDelCampo.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <span>prod. {lote?.superficieProductiva ?? '-'}</span>
        </div>

        <div className="planning-cell-wide">
          <span className="cell-label">Actividad</span>
          <select value={linea.actividadPlanificacionId} onChange={(event) => cambiarActividad(linea.id, event.target.value)} disabled={!puedeEditarPlanificacion || Boolean(linea.protocoloId)}>
            {(planificacion.actividadesPlanificacion || []).map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <span>{linea.protocoloId ? 'Definida por protocolo' : actividad?.codigoInterno || actividad?.actividadErpId || '-'}</span>
          {lineaDuplicada && <span className="cell-error">Actividad duplicada</span>}
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
          <span>{gastoReferencia ? `${formatearUsd(gastosPorTonelada)} / tn - ${gastoReferencia.items.length} items` : 'Manual'}</span>
        </div>

        <div className="planning-cell-wide">
          <span className="cell-label">Protocolo</span>
          <select value={linea.protocoloId || ''} onChange={(event) => cambiarProtocolo(linea.id, event.target.value || undefined)} disabled={!puedeEditarPlanificacion}>
            <option value="">Sin protocolo</option>
            {protocolosCompatibles.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <span>{protocolo ? `${formatearUsd(protocolo.costoEstimadoPorHa)} / ha - act. ${new Date(protocolo.updatedAt).toLocaleDateString('es-AR')}` : 'Costo 0'}</span>
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
          <span className="cell-label">Acciones</span>
          <button className="small" onClick={() => copiarLineaPlanificacion(linea.id)} disabled={!puedeEditarPlanificacion}>
            Copiar
          </button>
          <button className="danger" onClick={() => eliminarLineaPlanificacion(linea.id)} disabled={!puedeEditarPlanificacion || lineasPlanificacion.length === 1}>
            Quitar
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

        <div className="planning-table">
          {lineasAgrupadas.length === 0 && (
            <p className="hint">No hay lotes activos para planificar. Primero crea o sincroniza lotes.</p>
          )}
          {lineasAgrupadas.map((zona) => (
            <details className="planning-tree-zone" key={zona.id} open>
              <summary>
                <strong>{zona.nombre}</strong>
                <span>{zona.campos.reduce((total, campo) => total + campo.lineas.length, 0)} lotes</span>
              </summary>
              {zona.campos.map((campo) => (
                <details className="planning-tree-field" key={campo.id} open>
                  <summary>
                    <strong>{campo.nombre}</strong>
                    <span>{campo.lineas.length} linea(s)</span>
                  </summary>
                  <div className="planning-tree-lines">
                    {campo.lineas.map(renderLinea)}
                  </div>
                </details>
              ))}
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
