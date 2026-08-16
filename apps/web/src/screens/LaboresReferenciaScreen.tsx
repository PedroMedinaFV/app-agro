import { useMemo, useState } from 'react';
import { ErpSnapshot, LaborReferencia, PlanificacionSnapshot } from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarCodigo(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

interface LaboresReferenciaScreenProps {
  planificacion: PlanificacionSnapshot;
  snapshot: ErpSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoLabores: boolean;
  guardarLabor: (labor: LaborReferencia) => Promise<boolean>;
  leerNumero: (valor: string) => number;
  formatearUsd: (valor: number) => string;
}

export function LaboresReferenciaScreen({
  planificacion,
  snapshot,
  puedeConfigurarPlanificacion,
  guardandoLabores,
  guardarLabor,
  leerNumero,
  formatearUsd,
}: LaboresReferenciaScreenProps) {
  const [laborEnEdicion, setLaborEnEdicion] = useState<LaborReferencia | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const laboresOrdenadas = useMemo(() => (
    [...planificacion.laboresReferencia].sort((a, b) => a.nombre.localeCompare(b.nombre))
  ), [planificacion.laboresReferencia]);
  const unidadesDisponibles = useMemo(() => (
    [...snapshot.unidadesMedida]
      .filter((unidad) => unidad.activo)
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'))
  ), [snapshot.unidadesMedida]);

  function crearBorradorLabor(): LaborReferencia {
    const ahora = new Date().toISOString();

    return {
      id: `labor-ref-${Date.now()}`,
      clienteId: planificacion.planificaciones[0]?.clienteId || planificacion.laboresReferencia[0]?.clienteId || 'cliente-demo',
      codigo: '',
      nombre: '',
      unidadSugerida: unidadesDisponibles.find((unidad) => unidad.codigo === 'Ha')?.codigo || unidadesDisponibles[0]?.codigo || 'Ha',
      costoUnitarioSugerido: 0,
      estadoVinculacion: 'provisorio',
      activo: true,
      origen: 'provisorio',
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  function abrirNuevaLabor() {
    setModoModal('crear');
    setLaborEnEdicion(crearBorradorLabor());
  }

  function abrirEditarLabor(labor: LaborReferencia) {
    setModoModal('editar');
    setLaborEnEdicion({ ...labor });
  }

  function actualizarBorrador(cambios: Partial<LaborReferencia>) {
    setLaborEnEdicion((actual) => {
      if (!actual) {
        return actual;
      }

      const siguiente = { ...actual, ...cambios, updatedAt: new Date().toISOString() };

      if (Object.prototype.hasOwnProperty.call(cambios, 'nombre') && !actual.codigo.trim()) {
        siguiente.codigo = normalizarCodigo(siguiente.nombre);
      }

      if (Object.prototype.hasOwnProperty.call(cambios, 'codigo')) {
        siguiente.codigo = normalizarCodigo(siguiente.codigo);
      }

      return siguiente;
    });
  }

  async function aplicarModal() {
    if (!laborEnEdicion) {
      return;
    }

    const nombre = limpiarTextoVisible(laborEnEdicion.nombre);
    const laborPreparada: LaborReferencia = {
      ...laborEnEdicion,
      codigo: normalizarCodigo(laborEnEdicion.codigo || nombre),
      nombre,
      descripcionAbreviada: laborEnEdicion.descripcionAbreviada ? limpiarTextoVisible(laborEnEdicion.descripcionAbreviada) : undefined,
      unidadSugerida: limpiarTextoVisible(laborEnEdicion.unidadSugerida || 'Ha'),
      costoUnitarioSugerido: laborEnEdicion.costoUnitarioSugerido || 0,
      estadoVinculacion: laborEnEdicion.servicioErpId ? 'vinculado_erp' : laborEnEdicion.estadoVinculacion,
      origen: laborEnEdicion.servicioErpId ? 'erp' : laborEnEdicion.origen,
    };
    const guardado = await guardarLabor(laborPreparada);

    if (guardado) {
      setLaborEnEdicion(null);
    }
  }

  const codigoActual = laborEnEdicion ? normalizarCodigo(laborEnEdicion.codigo || laborEnEdicion.nombre) : '';
  const existeCodigoDuplicado = Boolean(laborEnEdicion && laboresOrdenadas.some((labor) => (
    labor.id !== laborEnEdicion.id && labor.codigo === codigoActual
  )));

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Padrones maestros</p>
          <h2>Labores</h2>
          <p className="hint">Catalogo propio para seleccionar trabajos en protocolos. Puede crearse una labor provisoria y vincularse luego con `Padrones/Servicios` del ERP.</p>
        </div>
        <div className="status-pill">{laboresOrdenadas.length}</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Labores registradas</h2>
            <p className="hint">El costo sugerido se copia al protocolo al seleccionar la labor; cambios posteriores no alteran historicos cerrados.</p>
          </div>
          <div className="button-row">
            <button className="small" onClick={abrirNuevaLabor} disabled={!puedeConfigurarPlanificacion}>
              Nueva labor
            </button>
          </div>
        </div>

        <div className="reference-list">
          <div className="master-list-row reference-list-head">
            <span>Labor</span>
            <span>Codigo</span>
            <span>Unidad</span>
            <span>Costo</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {!laboresOrdenadas.length && (
            <div className="empty-state">Todavia no hay labores registradas.</div>
          )}
          {laboresOrdenadas.map((labor) => (
            <div className="master-list-row" key={labor.id}>
              <strong>{labor.nombre}</strong>
              <span>{labor.codigo}</span>
              <span>{labor.unidadSugerida}</span>
              <span>{labor.costoUnitarioSugerido !== undefined ? formatearUsd(labor.costoUnitarioSugerido) : 'Sin costo'}</span>
              <span>{labor.estadoVinculacion === 'vinculado_erp' ? 'Vinculada ERP' : labor.origen}</span>
              <button className="small" onClick={() => abrirEditarLabor(labor)} disabled={!puedeConfigurarPlanificacion}>
                Editar
              </button>
            </div>
          ))}
        </div>
      </section>

      {laborEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="labor-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="labor-modal-title">{modoModal === 'crear' ? 'Nueva labor' : 'Editar labor'}</h2>
              </div>
              <button className="small" onClick={() => setLaborEnEdicion(null)}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Nombre
                <input
                  value={laborEnEdicion.nombre}
                  placeholder="Ej. Pulverizacion terrestre"
                  onChange={(event) => actualizarBorrador({ nombre: event.target.value })}
                />
              </label>

              <label>
                Codigo
                <input
                  value={laborEnEdicion.codigo}
                  placeholder="Ej. PULT"
                  onChange={(event) => actualizarBorrador({ codigo: event.target.value })}
                />
              </label>

              <label>
                Unidad
                <select
                  value={laborEnEdicion.unidadSugerida}
                  onChange={(event) => actualizarBorrador({ unidadSugerida: event.target.value })}
                >
                  {unidadesDisponibles.length === 0 && <option value={laborEnEdicion.unidadSugerida}>{laborEnEdicion.unidadSugerida}</option>}
                  {unidadesDisponibles.map((unidad) => (
                    <option key={unidad.erpId} value={unidad.codigo}>{unidad.codigo} - {unidad.descripcion}</option>
                  ))}
                </select>
              </label>

              <label>
                Costo sugerido
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborEnEdicion.costoUnitarioSugerido || 0}
                  onChange={(event) => actualizarBorrador({ costoUnitarioSugerido: leerNumero(event.target.value) })}
                />
              </label>

              <label className="reference-wide">
                Descripcion abreviada
                <input
                  value={laborEnEdicion.descripcionAbreviada || ''}
                  placeholder="Descripcion visible para administradores"
                  onChange={(event) => actualizarBorrador({ descripcionAbreviada: event.target.value })}
                />
              </label>

              <label>
                Origen
                <select value={laborEnEdicion.origen} onChange={(event) => actualizarBorrador({ origen: event.target.value as LaborReferencia['origen'] })}>
                  <option value="provisorio">Provisorio</option>
                  <option value="semilla">Semilla</option>
                  <option value="erp">ERP</option>
                </select>
              </label>

              <label>
                Estado
                <select value={laborEnEdicion.estadoVinculacion} onChange={(event) => actualizarBorrador({ estadoVinculacion: event.target.value as LaborReferencia['estadoVinculacion'] })}>
                  <option value="provisorio">Provisorio</option>
                  <option value="vinculado_erp">Vinculado ERP</option>
                  <option value="archivado">Archivado</option>
                </select>
              </label>

              <label className="reference-check">
                <input
                  type="checkbox"
                  checked={laborEnEdicion.activo}
                  onChange={(event) => actualizarBorrador({ activo: event.target.checked })}
                />
                Activo
              </label>
            </div>

            {laborEnEdicion.servicioErpId && (
              <p className="hint">Servicio ERP: {laborEnEdicion.servicioErpId}</p>
            )}
            {existeCodigoDuplicado && (
              <p className="form-error">Ya existe una labor con ese codigo.</p>
            )}

            <div className="modal-actions">
              <button className="small" onClick={() => setLaborEnEdicion(null)}>Cancelar</button>
              <button
                className="primary"
                onClick={aplicarModal}
                disabled={guardandoLabores || !laborEnEdicion.nombre.trim() || !laborEnEdicion.unidadSugerida.trim() || existeCodigoDuplicado}
              >
                <span className="button-content">
                  {guardandoLabores && <LoadingSpinner label="Guardando labor" />}
                  {guardandoLabores ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
