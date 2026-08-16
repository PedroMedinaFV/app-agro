import { useMemo, useState } from 'react';
import { ConceptoGastoComercial, PlanificacionSnapshot } from '@agro/tipos';
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

interface ConceptosGastosComercialesScreenProps {
  planificacion: PlanificacionSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoConceptos: boolean;
  guardarConcepto: (concepto: ConceptoGastoComercial) => Promise<boolean>;
}

export function ConceptosGastosComercialesScreen({
  planificacion,
  puedeConfigurarPlanificacion,
  guardandoConceptos,
  guardarConcepto,
}: ConceptosGastosComercialesScreenProps) {
  const [conceptoEnEdicion, setConceptoEnEdicion] = useState<ConceptoGastoComercial | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const conceptosOrdenados = useMemo(() => (
    [...planificacion.conceptosGastosComerciales].sort((a, b) => a.nombre.localeCompare(b.nombre))
  ), [planificacion.conceptosGastosComerciales]);

  function crearBorradorConcepto(): ConceptoGastoComercial {
    const ahora = new Date().toISOString();

    return {
      id: `concepto-gasto-${Date.now()}`,
      clienteId: planificacion.planificaciones[0]?.clienteId || planificacion.conceptosGastosComerciales[0]?.clienteId || 'cliente-demo',
      codigo: '',
      nombre: '',
      nombreNormalizado: '',
      descripcion: '',
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  function abrirNuevoConcepto() {
    setModoModal('crear');
    setConceptoEnEdicion(crearBorradorConcepto());
  }

  function abrirEditarConcepto(concepto: ConceptoGastoComercial) {
    setModoModal('editar');
    setConceptoEnEdicion({ ...concepto });
  }

  function actualizarBorrador(cambios: Partial<ConceptoGastoComercial>) {
    setConceptoEnEdicion((actual) => {
      if (!actual) {
        return actual;
      }

      const siguiente = { ...actual, ...cambios, updatedAt: new Date().toISOString() };

      if (Object.prototype.hasOwnProperty.call(cambios, 'nombre')) {
        siguiente.nombreNormalizado = normalizarTexto(siguiente.nombre);
        if (!actual.codigo.trim()) {
          siguiente.codigo = normalizarTexto(siguiente.nombre);
        }
      }

      if (Object.prototype.hasOwnProperty.call(cambios, 'codigo')) {
        siguiente.codigo = normalizarTexto(siguiente.codigo);
      }

      return siguiente;
    });
  }

  async function aplicarModal() {
    if (!conceptoEnEdicion) {
      return;
    }

    const nombre = limpiarTextoVisible(conceptoEnEdicion.nombre);
    const conceptoPreparado: ConceptoGastoComercial = {
      ...conceptoEnEdicion,
      codigo: normalizarTexto(conceptoEnEdicion.codigo || nombre),
      nombre,
      nombreNormalizado: normalizarTexto(nombre),
      descripcion: conceptoEnEdicion.descripcion ? limpiarTextoVisible(conceptoEnEdicion.descripcion) : undefined,
    };
    const guardado = await guardarConcepto(conceptoPreparado);

    if (guardado) {
      setConceptoEnEdicion(null);
    }
  }

  const nombreNormalizadoActual = conceptoEnEdicion ? normalizarTexto(conceptoEnEdicion.nombre) : '';
  const existeNombreDuplicado = Boolean(conceptoEnEdicion && conceptosOrdenados.some((concepto) => (
    concepto.id !== conceptoEnEdicion.id && concepto.nombreNormalizado === nombreNormalizadoActual
  )));

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Padrones maestros</p>
          <h2>Conceptos de gastos comerciales</h2>
          <p className="hint">Listado controlado para flete, acondicionamiento, comisiones y otros gastos. Se usa en gastos comerciales para evitar texto libre y mantener reportes consistentes.</p>
        </div>
        <div className="status-pill">{conceptosOrdenados.length}</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Conceptos registrados</h2>
            <p className="hint">Cada alta o modificacion debe quedar auditada desde backend. Desactivar conserva el historico sin permitir nuevos usos normales.</p>
          </div>
          <div className="button-row">
            <button className="small" onClick={abrirNuevoConcepto} disabled={!puedeConfigurarPlanificacion}>
              Nuevo concepto
            </button>
          </div>
        </div>

        <div className="reference-list">
          <div className="master-list-row reference-list-head">
            <span>Nombre</span>
            <span>Codigo</span>
            <span>Descripcion</span>
            <span>Estado</span>
            <span>Actualizado</span>
            <span>Acciones</span>
          </div>
          {!conceptosOrdenados.length && (
            <div className="empty-state">Todavia no hay conceptos registrados.</div>
          )}
          {conceptosOrdenados.map((concepto) => (
            <div className="master-list-row" key={concepto.id}>
              <strong>{concepto.nombre}</strong>
              <span>{concepto.codigo}</span>
              <span>{concepto.descripcion || 'Sin descripcion'}</span>
              <span>{concepto.activo ? 'Activo' : 'Inactivo'}</span>
              <span>{new Intl.DateTimeFormat('es-AR').format(new Date(concepto.updatedAt || concepto.createdAt))}</span>
              <button className="small" onClick={() => abrirEditarConcepto(concepto)} disabled={!puedeConfigurarPlanificacion}>
                Editar
              </button>
            </div>
          ))}
        </div>
      </section>

      {conceptoEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="concepto-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="concepto-modal-title">{modoModal === 'crear' ? 'Nuevo concepto' : 'Editar concepto'}</h2>
              </div>
              <button className="small" onClick={() => setConceptoEnEdicion(null)}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Nombre
                <input
                  value={conceptoEnEdicion.nombre}
                  placeholder="Ej. Flete"
                  onChange={(event) => actualizarBorrador({ nombre: event.target.value })}
                />
              </label>

              <label>
                Codigo
                <input
                  value={conceptoEnEdicion.codigo}
                  placeholder="Ej. FLETE"
                  onChange={(event) => actualizarBorrador({ codigo: event.target.value })}
                />
              </label>

              <label className="reference-wide">
                Descripcion
                <input
                  value={conceptoEnEdicion.descripcion || ''}
                  placeholder="Detalle visible para administradores"
                  onChange={(event) => actualizarBorrador({ descripcion: event.target.value })}
                />
              </label>

              <label className="reference-check">
                <input
                  type="checkbox"
                  checked={conceptoEnEdicion.activo}
                  onChange={(event) => actualizarBorrador({ activo: event.target.checked })}
                />
                Activo
              </label>
            </div>

            {existeNombreDuplicado && (
              <p className="form-error">Ya existe un concepto con ese nombre normalizado.</p>
            )}

            <div className="modal-actions">
              <button className="small" onClick={() => setConceptoEnEdicion(null)}>Cancelar</button>
              <button
                className="primary"
                onClick={aplicarModal}
                disabled={guardandoConceptos || !conceptoEnEdicion.nombre.trim() || existeNombreDuplicado}
              >
                <span className="button-content">
                  {guardandoConceptos && <LoadingSpinner label="Guardando concepto" />}
                  {guardandoConceptos ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
