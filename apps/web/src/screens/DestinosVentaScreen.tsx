import { useEffect, useMemo, useState } from 'react';
import { DestinoApp, PlanificacionSnapshot, SesionUsuario } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { obtenerDestinosVenta } from '../services/api';

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
  sesion: SesionUsuario;
  planificacion: PlanificacionSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoDestinos: boolean;
  guardarDestino: (destino: DestinoApp) => Promise<boolean>;
}

export function DestinosVentaScreen({
  sesion,
  planificacion,
  puedeConfigurarPlanificacion,
  guardandoDestinos,
  guardarDestino,
}: DestinosVentaScreenProps) {
  const [destinosDb, setDestinosDb] = useState<DestinoApp[]>([]);
  const [destinoEnEdicion, setDestinoEnEdicion] = useState<DestinoApp | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const destinosBase = destinosDb.length ? destinosDb : planificacion.destinosReferencia;
  const destinosOrdenados = useMemo(() => (
    [...destinosBase].sort((a, b) => a.destinoVenta.localeCompare(b.destinoVenta))
  ), [destinosBase]);

  async function cargarDestinosDb() {
    const respuesta = await obtenerDestinosVenta(sesion.token);
    setDestinosDb(respuesta.destinos);
  }

  useEffect(() => {
    cargarDestinosDb().catch(() => undefined);
  }, [sesion.token]);

  function crearBorradorDestino(): DestinoApp {
    const ahora = new Date().toISOString();

    return {
      id: `destino-venta-${Date.now()}`,
      clienteId: planificacion.planificaciones[0]?.clienteId || planificacion.destinosReferencia[0]?.clienteId || 'cliente-demo',
      destinoVenta: '',
      destinoVentaNormalizado: '',
      descripcion: '',
      activo: true,
      origen: 'app',
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  function abrirNuevoDestino() {
    setModoModal('crear');
    setDestinoEnEdicion(crearBorradorDestino());
  }

  function esDestinoEditable(destino: DestinoApp) {
    return destino.origen === 'app' && !destino.id.startsWith('puerto-');
  }

  function abrirEditarDestino(destino: DestinoApp) {
    if (!esDestinoEditable(destino)) {
      return;
    }

    setModoModal('editar');
    setDestinoEnEdicion({ ...destino });
  }

  function actualizarBorrador(cambios: Partial<DestinoApp>) {
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
    const destinoPreparado: DestinoApp = {
      ...destinoEnEdicion,
      destinoVenta,
      destinoVentaNormalizado: normalizarTexto(destinoVenta),
      descripcion: destinoEnEdicion.descripcion ? limpiarTextoVisible(destinoEnEdicion.descripcion) : undefined,
    };
    const guardado = await guardarDestino(destinoPreparado);

    if (guardado) {
      await cargarDestinosDb().catch(() => undefined);
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

        <DataTable
          rows={destinosOrdenados}
          getRowKey={(destino) => destino.id}
          emptyMessage="Todavia no hay destinos registrados."
          columns={[
            { key: 'destino', label: 'Destino', width: 'minmax(170px, 1.2fr)', render: (destino) => <strong>{destino.destinoVenta}</strong> },
            { key: 'descripcion', label: 'Descripcion', width: 'minmax(190px, 1.4fr)', render: (destino) => destino.descripcion || 'Sin descripcion' },
            { key: 'origen', label: 'Origen', width: 'minmax(80px, 0.45fr)', render: (destino) => <em>{destino.origen === 'erp' ? 'ERP' : 'App'}</em> },
            { key: 'estado', label: 'Estado', width: 'minmax(86px, 0.55fr)', render: (destino) => <em>{destino.activo ? 'Activo' : 'Inactivo'}</em> },
            { key: 'actualizado', label: 'Actualizado', width: 'minmax(110px, 0.7fr)', render: (destino) => new Intl.DateTimeFormat('es-AR').format(new Date(destino.updatedAt || destino.createdAt)) },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(86px, 0.5fr)',
              render: (destino) => (
                <button
                  className="small"
                  onClick={() => abrirEditarDestino(destino)}
                  disabled={!puedeConfigurarPlanificacion || !esDestinoEditable(destino)}
                  title={esDestinoEditable(destino) ? 'Editar destino' : 'Destino importado desde ERP'}
                >
                  Editar
                </button>
              ),
            },
          ]}
        />
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
