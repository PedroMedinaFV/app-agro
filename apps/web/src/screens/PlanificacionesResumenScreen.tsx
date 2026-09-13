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
    hectareas: item.lineas.reduce((total, linea) => total + (linea.protocoloId ? linea.hectareasPlanificadas : 0), 0),
    ingresoNeto: item.lineas.reduce((total, linea) => total + linea.ingresoNetoEstimado, 0),
    costo: item.lineas.reduce((total, linea) => total + linea.costoProduccionEstimado, 0),
    margen: item.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0),
  };
}

export function PlanificacionesResumenScreen({
  sesion,
  planificacion,
  campaniasDisponibles,
  puedeEditarPlanificacionPorPermiso,
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
  const [planificacionParaCerrarId, setPlanificacionParaCerrarId] = useState<string | null>(null);
  const campaniasPorId = useMemo(() => new Map(campaniasDisponibles.map((campania) => [campania.erpId, campania])), [campaniasDisponibles]);
  const resumenPorPlanificacion = useMemo(() => new Map(
    planificacion.planificaciones.map((item) => [item.id, calcularResumen(item)]),
  ), [planificacion.planificaciones]);
  const puedeCerrarPorPermiso = sesion.permisos.includes('planificacion:cerrar');
  const preciosVisibles = useMemo(() => planificacion.preciosReferencia.slice(0, 6), [planificacion.preciosReferencia]);
  const protocolosVisibles = useMemo(() => planificacion.protocolos.slice(0, 6), [planificacion.protocolos]);
  const planificacionParaCerrar = planificacion.planificaciones.find((item) => item.id === planificacionParaCerrarId);
  const resumenParaCerrar = planificacionParaCerrar ? resumenPorPlanificacion.get(planificacionParaCerrar.id) : undefined;
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

  function tieneDuplicados(item: PlanificacionActiva) {
    const claves = new Set<string>();

    for (const linea of item.lineas) {
      const clave = `${item.campaniaErpId}|${linea.campoAppId}|${linea.loteAppId}|${linea.actividadAppId}`;

      if (claves.has(clave)) {
        return true;
      }

      claves.add(clave);
    }

    return false;
  }

  function obtenerMotivoCierreDeshabilitado(item: PlanificacionActiva) {
    const resumen = resumenPorPlanificacion.get(item.id);

    if (!puedeCerrarPorPermiso) {
      return 'No tenes permisos para cerrar planificaciones';
    }

    if (item.estado === 'cerrada') {
      return 'La planificacion ya esta cerrada';
    }

    if (item.estado === 'deshabilitada') {
      return 'La planificacion esta deshabilitada por otro escenario cerrado';
    }

    if (guardandoPlanificacion || cerrandoPlanificacion) {
      return 'Hay una accion en curso';
    }

    if (tieneDuplicados(item)) {
      return 'Tiene lineas duplicadas';
    }

    if ((resumen?.hectareas || 0) <= 0) {
      return 'Las hectareas planificadas deben ser mayores a cero';
    }

    return '';
  }

  async function confirmarCierrePlanificacion() {
    if (!planificacionParaCerrar) {
      return;
    }

    await cerrarPlanificacionActiva(planificacionParaCerrar.id);
    setPlanificacionParaCerrarId(null);
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
              render: (item) => (resumenPorPlanificacion.get(item.id)?.hectareas || 0).toFixed(2),
            },
            {
              key: 'ingreso',
              label: 'Ingreso neto',
              width: 'minmax(92px, 0.68fr)',
              render: (item) => formatearUsd(resumenPorPlanificacion.get(item.id)?.ingresoNeto || 0),
            },
            {
              key: 'costo',
              label: 'Costo',
              width: 'minmax(86px, 0.62fr)',
              render: (item) => formatearUsd(resumenPorPlanificacion.get(item.id)?.costo || 0),
            },
            {
              key: 'margen',
              label: 'Margen',
              width: 'minmax(92px, 0.68fr)',
              render: (item) => <strong>{formatearUsd(resumenPorPlanificacion.get(item.id)?.margen || 0)}</strong>,
            },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(120px, 0.48fr)',
              render: (item) => {
                const motivoCierreDeshabilitado = obtenerMotivoCierreDeshabilitado(item);

                return (
                  <div className="table-icon-actions">
                    <IconButton icon="edit" label={`Editar ${item.nombre}`} onClick={() => onEditarPlanificacion(item.id)} disabled={!puedeEditarPlanificacionPorPermiso || item.estado === 'cerrada' || item.estado === 'deshabilitada'} />
                    <IconButton icon="copy" label={`Copiar ${item.nombre}`} onClick={() => onCopiarEscenario(item.id)} disabled={!puedeEditarPlanificacionPorPermiso || guardandoPlanificacion || item.estado === 'cerrada' || item.estado === 'deshabilitada'} />
                    <IconButton
                      icon="lock"
                      label={`Cerrar ${item.nombre}`}
                      title={motivoCierreDeshabilitado || `Cerrar ${item.nombre}`}
                      onClick={() => setPlanificacionParaCerrarId(item.id)}
                      disabled={Boolean(motivoCierreDeshabilitado)}
                    />
                  </div>
                );
              },
            },
          ]}
        />
      </Panel>

      <section className="content-grid">
        <Panel title="Precios de referencia">
          <div className="activity-list">
            {preciosVisibles.map((precio) => (
              <article key={precio.id}>
                <span>{precio.fuente}</span>
                <strong>{precio.destinoVenta} - {formatearUsd(precio.valor)} {precio.unidad}</strong>
                <p>Se propone al crear la linea, pero el valor se copia para conservar el supuesto.</p>
              </article>
            ))}
            {planificacion.preciosReferencia.length > preciosVisibles.length && (
              <article>
                <span>Resumen</span>
                <strong>{planificacion.preciosReferencia.length - preciosVisibles.length} precios mas</strong>
                <p>El listado completo se administra desde la pantalla Precios.</p>
              </article>
            )}
          </div>
        </Panel>

        <Panel title="Protocolos">
          <div className="activity-list">
            {protocolosVisibles.map((protocolo) => (
              <article key={protocolo.id}>
                <span>{protocolo.activo ? 'Activo' : 'Inactivo'}</span>
                <strong>{protocolo.nombre}</strong>
                <p>{protocolo.descripcion}. Costo: {formatearUsd(protocolo.costoEstimadoPorHa)} / ha.</p>
              </article>
            ))}
            {planificacion.protocolos.length > protocolosVisibles.length && (
              <article>
                <span>Resumen</span>
                <strong>{planificacion.protocolos.length - protocolosVisibles.length} protocolos mas</strong>
                <p>El listado completo se administra desde la pantalla Protocolos.</p>
              </article>
            )}
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

      {planificacionParaCerrar && (
        <div className="modal-backdrop">
          <section className="modal-panel modal-panel-narrow" role="dialog" aria-modal="true" aria-labelledby="cerrar-planificacion-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Cierre de escenario</p>
                <h2 id="cerrar-planificacion-title">Cerrar planificacion</h2>
              </div>
              <Button variant="ghost" onClick={() => setPlanificacionParaCerrarId(null)}>Cerrar</Button>
            </div>

            <p>
              Vas a cerrar <strong>{planificacionParaCerrar.nombre}</strong>
              {' '}de la campania <strong>{campaniasPorId.get(planificacionParaCerrar.campaniaErpId)?.codigo || planificacionParaCerrar.campaniaErpId}</strong>.
            </p>
            <p className="status-warning">
              Este escenario quedara como original y se deshabilitaran los otros escenarios de la misma campania.
            </p>

            <div className="summary-grid">
              <article>
                <span>Hectareas</span>
                <strong>{(resumenParaCerrar?.hectareas || 0).toFixed(2)}</strong>
              </article>
              <article>
                <span>Margen</span>
                <strong>{formatearUsd(resumenParaCerrar?.margen || 0)}</strong>
              </article>
            </div>

            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setPlanificacionParaCerrarId(null)}>Cancelar</Button>
              <Button variant="primary" onClick={confirmarCierrePlanificacion} disabled={cerrandoPlanificacion || Boolean(obtenerMotivoCierreDeshabilitado(planificacionParaCerrar))}>
                <span className="button-content">
                  {cerrandoPlanificacion && <LoadingSpinner label="Cerrando planificacion" />}
                  {cerrandoPlanificacion ? 'Cerrando...' : 'Confirmar cierre'}
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
