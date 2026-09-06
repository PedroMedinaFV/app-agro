import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlanificacionActiva, PlanificacionBaseProps } from './planificacionTypes';

type PlanificacionesResumenScreenProps = PlanificacionBaseProps & {
  onEditarPlanificacion: (planificacionId: string) => void;
};

export function PlanificacionesResumenScreen({
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
  cerrarPlanificacionActiva,
  formatearUsd,
  onEditarPlanificacion,
}: PlanificacionesResumenScreenProps) {
  const campaniaActiva = snapshot.campanias.find((campania) => campania.erpId === planificacionActiva?.campaniaErpId);

  function calcularResumen(item: PlanificacionActiva) {
    return {
      hectareas: item.lineas.reduce((total, linea) => total + linea.hectareasPlanificadas, 0),
      ingresoNeto: item.lineas.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0),
      costo: item.lineas.reduce((total, linea) => total + linea.costoProduccionEstimado, 0),
      margen: item.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
    };
  }

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Planificacion</p>
          <h2>Planificaciones agricolas</h2>
          <p className="hint">Resumen de campania, estado y margen. La carga detallada se edita en una pantalla aparte.</p>
        </div>
        <div className="planning-hero-summary">
          <span>{campaniaActiva?.codigo || 'Sin campania'}</span>
          <strong>{planificacionActiva ? `${lineasPlanificacion.length} lineas` : 'Sin planificacion'}</strong>
        </div>
        <div className={`status-pill ${planificacionActiva?.estado === 'cerrada' || planificacionActiva?.estado === 'deshabilitada' ? 'locked' : ''}`}>
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
            <button className="primary" onClick={() => planificacionActiva && onEditarPlanificacion(planificacionActiva.id)} disabled={!puedeEditarPlanificacion || !planificacionActiva}>
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

        <DataTable
          rows={planificacion.planificaciones}
          getRowKey={(item) => item.id}
          emptyMessage="Todavia no hay planificaciones registradas."
          columns={[
            {
              key: 'nombre',
              label: 'Nombre',
              width: 'minmax(180px, 1.35fr)',
              render: (item) => (
                <div>
                  <strong>{item.nombre}</strong>
                  <span>{item.escenarioOriginal ? 'Escenario original' : item.descripcion || 'Sin descripcion'}</span>
                </div>
              ),
            },
            {
              key: 'campania',
              label: 'Campania',
              width: 'minmax(84px, 0.55fr)',
              render: (item) => snapshot.campanias.find((campania) => campania.erpId === item.campaniaErpId)?.codigo || item.campaniaErpId,
            },
            {
              key: 'estado',
              label: 'Estado',
              width: 'minmax(86px, 0.55fr)',
              render: (item) => <em className={item.estado === 'cerrada' || item.estado === 'deshabilitada' ? 'locked' : ''}>{item.estado}</em>,
            },
            {
              key: 'hectareas',
              label: 'Hectareas',
              width: 'minmax(86px, 0.55fr)',
              render: (item) => calcularResumen(item).hectareas.toFixed(2),
            },
            {
              key: 'ingreso',
              label: 'Ingreso neto',
              width: 'minmax(110px, 0.75fr)',
              render: (item) => formatearUsd(calcularResumen(item).ingresoNeto),
            },
            {
              key: 'costo',
              label: 'Costo',
              width: 'minmax(100px, 0.7fr)',
              render: (item) => formatearUsd(calcularResumen(item).costo),
            },
            {
              key: 'margen',
              label: 'Margen',
              width: 'minmax(110px, 0.75fr)',
              render: (item) => <strong>{formatearUsd(calcularResumen(item).margen)}</strong>,
            },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(86px, 0.5fr)',
              render: (item) => (
                <button className="small" onClick={() => onEditarPlanificacion(item.id)} disabled={!puedeEditarPlanificacionPorPermiso || item.estado === 'cerrada' || item.estado === 'deshabilitada'}>
                  Editar
                </button>
              ),
            },
          ]}
        />
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
