import { useMemo, useState } from 'react';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { PlanificacionActiva, PlanificacionBaseProps } from './planificacionTypes';

type PlanificacionesResumenScreenProps = PlanificacionBaseProps & {
  onEditarPlanificacion: (planificacionId: string) => void;
  onNuevoEscenario: (datos: { nombre: string; campaniaErpId: string; descripcion?: string }) => Promise<boolean>;
  onCopiarEscenario: (planificacionId: string) => Promise<boolean>;
};

function calcularResumen(item: PlanificacionActiva) {
  return {
    hectareas: item.lineas.reduce((total, linea) => total + linea.hectareasPlanificadas, 0),
    ingresoNeto: item.lineas.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0),
    costo: item.lineas.reduce((total, linea) => total + linea.costoProduccionEstimado, 0),
    margen: item.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
  };
}

export function PlanificacionesResumenScreen({
  planificacion,
  campaniasDisponibles,
  puedeEditarPlanificacion,
  puedeEditarPlanificacionPorPermiso,
  puedeCerrarPlanificacion,
  guardandoPlanificacion,
  cerrandoPlanificacion,
  planificacionActiva,
  camposProvisorios,
  tieneLineasDuplicadas,
  cerrarPlanificacionActiva,
  formatearUsd,
  onEditarPlanificacion,
  onNuevoEscenario,
  onCopiarEscenario,
}: PlanificacionesResumenScreenProps) {
  const campaniaInicial = planificacionActiva?.campaniaErpId
    || campaniasDisponibles.find((campania) => campania.esActual)?.erpId
    || campaniasDisponibles[0]?.erpId
    || '';
  const [modalEscenarioAbierto, setModalEscenarioAbierto] = useState(false);
  const [nuevoEscenario, setNuevoEscenario] = useState({
    nombre: '',
    campaniaErpId: campaniaInicial,
    descripcion: '',
  });
  const campaniasPorId = useMemo(() => new Map(campaniasDisponibles.map((campania) => [campania.erpId, campania])), [campaniasDisponibles]);
  const campaniaTieneOriginal = planificacion.planificaciones.some((item) => (
    item.campaniaErpId === nuevoEscenario.campaniaErpId
    && item.estado === 'cerrada'
    && item.escenarioOriginal
  ));

  function abrirNuevoEscenario() {
    setNuevoEscenario({
      nombre: '',
      campaniaErpId: campaniaInicial,
      descripcion: '',
    });
    setModalEscenarioAbierto(true);
  }

  async function confirmarNuevoEscenario() {
    const creado = await onNuevoEscenario({
      nombre: nuevoEscenario.nombre,
      campaniaErpId: nuevoEscenario.campaniaErpId,
      descripcion: nuevoEscenario.descripcion || undefined,
    });

    if (creado) {
      setModalEscenarioAbierto(false);
    }
  }

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Planificacion"
        title="Planificaciones agricolas"
        description="Resumen de campania, estado y margen. La carga detallada se edita en una pantalla aparte."
      />

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

      <Panel
        title="Planificaciones"
        description="Vista principal de nombre, campania, estado y resultado economico."
        actions={(
          <ActionBar align="end">
            <Button variant="secondary" onClick={abrirNuevoEscenario} disabled={!puedeEditarPlanificacionPorPermiso || guardandoPlanificacion || campaniasDisponibles.length === 0}>
              Nuevo escenario
            </Button>
            <Button variant="primary" onClick={() => planificacionActiva && onEditarPlanificacion(planificacionActiva.id)} disabled={!puedeEditarPlanificacion || !planificacionActiva}>
              Editar
            </Button>
            <Button variant="secondary" onClick={cerrarPlanificacionActiva} disabled={!puedeCerrarPlanificacion || cerrandoPlanificacion || guardandoPlanificacion || tieneLineasDuplicadas}>
              <span className="button-content">
                {cerrandoPlanificacion && <LoadingSpinner label="Cerrando planificacion" />}
                {cerrandoPlanificacion ? 'Cerrando...' : 'Cerrar planificacion'}
              </span>
            </Button>
          </ActionBar>
        )}
      >
        <DataTable
          rows={planificacion.planificaciones}
          getRowKey={(item) => item.id}
          emptyMessage="Todavia no hay planificaciones registradas."
          columns={[
            {
              key: 'nombre',
              label: 'Nombre',
              width: 'minmax(150px, 1.45fr)',
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
              width: 'minmax(72px, 0.48fr)',
              render: (item) => campaniasPorId.get(item.campaniaErpId)?.codigo || item.campaniaErpId,
            },
            {
              key: 'estado',
              label: 'Estado',
              width: 'minmax(78px, 0.5fr)',
              render: (item) => <em className={item.estado === 'cerrada' || item.estado === 'deshabilitada' ? 'locked' : ''}>{item.estado}</em>,
            },
            {
              key: 'hectareas',
              label: 'Hectareas',
              width: 'minmax(74px, 0.48fr)',
              render: (item) => calcularResumen(item).hectareas.toFixed(2),
            },
            {
              key: 'ingreso',
              label: 'Ingreso neto',
              width: 'minmax(92px, 0.68fr)',
              render: (item) => formatearUsd(calcularResumen(item).ingresoNeto),
            },
            {
              key: 'costo',
              label: 'Costo',
              width: 'minmax(86px, 0.62fr)',
              render: (item) => formatearUsd(calcularResumen(item).costo),
            },
            {
              key: 'margen',
              label: 'Margen',
              width: 'minmax(92px, 0.68fr)',
              render: (item) => <strong>{formatearUsd(calcularResumen(item).margen)}</strong>,
            },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(76px, 0.36fr)',
              render: (item) => (
                <div className="table-icon-actions">
                  <IconButton icon="edit" label={`Editar ${item.nombre}`} onClick={() => onEditarPlanificacion(item.id)} disabled={!puedeEditarPlanificacionPorPermiso || item.estado === 'cerrada' || item.estado === 'deshabilitada'} />
                  <IconButton icon="copy" label={`Copiar ${item.nombre}`} onClick={() => onCopiarEscenario(item.id)} disabled={!puedeEditarPlanificacionPorPermiso || guardandoPlanificacion || item.estado === 'cerrada' || item.estado === 'deshabilitada'} />
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <section className="content-grid">
        <Panel title="Precios de referencia">
          <div className="activity-list">
            {planificacion.preciosReferencia.map((precio) => (
              <article key={precio.id}>
                <span>{precio.fuente}</span>
                <strong>{precio.destinoVenta} - {formatearUsd(precio.valor)} {precio.unidad}</strong>
                <p>Se propone al crear la linea, pero el valor se copia para conservar el supuesto.</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Protocolos">
          <div className="activity-list">
            {planificacion.protocolos.map((protocolo) => (
              <article key={protocolo.id}>
                <span>{protocolo.activo ? 'Activo' : 'Inactivo'}</span>
                <strong>{protocolo.nombre}</strong>
                <p>{protocolo.descripcion}. Costo: {formatearUsd(protocolo.costoEstimadoPorHa)} / ha.</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      {modalEscenarioAbierto && (
        <div className="modal-backdrop">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="nuevo-escenario-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Planificacion</p>
                <h2 id="nuevo-escenario-title">Nuevo escenario</h2>
              </div>
              <Button variant="ghost" onClick={() => setModalEscenarioAbierto(false)}>Cerrar</Button>
            </div>

            <div className="form-grid">
              <label>
                Nombre
                <input value={nuevoEscenario.nombre} onChange={(event) => setNuevoEscenario((actual) => ({ ...actual, nombre: event.target.value }))} placeholder="Ej. Escenario objetivo 25/26" />
              </label>
              <label>
                Campania
                <select value={nuevoEscenario.campaniaErpId} onChange={(event) => setNuevoEscenario((actual) => ({ ...actual, campaniaErpId: event.target.value }))}>
                  {campaniasDisponibles.map((campania) => (
                    <option key={campania.erpId} value={campania.erpId}>
                      {campania.codigo} {campania.esActual ? '(actual)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-span-2">
                Descripcion
                <input value={nuevoEscenario.descripcion} onChange={(event) => setNuevoEscenario((actual) => ({ ...actual, descripcion: event.target.value }))} placeholder="Objetivo o supuesto principal del escenario" />
              </label>
            </div>

            {campaniaTieneOriginal && (
              <p className="status-error">Esta campania ya tiene un escenario original cerrado. No se pueden crear nuevas simulaciones.</p>
            )}

            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModalEscenarioAbierto(false)}>Cancelar</Button>
              <Button variant="primary" onClick={confirmarNuevoEscenario} disabled={guardandoPlanificacion || !nuevoEscenario.nombre.trim() || !nuevoEscenario.campaniaErpId || campaniaTieneOriginal}>
                <span className="button-content">
                  {guardandoPlanificacion && <LoadingSpinner label="Creando escenario" />}
                  {guardandoPlanificacion ? 'Creando...' : 'Crear escenario'}
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
