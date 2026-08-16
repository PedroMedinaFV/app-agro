import { useMemo, useState } from 'react';
import { ErpSnapshot, InsumoPlanificacion, PlanificacionSnapshot } from '@agro/tipos';
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

interface InsumosPlanificacionScreenProps {
  planificacion: PlanificacionSnapshot;
  snapshot: ErpSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoInsumos: boolean;
  guardarInsumo: (insumo: InsumoPlanificacion) => Promise<boolean>;
  leerNumero: (valor: string) => number;
  formatearUsd: (valor: number) => string;
}

export function InsumosPlanificacionScreen({
  planificacion,
  snapshot,
  puedeConfigurarPlanificacion,
  guardandoInsumos,
  guardarInsumo,
  leerNumero,
  formatearUsd,
}: InsumosPlanificacionScreenProps) {
  const [insumoEnEdicion, setInsumoEnEdicion] = useState<InsumoPlanificacion | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const insumosOrdenados = useMemo(() => (
    [...(planificacion.insumosPlanificacion || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  ), [planificacion.insumosPlanificacion]);
  const empresasDisponibles = useMemo(() => (
    Array.from(new Set([
      ...planificacion.camposPlanificacion.map((campo) => campo.empresaErpId),
      ...insumosOrdenados.map((insumo) => insumo.empresaErpId),
    ].filter(Boolean))).sort()
  ), [insumosOrdenados, planificacion.camposPlanificacion]);
  const unidadesDisponibles = useMemo(() => (
    [...snapshot.unidadesMedida]
      .filter((unidad) => unidad.activo)
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'))
  ), [snapshot.unidadesMedida]);

  function crearBorradorInsumo(): InsumoPlanificacion {
    const ahora = new Date().toISOString();

    return {
      id: `insumo-planificacion-${Date.now()}`,
      clienteId: planificacion.planificaciones[0]?.clienteId || insumosOrdenados[0]?.clienteId || 'cliente-demo',
      empresaErpId: empresasDisponibles[0] || 'empresa:mock',
      nombre: '',
      codigoInterno: '',
      tipo: '',
      unidad: unidadesDisponibles.find((unidad) => unidad.codigo === 'Lts')?.codigo || unidadesDisponibles[0]?.codigo || 'Unid',
      precioUnitarioEstimado: 0,
      moneda: 'USD',
      estadoVinculacion: 'provisorio',
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  function abrirNuevoInsumo() {
    setModoModal('crear');
    setInsumoEnEdicion(crearBorradorInsumo());
  }

  function abrirEditarInsumo(insumo: InsumoPlanificacion) {
    setModoModal('editar');
    setInsumoEnEdicion({ ...insumo });
  }

  function actualizarBorrador(cambios: Partial<InsumoPlanificacion>) {
    setInsumoEnEdicion((actual) => {
      if (!actual) {
        return actual;
      }

      const siguiente = { ...actual, ...cambios, updatedAt: new Date().toISOString() };

      if (Object.prototype.hasOwnProperty.call(cambios, 'nombre') && !actual.codigoInterno?.trim()) {
        siguiente.codigoInterno = normalizarCodigo(siguiente.nombre);
      }

      if (Object.prototype.hasOwnProperty.call(cambios, 'codigoInterno')) {
        siguiente.codigoInterno = normalizarCodigo(siguiente.codigoInterno || '');
      }

      return siguiente;
    });
  }

  async function aplicarModal() {
    if (!insumoEnEdicion) {
      return;
    }

    const nombre = limpiarTextoVisible(insumoEnEdicion.nombre);
    const insumoPreparado: InsumoPlanificacion = {
      ...insumoEnEdicion,
      nombre,
      codigoInterno: normalizarCodigo(insumoEnEdicion.codigoInterno || nombre),
      tipo: insumoEnEdicion.tipo ? limpiarTextoVisible(insumoEnEdicion.tipo) : undefined,
      unidad: limpiarTextoVisible(insumoEnEdicion.unidad || 'Unid'),
      moneda: limpiarTextoVisible(insumoEnEdicion.moneda || 'USD').toUpperCase(),
      precioUnitarioEstimado: insumoEnEdicion.precioUnitarioEstimado || 0,
      estadoVinculacion: insumoEnEdicion.insumoErpId ? 'vinculado_erp' : insumoEnEdicion.estadoVinculacion,
    };
    const guardado = await guardarInsumo(insumoPreparado);

    if (guardado) {
      setInsumoEnEdicion(null);
    }
  }

  const codigoActual = insumoEnEdicion ? normalizarCodigo(insumoEnEdicion.codigoInterno || insumoEnEdicion.nombre) : '';
  const existeCodigoDuplicado = Boolean(insumoEnEdicion && insumosOrdenados.some((insumo) => (
    insumo.id !== insumoEnEdicion.id && insumo.codigoInterno === codigoActual
  )));

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Padrones maestros</p>
          <h2>Insumos</h2>
          <p className="hint">Catalogo operativo para seleccionar insumos en protocolos. Puede incluir insumos ERP vinculados o provisorios creados en Agro App.</p>
        </div>
        <div className="status-pill">{insumosOrdenados.length}</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Insumos registrados</h2>
            <p className="hint">El precio estimado se copia al protocolo al seleccionar el insumo; cambios posteriores no alteran historicos cerrados.</p>
          </div>
          <div className="button-row">
            <button className="small" onClick={abrirNuevoInsumo} disabled={!puedeConfigurarPlanificacion}>
              Nuevo insumo
            </button>
          </div>
        </div>

        <div className="reference-list">
          <div className="master-list-row reference-list-head">
            <span>Insumo</span>
            <span>Codigo</span>
            <span>Tipo</span>
            <span>Unidad</span>
            <span>Precio</span>
            <span>Acciones</span>
          </div>
          {!insumosOrdenados.length && (
            <div className="empty-state">Todavia no hay insumos registrados.</div>
          )}
          {insumosOrdenados.map((insumo) => (
            <div className="master-list-row" key={insumo.id}>
              <div>
                <strong>{insumo.nombre}</strong>
                <span>{insumo.estadoVinculacion === 'vinculado_erp' ? 'Vinculado ERP' : insumo.estadoVinculacion}</span>
              </div>
              <span>{insumo.codigoInterno || '-'}</span>
              <span>{insumo.tipo || '-'}</span>
              <span>{insumo.unidad}</span>
              <span>{insumo.precioUnitarioEstimado !== undefined ? formatearUsd(insumo.precioUnitarioEstimado) : 'Sin precio'}</span>
              <button className="small" onClick={() => abrirEditarInsumo(insumo)} disabled={!puedeConfigurarPlanificacion}>
                Editar
              </button>
            </div>
          ))}
        </div>
      </section>

      {insumoEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="insumo-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="insumo-modal-title">{modoModal === 'crear' ? 'Nuevo insumo' : 'Editar insumo'}</h2>
              </div>
              <button className="small" onClick={() => setInsumoEnEdicion(null)}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Nombre
                <input
                  value={insumoEnEdicion.nombre}
                  placeholder="Ej. Glifosato 66%"
                  onChange={(event) => actualizarBorrador({ nombre: event.target.value })}
                />
              </label>

              <label>
                Codigo
                <input
                  value={insumoEnEdicion.codigoInterno || ''}
                  placeholder="Ej. GLI66"
                  onChange={(event) => actualizarBorrador({ codigoInterno: event.target.value })}
                />
              </label>

              <label>
                Empresa
                <select value={insumoEnEdicion.empresaErpId} onChange={(event) => actualizarBorrador({ empresaErpId: event.target.value })}>
                  {empresasDisponibles.length === 0 && <option value="empresa:mock">empresa:mock</option>}
                  {empresasDisponibles.map((empresaErpId) => (
                    <option key={empresaErpId} value={empresaErpId}>{empresaErpId}</option>
                  ))}
                </select>
              </label>

              <label>
                Tipo
                <input
                  value={insumoEnEdicion.tipo || ''}
                  placeholder="Ej. Herbicida"
                  onChange={(event) => actualizarBorrador({ tipo: event.target.value })}
                />
              </label>

              <label>
                Unidad
                <select
                  value={insumoEnEdicion.unidad}
                  onChange={(event) => actualizarBorrador({ unidad: event.target.value })}
                >
                  {unidadesDisponibles.length === 0 && <option value={insumoEnEdicion.unidad}>{insumoEnEdicion.unidad}</option>}
                  {unidadesDisponibles.map((unidad) => (
                    <option key={unidad.erpId} value={unidad.codigo}>{unidad.codigo} - {unidad.descripcion}</option>
                  ))}
                </select>
              </label>

              <label>
                Precio estimado
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={insumoEnEdicion.precioUnitarioEstimado || 0}
                  onChange={(event) => actualizarBorrador({ precioUnitarioEstimado: leerNumero(event.target.value) })}
                />
              </label>

              <label>
                Moneda
                <input
                  value={insumoEnEdicion.moneda || 'USD'}
                  placeholder="USD"
                  onChange={(event) => actualizarBorrador({ moneda: event.target.value })}
                />
              </label>

              <label>
                Estado
                <select value={insumoEnEdicion.estadoVinculacion} onChange={(event) => actualizarBorrador({ estadoVinculacion: event.target.value as InsumoPlanificacion['estadoVinculacion'] })}>
                  <option value="provisorio">Provisorio</option>
                  <option value="vinculado_erp">Vinculado ERP</option>
                  <option value="archivado">Archivado</option>
                </select>
              </label>
            </div>

            {insumoEnEdicion.insumoErpId && (
              <p className="hint">Insumo ERP: {insumoEnEdicion.insumoErpId}</p>
            )}
            {existeCodigoDuplicado && (
              <p className="form-error">Ya existe un insumo con ese codigo.</p>
            )}

            <div className="modal-actions">
              <button className="small" onClick={() => setInsumoEnEdicion(null)}>Cancelar</button>
              <button
                className="primary"
                onClick={aplicarModal}
                disabled={guardandoInsumos || !insumoEnEdicion.nombre.trim() || !insumoEnEdicion.unidad.trim() || !insumoEnEdicion.empresaErpId.trim() || existeCodigoDuplicado}
              >
                <span className="button-content">
                  {guardandoInsumos && <LoadingSpinner label="Guardando insumo" />}
                  {guardandoInsumos ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
