import { useMemo, useState } from 'react';
import { DestinoVentaReferencia, PlanificacionSnapshot } from '@agro/tipos';
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

interface DestinosVentaScreenProps {
  planificacion: PlanificacionSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoDestinos: boolean;
  guardarDestino: (destino: DestinoVentaReferencia) => Promise<boolean>;
}

export function DestinosVentaScreen({
  planificacion,
  puedeConfigurarPlanificacion,
  guardandoDestinos,
  guardarDestino,
}: DestinosVentaScreenProps) {
  const [destinoEnEdicion, setDestinoEnEdicion] = useState<DestinoVentaReferencia | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const destinosOrdenados = useMemo(() => (
    [...planificacion.destinosReferencia].sort((a, b) => a.destinoVenta.localeCompare(b.destinoVenta))
  ), [planificacion.destinosReferencia]);

  function crearBorradorDestino(): DestinoVentaReferencia {
    const ahora = new Date().toISOString();

    return {
      id: `destino-venta-${Date.now()}`,
      clienteId: planificacion.planificaciones[0]?.clienteId || planificacion.destinosReferencia[0]?.clienteId || 'cliente-demo',
      destinoVenta: '',
      destinoVentaNormalizado: '',
      descripcion: '',
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  function abrirNuevoDestino() {
    setModoModal('crear');
    setDestinoEnEdicion(crearBorradorDestino());
  }

  function abrirEditarDestino(destino: DestinoVentaReferencia) {
    setModoModal('editar');
    setDestinoEnEdicion({ ...destino });
  }

  function actualizarBorrador(cambios: Partial<DestinoVentaReferencia>) {
    setDestinoEnEdicion((actual) => {
      if (!actual) {
        return actual;
      }

      const siguiente = { ...actual, ...cambios, updatedAt: new Date().toISOString() };

      if (Object.prototype.hasOwnProperty.call(cambios, 'destinoVenta')) {
        siguiente.destinoVentaNormalizado = normalizarTexto(siguiente.destinoVenta);
      }

      return siguiente;
    });
  }

  async function aplicarModal() {
    if (!destinoEnEdicion) {
      return;
    }

    const destinoVenta = limpiarTextoVisible(destinoEnEdicion.destinoVenta);
    const destinoPreparado: DestinoVentaReferencia = {
      ...destinoEnEdicion,
      destinoVenta,
      destinoVentaNormalizado: normalizarTexto(destinoVenta),
      descripcion: destinoEnEdicion.descripcion ? limpiarTextoVisible(destinoEnEdicion.descripcion) : undefined,
    };
    const guardado = await guardarDestino(destinoPreparado);

    if (guardado) {
      setDestinoEnEdicion(null);
    }
  }

  const destinoNormalizadoActual = destinoEnEdicion ? normalizarTexto(destinoEnEdicion.destinoVenta) : '';
  const existeDestinoDuplicado = Boolean(destinoEnEdicion && destinosOrdenados.some((destino) => (
    destino.id !== destinoEnEdicion.id && destino.destinoVentaNormalizado === destinoNormalizadoActual
  )));

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Padrones maestros</p>
          <h2>Destinos de venta</h2>
          <p className="hint">Catalogo unico de destinos comerciales. Se usa en precios, gastos y planificacion; las reglas para sugerir destino por zona/campo/actividad se administraran como capa separada.</p>
        </div>
        <div className="status-pill">{destinosOrdenados.length}</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Destinos registrados</h2>
            <p className="hint">El nombre se normaliza para evitar duplicados escritos con mayusculas, tildes o espacios distintos.</p>
          </div>
          <div className="button-row">
            <button className="small" onClick={abrirNuevoDestino} disabled={!puedeConfigurarPlanificacion}>
              Nuevo destino
            </button>
          </div>
        </div>

        <div className="reference-list">
          <div className="master-list-row reference-list-head">
            <span>Destino</span>
            <span>Descripcion</span>
            <span>Estado</span>
            <span>Actualizado</span>
            <span>Acciones</span>
          </div>
          {!destinosOrdenados.length && (
            <div className="empty-state">Todavia no hay destinos registrados.</div>
          )}
          {destinosOrdenados.map((destino) => (
            <div className="master-list-row" key={destino.id}>
              <strong>{destino.destinoVenta}</strong>
              <span>{destino.descripcion || 'Sin descripcion'}</span>
              <span>{destino.activo ? 'Activo' : 'Inactivo'}</span>
              <span>{new Intl.DateTimeFormat('es-AR').format(new Date(destino.updatedAt || destino.createdAt))}</span>
              <button className="small" onClick={() => abrirEditarDestino(destino)} disabled={!puedeConfigurarPlanificacion}>
                Editar
              </button>
            </div>
          ))}
        </div>
      </section>

      {destinoEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="destino-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="destino-modal-title">{modoModal === 'crear' ? 'Nuevo destino' : 'Editar destino'}</h2>
              </div>
              <button className="small" onClick={() => setDestinoEnEdicion(null)}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Destino
                <input
                  value={destinoEnEdicion.destinoVenta}
                  placeholder="Ej. Puerto Quequen"
                  onChange={(event) => actualizarBorrador({ destinoVenta: event.target.value })}
                />
              </label>

              <label className="reference-wide">
                Descripcion
                <input
                  value={destinoEnEdicion.descripcion || ''}
                  placeholder="Detalle visible para administradores"
                  onChange={(event) => actualizarBorrador({ descripcion: event.target.value })}
                />
              </label>

              <label className="reference-check">
                <input
                  type="checkbox"
                  checked={destinoEnEdicion.activo}
                  onChange={(event) => actualizarBorrador({ activo: event.target.checked })}
                />
                Activo
              </label>
            </div>

            {existeDestinoDuplicado && (
              <p className="form-error">Ya existe un destino con ese nombre normalizado.</p>
            )}

            <div className="modal-actions">
              <button className="small" onClick={() => setDestinoEnEdicion(null)}>Cancelar</button>
              <button
                className="primary"
                onClick={aplicarModal}
                disabled={guardandoDestinos || !destinoEnEdicion.destinoVenta.trim() || existeDestinoDuplicado}
              >
                <span className="button-content">
                  {guardandoDestinos && <LoadingSpinner label="Guardando destino" />}
                  {guardandoDestinos ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
