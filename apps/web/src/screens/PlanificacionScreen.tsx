import { useState } from 'react';
import {
  CampoPlanificacion,
  ErpSnapshot,
  LotePlanificacion,
  PlanificacionAgricolaLinea,
  PlanificacionSnapshot,
  ProtocoloProductivoResumen,
} from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface PlanificacionScreenProps {
  planificacion: PlanificacionSnapshot;
  snapshot: ErpSnapshot;
  puedeEditarPlanificacion: boolean;
  puedeEditarPlanificacionPorPermiso: boolean;
  puedeCerrarPlanificacion: boolean;
  guardandoPlanificacion: boolean;
  cerrandoPlanificacion: boolean;
  planificacionActiva: PlanificacionSnapshot['planificaciones'][0] | undefined;
  lineasPlanificacion: PlanificacionAgricolaLinea[];
  hectareasPlanificadas: number;
  ingresoNetoTotal: number;
  costoTotal: number;
  margenBrutoTotal: number;
  camposProvisorios: number;
  tieneLineasDuplicadas: boolean;
  clavesDuplicadas: Set<string>;
  camposPlanificacionPorId: Map<string, CampoPlanificacion>;
  lotesPlanificacionPorId: Map<string, LotePlanificacion>;
  protocolosPorId: Map<string, ProtocoloProductivoResumen>;
  // Handlers
  seleccionarPlanificacion: (planificacionId: string) => void;
  actualizarCabeceraPlanificacion: (updates: Partial<Pick<PlanificacionSnapshot['planificaciones'][0], 'nombre' | 'descripcion'>>) => void;
  cambiarCampaniaPlanificacion: (campaniaErpId: string) => void;
  agregarLineaPlanificacion: () => void;
  guardarBorradorPlanificacion: () => void;
  cerrarPlanificacionActiva: () => void;
  cambiarCampo: (lineaId: string, campoPlanificacionId: string) => void;
  cambiarLote: (lineaId: string, lotePlanificacionId: string) => void;
  cambiarActividad: (lineaId: string, actividadPlanificacionId: string) => void;
  cambiarDestino: (lineaId: string, destinoVenta: string) => void;
  actualizarLinea: (lineaId: string, updates: Partial<PlanificacionAgricolaLinea>) => void;
  eliminarLineaPlanificacion: (lineaId: string) => void;
  obtenerProtocolosCompatibles: (linea: PlanificacionAgricolaLinea) => ProtocoloProductivoResumen[];
  formatearUsd: (valor: number) => string;
  leerNumero: (valor: string) => number;
}

export function PlanificacionScreen({
  planificacion,
  snapshot,
  puedeEditarPlanificacion,
  puedeEditarPlanificacionPorPermiso,
  puedeCerrarPlanificacion,
  guardandoPlanificacion,
  cerrandoPlanificacion,
  planificacionActiva,
  lineasPlanificacion,
  hectareasPlanificadas,
  ingresoNetoTotal,
  costoTotal,
  margenBrutoTotal,
  camposProvisorios,
  tieneLineasDuplicadas,
  clavesDuplicadas,
  camposPlanificacionPorId,
  lotesPlanificacionPorId,
  protocolosPorId,
  seleccionarPlanificacion,
  actualizarCabeceraPlanificacion,
  cambiarCampaniaPlanificacion,
  agregarLineaPlanificacion,
  guardarBorradorPlanificacion,
  cerrarPlanificacionActiva,
  cambiarCampo,
  cambiarLote,
  cambiarActividad,
  cambiarDestino,
  actualizarLinea,
  eliminarLineaPlanificacion,
  obtenerProtocolosCompatibles,
  formatearUsd,
  leerNumero,
}: PlanificacionScreenProps) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const campaniaActiva = snapshot.campanias.find((campania) => campania.erpId === planificacionActiva?.campaniaErpId);

  function abrirEditor(planificacionId: string) {
    seleccionarPlanificacion(planificacionId);
    setModoEdicion(true);
  }

  function renderLineasPlanificacion() {
    return lineasPlanificacion.map((linea) => {
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
      const protocolosCompatibles = obtenerProtocolosCompatibles(linea);
      const claveLinea = `${planificacionActiva?.campaniaErpId}|${linea.campoPlanificacionId}|${linea.lotePlanificacionId}|${linea.actividadPlanificacionId}`;
      const lineaDuplicada = clavesDuplicadas.has(claveLinea);

      return (
        <div className={`planning-row ${lineaDuplicada ? 'duplicated' : ''}`} key={linea.id}>
          <div className="planning-cell-wide">
            <span className="cell-label">Campo</span>
            <select
              value={linea.campoPlanificacionId}
              onChange={(event) => cambiarCampo(linea.id, event.target.value)}
              disabled={!puedeEditarPlanificacion}
            >
              {planificacion.camposPlanificacion.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
            <em>{campo?.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP'}</em>
          </div>
          <div className="planning-cell-wide">
            <span className="cell-label">Lote</span>
            <select
              value={linea.lotePlanificacionId}
              onChange={(event) => cambiarLote(linea.id, event.target.value)}
              disabled={!puedeEditarPlanificacion}
            >
              {lotesDelCampo.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
            <span>prod. {lote?.superficieProductiva ?? '-'}</span>
          </div>
          <div className="planning-cell-wide">
            <span className="cell-label">Actividad</span>
            <select
              value={linea.actividadPlanificacionId}
              onChange={(event) => cambiarActividad(linea.id, event.target.value)}
              disabled={!puedeEditarPlanificacion}
            >
              {(planificacion.actividadesPlanificacion || []).map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
            <span>{actividad?.codigoInterno || actividad?.actividadErpId || '-'}</span>
            {lineaDuplicada && <span className="cell-error">Actividad duplicada</span>}
          </div>
          <div className="planning-cell-wide">
            <span className="cell-label">Destino</span>
            <select
              value={linea.destinoVenta}
              onChange={(event) => cambiarDestino(linea.id, event.target.value)}
              disabled={!puedeEditarPlanificacion}
            >
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
            <input
              type="number"
              min="0"
              step="0.01"
              value={linea.hectareasPlanificadas}
              onChange={(event) => actualizarLinea(linea.id, { hectareasPlanificadas: leerNumero(event.target.value) })}
              disabled={!puedeEditarPlanificacion}
            />
            <span>ha</span>
          </div>
          <div className="planning-cell-medium">
            <span className="cell-label">Rinde</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={linea.rindeEstimado}
              onChange={(event) => actualizarLinea(linea.id, { rindeEstimado: leerNumero(event.target.value) })}
              disabled={!puedeEditarPlanificacion}
            />
            <span>tn/ha - prod. {produccionEstimada.toFixed(2)} tn</span>
          </div>
          <div className="planning-cell-medium">
            <span className="cell-label">Precio venta</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={linea.precioVentaEstimado}
              onChange={(event) => actualizarLinea(linea.id, { precioVentaEstimado: leerNumero(event.target.value), precioVentaManual: true })}
              disabled={!puedeEditarPlanificacion}
            />
            <span>{linea.precioVentaManual ? 'Manual' : 'Referencia'}</span>
          </div>
          <div className="planning-cell-medium">
            <span className="cell-label">Gastos comerciales</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={linea.gastosComercialesEstimados}
              onChange={(event) => actualizarLinea(linea.id, { gastosComercialesEstimados: leerNumero(event.target.value), gastosComercialesReferenciaId: undefined })}
              disabled={!puedeEditarPlanificacion}
            />
            <span>{gastoReferencia ? `${formatearUsd(gastosPorTonelada)} / tn - ${gastoReferencia.items.length} items` : 'Manual'}</span>
          </div>
          <div className="planning-cell-wide">
            <span className="cell-label">Protocolo</span>
            <select
              value={linea.protocoloId || ''}
              onChange={(event) => actualizarLinea(linea.id, { protocoloId: event.target.value || undefined })}
              disabled={!puedeEditarPlanificacion}
            >
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
            <button className="danger" onClick={() => eliminarLineaPlanificacion(linea.id)} disabled={!puedeEditarPlanificacion || lineasPlanificacion.length === 1}>
              Quitar
            </button>
          </div>
        </div>
      );
    });
  }

  if (modoEdicion) {
    return (
      <section className="planning-stack">
        <section className="planning-hero">
          <div>
            <p className="eyebrow">Edicion de planificacion</p>
            <h2>{planificacionActiva?.nombre || 'Planificacion sin nombre'}</h2>
            <p className="hint">Grilla de carga por campo, lote, actividad, destino y protocolo.</p>
          </div>
          <button className="secondary" onClick={() => setModoEdicion(false)}>
            Volver al resumen
          </button>
          <div className={`status-pill ${planificacionActiva?.estado === 'cerrada' ? 'locked' : ''}`}>
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
              <input
                value={planificacionActiva?.nombre || ''}
                onChange={(event) => actualizarCabeceraPlanificacion({ nombre: event.target.value })}
                disabled={!puedeEditarPlanificacion}
              />
            </label>
            <label>
              Campania
              <select
                value={planificacionActiva?.campaniaErpId || ''}
                onChange={(event) => cambiarCampaniaPlanificacion(event.target.value)}
                disabled={!puedeEditarPlanificacion}
              >
                {snapshot.campanias.map((campania) => (
                  <option key={campania.erpId} value={campania.erpId}>
                    {campania.codigo} {campania.esActual ? '(actual)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="planning-editor-description">
              Descripcion
              <input
                value={planificacionActiva?.descripcion || ''}
                onChange={(event) => actualizarCabeceraPlanificacion({ descripcion: event.target.value })}
                disabled={!puedeEditarPlanificacion}
              />
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
            {renderLineasPlanificacion()}
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Planificacion</p>
          <h2>Planificaciones agricolas</h2>
          <p className="hint">Resumen de campania, estado y margen. La carga detallada se edita en una grilla aparte.</p>
        </div>
        <div className="planning-hero-summary">
          <span>{campaniaActiva?.codigo || 'Sin campania'}</span>
          <strong>{planificacionActiva ? `${lineasPlanificacion.length} lineas` : 'Sin planificacion'}</strong>
        </div>
        <div className={`status-pill ${planificacionActiva?.estado === 'cerrada' ? 'locked' : ''}`}>
          {planificacionActiva?.estado || 'sin_estado'}
        </div>
      </section>

      <section className="metrics planning-metrics">
        <article>
          <span>Hectareas planificadas</span>
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

      {camposProvisorios > 0 && (
        <div className="status-warning">
          Hay {camposProvisorios} campo provisorio disponible para planificar. Cuando exista en ERP, se podra vincular con auditoria.
        </div>
      )}

      {tieneLineasDuplicadas && (
        <div className="status-error">
          Hay lineas duplicadas: para una misma campania, campo, lote y actividad solo puede existir una linea.
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Planificaciones</h2>
            <p className="hint">Vista principal de nombre, campania, estado y resultado economico.</p>
          </div>
          <div className="button-row">
            <button className="primary" onClick={() => planificacionActiva && abrirEditor(planificacionActiva.id)} disabled={!puedeEditarPlanificacion || !planificacionActiva}>
              Editar
            </button>
            <button className="secondary" onClick={cerrarPlanificacionActiva} disabled={!puedeCerrarPlanificacion || cerrandoPlanificacion || guardandoPlanificacion || tieneLineasDuplicadas}>
              <span className="button-content">
                {cerrandoPlanificacion && <LoadingSpinner label="Cerrando planificacion" />}
                {cerrandoPlanificacion ? 'Cerrando...' : 'Cerrar planificacion'}
              </span>
            </button>
          </div>
        </div>

        <div className="planning-summary-table">
          <div className="planning-summary-row planning-summary-head">
            <span>Nombre</span>
            <span>Campania</span>
            <span>Estado</span>
            <span>Hectareas</span>
            <span>Ingreso neto</span>
            <span>Costo</span>
            <span>Margen</span>
            <span>Acciones</span>
          </div>
          {planificacion.planificaciones.map((item) => {
            const campania = snapshot.campanias.find((campaniaItem) => campaniaItem.erpId === item.campaniaErpId);
            const hectareas = item.lineas.reduce((total, linea) => total + linea.hectareasPlanificadas, 0);
            const ingresoNeto = item.lineas.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0);
            const costo = item.lineas.reduce((total, linea) => total + linea.costoProduccionEstimado, 0);
            const margen = item.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0);
            const puedeEditarItem = puedeEditarPlanificacionPorPermiso && item.estado !== 'cerrada';

            return (
              <div className={`planning-summary-row ${item.id === planificacionActiva?.id ? 'selected' : ''}`} key={item.id}>
                <div>
                  <strong>{item.nombre}</strong>
                  <span>{item.descripcion || 'Sin descripcion'}</span>
                </div>
                <span>{campania?.codigo || item.campaniaErpId}</span>
                <em className={item.estado === 'cerrada' ? 'locked' : ''}>{item.estado}</em>
                <span>{hectareas.toFixed(2)}</span>
                <span>{formatearUsd(ingresoNeto)}</span>
                <span>{formatearUsd(costo)}</span>
                <strong>{formatearUsd(margen)}</strong>
                <button className="small" onClick={() => abrirEditor(item.id)} disabled={!puedeEditarItem}>
                  Editar
                </button>
              </div>
            );
          })}
        </div>

        {false && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-panel modal-panel-wide planning-editor-modal">
              <div className="modal-header">
                <div>
                  <h2>Editar planificacion</h2>
                  <p className="hint">Cabecera y grilla de carga por campo, lote, actividad y protocolo.</p>
                </div>
                <button className="small" onClick={() => setModoEdicion(false)}>
                  Cerrar
                </button>
              </div>

              <div className="planning-editor-header">
                <label>
                  Nombre
                  <input
                    value={planificacionActiva?.nombre || ''}
                    onChange={(event) => actualizarCabeceraPlanificacion({ nombre: event.target.value })}
                    disabled={!puedeEditarPlanificacion}
                  />
                </label>
                <label>
                  Campania
                  <select
                    value={planificacionActiva?.campaniaErpId || ''}
                    onChange={(event) => cambiarCampaniaPlanificacion(event.target.value)}
                    disabled={!puedeEditarPlanificacion}
                  >
                    {snapshot.campanias.map((campania) => (
                      <option key={campania.erpId} value={campania.erpId}>
                        {campania.codigo} {campania.esActual ? '(actual)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="planning-editor-description">
                  Descripcion
                  <input
                    value={planificacionActiva?.descripcion || ''}
                    onChange={(event) => actualizarCabeceraPlanificacion({ descripcion: event.target.value })}
                    disabled={!puedeEditarPlanificacion}
                  />
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

        <div className="planning-table">
          {lineasPlanificacion.map((linea) => {
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
            const protocolosCompatibles = obtenerProtocolosCompatibles(linea);
            const claveLinea = `${planificacionActiva?.campaniaErpId}|${linea.campoPlanificacionId}|${linea.lotePlanificacionId}|${linea.actividadPlanificacionId}`;
            const lineaDuplicada = clavesDuplicadas.has(claveLinea);

            return (
              <div className={`planning-row ${lineaDuplicada ? 'duplicated' : ''}`} key={linea.id}>
                <div className="planning-cell-wide">
                  <span className="cell-label">Campo</span>
                  <select
                    value={linea.campoPlanificacionId}
                    onChange={(event) => cambiarCampo(linea.id, event.target.value)}
                    disabled={!puedeEditarPlanificacion}
                  >
                    {planificacion.camposPlanificacion.map((item) => (
                      <option key={item.id} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>
                  <em>{campo?.estadoVinculacion === 'provisorio' ? 'Provisorio' : 'Vinculado ERP'}</em>
                </div>
                <div className="planning-cell-wide">
                  <span className="cell-label">Lote</span>
                  <select
                    value={linea.lotePlanificacionId}
                    onChange={(event) => cambiarLote(linea.id, event.target.value)}
                    disabled={!puedeEditarPlanificacion}
                  >
                    {lotesDelCampo.map((item) => (
                      <option key={item.id} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>
                  <span>prod. {lote?.superficieProductiva ?? '-'}</span>
                </div>
                <div className="planning-cell-wide">
                  <span className="cell-label">Actividad</span>
                  <select
                    value={linea.actividadPlanificacionId}
                    onChange={(event) => cambiarActividad(linea.id, event.target.value)}
                    disabled={!puedeEditarPlanificacion}
                  >
                    {(planificacion.actividadesPlanificacion || []).map((item) => (
                      <option key={item.id} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>
                  <span>{actividad?.codigoInterno || actividad?.actividadErpId || '-'}</span>
                  {lineaDuplicada && <span className="cell-error">Actividad duplicada</span>}
                </div>
                <div className="planning-cell-wide">
                  <span className="cell-label">Destino</span>
                  <select
                    value={linea.destinoVenta}
                    onChange={(event) => cambiarDestino(linea.id, event.target.value)}
                    disabled={!puedeEditarPlanificacion}
                  >
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
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linea.hectareasPlanificadas}
                    onChange={(event) => actualizarLinea(linea.id, { hectareasPlanificadas: leerNumero(event.target.value) })}
                    disabled={!puedeEditarPlanificacion}
                  />
                  <span>ha</span>
                </div>
                <div className="planning-cell-medium">
                  <span className="cell-label">Rinde</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linea.rindeEstimado}
                    onChange={(event) => actualizarLinea(linea.id, { rindeEstimado: leerNumero(event.target.value) })}
                    disabled={!puedeEditarPlanificacion}
                  />
                  <span>tn/ha - prod. {produccionEstimada.toFixed(2)} tn</span>
                </div>
                <div className="planning-cell-medium">
                  <span className="cell-label">Precio venta</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linea.precioVentaEstimado}
                    onChange={(event) => actualizarLinea(linea.id, { precioVentaEstimado: leerNumero(event.target.value), precioVentaManual: true })}
                    disabled={!puedeEditarPlanificacion}
                  />
                  <span>{linea.precioVentaManual ? 'Manual' : 'Referencia'}</span>
                </div>
                <div className="planning-cell-medium">
                  <span className="cell-label">Gastos comerciales</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linea.gastosComercialesEstimados}
                    onChange={(event) => actualizarLinea(linea.id, { gastosComercialesEstimados: leerNumero(event.target.value), gastosComercialesReferenciaId: undefined })}
                    disabled={!puedeEditarPlanificacion}
                  />
                  <span>{gastoReferencia ? `${formatearUsd(gastosPorTonelada)} / tn - ${gastoReferencia.items.length} items` : 'Manual'}</span>
                </div>
                <div className="planning-cell-wide">
                  <span className="cell-label">Protocolo</span>
                  <select
                    value={linea.protocoloId || ''}
                    onChange={(event) => actualizarLinea(linea.id, { protocoloId: event.target.value || undefined })}
                    disabled={!puedeEditarPlanificacion}
                  >
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
                  <button className="danger" onClick={() => eliminarLineaPlanificacion(linea.id)} disabled={!puedeEditarPlanificacion || lineasPlanificacion.length === 1}>
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
            </div>
          </div>
        )}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Precios de referencia</h2>
          </div>
            <div className="activity-list">
              {planificacion.preciosReferencia.map((precio) => (
                <article key={precio.id}>
                  <span>{precio.fuente}</span>
                  <strong>{precio.destinoVenta} - {formatearUsd(precio.valor)} {precio.unidad}</strong>
                  <p>Se propone al crear la linea, pero el valor se copia para conservar el supuesto.</p>
                </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Protocolos</h2>
          </div>
          <div className="activity-list">
            {planificacion.protocolos.map((protocolo) => (
              <article key={protocolo.id}>
                <span>{protocolo.activo ? 'Activo' : 'Inactivo'}</span>
                <strong>{protocolo.nombre}</strong>
                <p>{protocolo.descripcion}. Costo: {formatearUsd(protocolo.costoEstimadoPorHa)} / ha.</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
