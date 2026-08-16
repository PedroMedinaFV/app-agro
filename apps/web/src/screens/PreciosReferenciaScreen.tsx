import { useMemo, useState } from 'react';
import { PlanificacionSnapshot, PrecioReferencia } from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarTexto(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

interface PreciosReferenciaScreenProps {
  planificacion: PlanificacionSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoPrecios: boolean;
  guardarPrecioReferencia: (precio: PrecioReferencia) => Promise<boolean>;
  formatearUsd: (valor: number) => string;
  leerNumero: (valor: string) => number;
}

export function PreciosReferenciaScreen({
  planificacion,
  puedeConfigurarPlanificacion,
  guardandoPrecios,
  guardarPrecioReferencia,
  formatearUsd,
  leerNumero,
}: PreciosReferenciaScreenProps) {
  const [precioEnEdicion, setPrecioEnEdicion] = useState<PrecioReferencia | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const destinosDisponibles = useMemo(() => {
    const destinos = new Map<string, string>();

    for (const destino of planificacion.destinosReferencia) {
      destinos.set(destino.destinoVentaNormalizado || normalizarTexto(destino.destinoVenta), limpiarTextoVisible(destino.destinoVenta));
    }

    for (const precio of planificacion.preciosReferencia) {
      destinos.set(normalizarTexto(precio.destinoVenta), limpiarTextoVisible(precio.destinoVenta));
    }

    return Array.from(destinos.values()).sort((a, b) => a.localeCompare(b));
  }, [planificacion.destinosReferencia, planificacion.preciosReferencia]);
  const actividades = planificacion.actividadesPlanificacion || [];

  function formatearFecha(valor: string) {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(valor));
  }

  function crearBorradorPrecio(): PrecioReferencia {
    const ahora = new Date().toISOString();
    const actividad = actividades[0];
    const destino = actividad ? planificacion.destinosReferencia.find((item) => item.actividadPlanificacionId === actividad.id) : undefined;

    return {
      id: `precio-referencia-${Date.now()}`,
      clienteId: planificacion.preciosReferencia[0]?.clienteId || planificacion.planificaciones[0]?.clienteId || 'cliente-demo',
      empresaErpId: actividad?.empresaErpId,
      actividadPlanificacionId: actividad?.id || '',
      actividadErpId: actividad?.actividadErpId,
      especiePlanificacionId: actividad?.especiePlanificacionId,
      especieErpId: actividad?.especieErpId,
      destinoVenta: destino?.destinoVenta || '',
      valor: 0,
      moneda: 'USD',
      unidad: 'tn',
      fuente: 'manual',
      observaciones: '',
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  function abrirNuevoPrecio() {
    setModoModal('crear');
    setPrecioEnEdicion(crearBorradorPrecio());
  }

  function abrirEditarPrecio(precio: PrecioReferencia) {
    setModoModal('editar');
    setPrecioEnEdicion({ ...precio });
  }

  function actualizarBorrador(cambios: Partial<PrecioReferencia>) {
    setPrecioEnEdicion((actual) => (actual ? { ...actual, ...cambios, updatedAt: new Date().toISOString() } : actual));
  }

  async function aplicarModal() {
    if (!precioEnEdicion) {
      return;
    }

    const guardado = await guardarPrecioReferencia(precioEnEdicion);

    if (guardado) {
      setPrecioEnEdicion(null);
    }
  }

  const destinoExistenteModal = precioEnEdicion
    ? destinosDisponibles.some((destino) => normalizarTexto(destino) === normalizarTexto(precioEnEdicion.destinoVenta))
    : false;
  const destinoCanonicoModal = precioEnEdicion
    ? destinosDisponibles.find((destino) => normalizarTexto(destino) === normalizarTexto(precioEnEdicion.destinoVenta))
    : undefined;

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Referencias comerciales</p>
          <h2>Precios de cereales</h2>
          <p className="hint">Tabla base editable para proponer precios por actividad y destino al crear la planificacion. Cada cambio queda auditado cuando se guarda en backend.</p>
        </div>
        <div className="status-pill">{planificacion.preciosReferencia.length}</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Precios registrados</h2>
            <p className="hint">Los valores se copian a la linea de planificacion para conservar el supuesto original. Editar un precio no reescribe planificaciones ya cerradas.</p>
          </div>
          <div className="button-row">
            <button className="small" onClick={abrirNuevoPrecio} disabled={!puedeConfigurarPlanificacion}>
              Nuevo precio
            </button>
          </div>
        </div>

        <div className="reference-list">
          <div className="reference-list-row reference-list-head">
            <span>Actividad</span>
            <span>Destino</span>
            <span>Precio</span>
            <span>Fuente</span>
            <span>Actualizado</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {!planificacion.preciosReferencia.length && (
            <div className="empty-state">Todavia no hay precios registrados.</div>
          )}
          {planificacion.preciosReferencia.map((precio) => {
            const actividad = actividades.find((item) => item.id === precio.actividadPlanificacionId);

            return (
              <div className="reference-list-row" key={`tabla-${precio.id}`}>
                <strong>{actividad?.nombre || precio.actividadErpId || 'Sin actividad'}</strong>
                <span>{precio.destinoVenta || 'Sin destino'}</span>
                <span>{precio.moneda === 'USD' ? formatearUsd(precio.valor) : `${precio.moneda} ${precio.valor}`} / {precio.unidad}</span>
                <span>{precio.fuente}</span>
                <span>{formatearFecha(precio.updatedAt || precio.createdAt)}</span>
                <span>{precio.activo ? 'Activo' : 'Inactivo'}</span>
                <button className="small" onClick={() => abrirEditarPrecio(precio)} disabled={!puedeConfigurarPlanificacion}>
                  Editar
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {precioEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="precio-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Precio de referencia</p>
                <h2 id="precio-modal-title">{modoModal === 'crear' ? 'Nuevo precio' : 'Editar precio'}</h2>
              </div>
              <button className="small" onClick={() => setPrecioEnEdicion(null)}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Actividad
                <select
                  value={precioEnEdicion.actividadPlanificacionId}
                  onChange={(event) => {
                    const actividadSeleccionada = actividades.find((item) => item.id === event.target.value);
                    actualizarBorrador({
                      actividadPlanificacionId: event.target.value,
                      empresaErpId: actividadSeleccionada?.empresaErpId,
                      actividadErpId: actividadSeleccionada?.actividadErpId,
                      especiePlanificacionId: actividadSeleccionada?.especiePlanificacionId,
                      especieErpId: actividadSeleccionada?.especieErpId,
                    });
                  }}
                >
                  <option value="">Seleccionar actividad</option>
                  {actividades.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </label>

              <label>
                Destino
                <select
                  value={!precioEnEdicion.destinoVenta ? '' : destinoExistenteModal ? destinoCanonicoModal || '' : '__nuevo__'}
                  onChange={(event) => actualizarBorrador({ destinoVenta: event.target.value === '__nuevo__' ? '' : event.target.value })}
                >
                  <option value="">Seleccionar destino</option>
                  {destinosDisponibles.map((destino) => (
                    <option key={destino} value={destino}>{destino}</option>
                  ))}
                  <option value="__nuevo__">Crear nuevo destino</option>
                </select>
              </label>

              {!destinoExistenteModal && (
                <label>
                  Nuevo destino
                  <input
                    value={precioEnEdicion.destinoVenta}
                    placeholder="Ej. Puerto Quequen"
                    onChange={(event) => actualizarBorrador({ destinoVenta: event.target.value })}
                  />
                </label>
              )}

              <label>
                Valor
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precioEnEdicion.valor}
                  onChange={(event) => actualizarBorrador({ valor: leerNumero(event.target.value) })}
                />
              </label>

              <label>
                Moneda
                <select value={precioEnEdicion.moneda} onChange={(event) => actualizarBorrador({ moneda: event.target.value })}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>

              <label>
                Unidad
                <select value={precioEnEdicion.unidad} onChange={(event) => actualizarBorrador({ unidad: event.target.value })}>
                  <option value="tn">tn</option>
                  <option value="kg">kg</option>
                  <option value="qq">qq</option>
                </select>
              </label>

              <label>
                Fuente
                <input value={precioEnEdicion.fuente} onChange={(event) => actualizarBorrador({ fuente: event.target.value })} />
              </label>

              <label className="reference-wide">
                Observaciones
                <input value={precioEnEdicion.observaciones || ''} onChange={(event) => actualizarBorrador({ observaciones: event.target.value })} />
              </label>

              <label className="reference-check">
                <input type="checkbox" checked={precioEnEdicion.activo} onChange={(event) => actualizarBorrador({ activo: event.target.checked })} />
                Activo
              </label>
            </div>

            <div className="modal-actions">
              <button className="small" onClick={() => setPrecioEnEdicion(null)}>Cancelar</button>
              <button
                className="primary"
                onClick={aplicarModal}
                disabled={guardandoPrecios || !precioEnEdicion.actividadPlanificacionId || !precioEnEdicion.destinoVenta.trim() || precioEnEdicion.valor < 0}
              >
                <span className="button-content">
                  {guardandoPrecios && <LoadingSpinner label="Guardando precio" />}
                  {guardandoPrecios ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
