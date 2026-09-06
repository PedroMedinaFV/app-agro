import { useEffect, useMemo, useState } from 'react';
import { ErpServicio, ErpSnapshot, LaborReferencia, PlanificacionSnapshot, SesionUsuario } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { obtenerServiciosErpImportados } from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

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
  sesion: SesionUsuario;
  planificacion: PlanificacionSnapshot;
  snapshot: ErpSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoLabores: boolean;
  guardarLabor: (labor: LaborReferencia) => Promise<boolean>;
  leerNumero: (valor: string) => number;
  formatearUsd: (valor: number) => string;
  notificar?: Notificar;
}

type LaborTabla = {
  id: string;
  nombre: string;
  detalle: string;
  codigo: string;
  unidad: string;
  costo: string;
  estado: string;
  accion: 'editar' | 'importada';
  laborPropia?: LaborReferencia;
};

export function LaboresReferenciaScreen({
  sesion,
  planificacion,
  snapshot,
  puedeConfigurarPlanificacion,
  guardandoLabores,
  guardarLabor,
  leerNumero,
  formatearUsd,
  notificar,
}: LaboresReferenciaScreenProps) {
  const [laborEnEdicion, setLaborEnEdicion] = useState<LaborReferencia | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [serviciosErp, setServiciosErp] = useState<ErpServicio[]>([]);
  const [estadoCargaErp, setEstadoCargaErp] = useState('Cargando servicios ERP.');
  const [laborPropiaParaVincular, setLaborPropiaParaVincular] = useState<LaborReferencia | null>(null);
  const [servicioErpVincularId, setServicioErpVincularId] = useState('');
  const laboresOrdenadas = useMemo(() => (
    [...planificacion.laboresReferencia].sort((a, b) => a.nombre.localeCompare(b.nombre))
  ), [planificacion.laboresReferencia]);
  const unidadesDisponibles = useMemo(() => (
    [...snapshot.unidadesMedida]
      .filter((unidad) => unidad.activo)
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'))
  ), [snapshot.unidadesMedida]);

  useEffect(() => {
    async function cargarServiciosErp() {
      try {
        const respuesta = await obtenerServiciosErpImportados(sesion.token);

        setServiciosErp(respuesta.servicios);
        setEstadoCargaErp('Servicios ERP cargados desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los servicios ERP.';
        setEstadoCargaErp(mensaje);
      }
    }

    cargarServiciosErp();
  }, [sesion.token]);

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
  const serviciosVinculados = useMemo(
    () => new Set(laboresOrdenadas.map((labor) => labor.servicioErpId).filter((id): id is string => Boolean(id))),
    [laboresOrdenadas],
  );
  const serviciosErpDisponiblesParaVincular = useMemo(() => serviciosErp
    .filter((servicio) => !serviciosVinculados.has(servicio.erpId))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es')), [serviciosErp, serviciosVinculados]);
  const filasLabor: LaborTabla[] = [
    ...laboresOrdenadas.filter((labor) => !labor.servicioErpId).map((labor) => ({
      id: labor.id,
      nombre: labor.nombre,
      detalle: labor.estadoVinculacion === 'vinculado_erp' ? 'Vinculada ERP' : labor.origen,
      codigo: labor.codigo,
      unidad: labor.unidadSugerida,
      costo: labor.costoUnitarioSugerido !== undefined ? formatearUsd(labor.costoUnitarioSugerido) : 'Sin costo',
      estado: labor.estadoVinculacion === 'vinculado_erp' ? 'Vinculada ERP' : labor.origen,
      accion: 'editar' as const,
      laborPropia: labor,
    })),
    ...serviciosErp.map((servicio) => {
      const unidad = snapshot.unidadesMedida.find((item) => item.idUnidadMedida === servicio.idUnidadMedida);

      return {
        id: servicio.erpId,
        nombre: servicio.descripcion,
        detalle: `${serviciosVinculados.has(servicio.erpId) ? 'Vinculada' : 'Disponible'} ERP`,
        codigo: servicio.codigo,
        unidad: unidad?.codigo || String(servicio.idUnidadMedida || '-'),
        costo: servicio.precioUnitario !== undefined ? formatearUsd(servicio.precioUnitario) : 'Sin costo',
        estado: servicio.imputaDosis ? 'Imputa dosis' : 'No imputa dosis',
        accion: 'importada' as const,
      };
    }),
  ];

  function abrirVinculacion(labor: LaborReferencia) {
    if (labor.estadoVinculacion !== 'provisorio' || labor.servicioErpId) {
      notificar?.({ tipo: 'info', titulo: 'Labor no vinculable', mensaje: 'Solo se pueden vincular labores propias en estado provisorio.' });
      return;
    }

    if (!serviciosErpDisponiblesParaVincular.length) {
      notificar?.({ tipo: 'info', titulo: 'No hay servicio ERP disponible', mensaje: 'Todos los servicios ERP ya estan vinculados o no hay servicios importados.' });
      return;
    }

    setLaborPropiaParaVincular(labor);
    setServicioErpVincularId(serviciosErpDisponiblesParaVincular[0].erpId);
  }

  async function confirmarVinculacionLabor() {
    if (!laborPropiaParaVincular || !servicioErpVincularId) {
      return;
    }

    const servicioErp = serviciosErp.find((servicio) => servicio.erpId === servicioErpVincularId);
    const unidad = snapshot.unidadesMedida.find((item) => item.idUnidadMedida === servicioErp?.idUnidadMedida);

    if (!servicioErp) {
      notificar?.({ tipo: 'error', titulo: 'No se encontro el servicio ERP', mensaje: 'Actualiza la pantalla e intenta nuevamente.' });
      return;
    }

    const guardado = await guardarLabor({
      ...laborPropiaParaVincular,
      empresaErpId: 'global',
      servicioErpId: servicioErp.erpId,
      idServicio: servicioErp.idServicio,
      idTipoServicio: servicioErp.idTipoServicio,
      codigo: normalizarCodigo(servicioErp.codigo || servicioErp.descripcion),
      nombre: limpiarTextoVisible(servicioErp.descripcion),
      descripcionAbreviada: servicioErp.descripcionAbreviada,
      idUnidadMedida: servicioErp.idUnidadMedida,
      idMoneda: servicioErp.idMoneda,
      unidadSugerida: unidad?.codigo || laborPropiaParaVincular.unidadSugerida,
      costoUnitarioSugerido: servicioErp.precioUnitario ?? laborPropiaParaVincular.costoUnitarioSugerido,
      imputaDosis: servicioErp.imputaDosis,
      estadoVinculacion: 'vinculado_erp',
      activo: servicioErp.activo,
      origen: 'erp',
      fechaUltimaActualizacionErp: servicioErp.actualizadoEn,
      updatedAt: new Date().toISOString(),
    });

    if (guardado) {
      setLaborPropiaParaVincular(null);
      setServicioErpVincularId('');
      notificar?.({ tipo: 'success', titulo: 'Labor vinculada', mensaje: 'La vinculacion quedo guardada con auditoria.' });
    }
  }

  return (
    <section className="planning-stack">
      <section className="metrics">
        <article><span>ERP sincronizadas</span><strong>{serviciosErp.length}</strong></article>
        <article><span>Propias Agro App</span><strong>{laboresOrdenadas.length}</strong></article>
        <article><span>Provisorias</span><strong>{laboresOrdenadas.filter((labor) => labor.estadoVinculacion === 'provisorio').length}</strong></article>
        <article><span>Vinculadas</span><strong>{laboresOrdenadas.filter((labor) => labor.estadoVinculacion === 'vinculado_erp').length}</strong></article>
      </section>

      <section className="planning-hero">
        <div>
          <p className="eyebrow">Padrones maestros</p>
          <h2>Labores</h2>
          <p className="hint">Catalogo propio para seleccionar trabajos en protocolos. {estadoCargaErp}</p>
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

        <DataTable
          rows={filasLabor}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay labores registradas."
          initialPageSize={25}
          columns={[
            { key: 'labor', label: 'Labor', width: 'minmax(190px, 1.4fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'codigo', label: 'Codigo', width: 'minmax(92px, 0.65fr)', render: (fila) => fila.codigo },
            { key: 'unidad', label: 'Unidad', width: 'minmax(76px, 0.5fr)', render: (fila) => fila.unidad },
            { key: 'costo', label: 'Costo', width: 'minmax(96px, 0.65fr)', render: (fila) => fila.costo },
            { key: 'estado', label: 'Estado', width: 'minmax(116px, 0.8fr)', render: (fila) => <em>{fila.estado}</em> },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(150px, 0.7fr)',
              render: (fila) => fila.accion === 'editar'
                ? (
                  <div className="button-row table-actions">
                    <button className="small" onClick={() => fila.laborPropia && abrirEditarLabor(fila.laborPropia)} disabled={!puedeConfigurarPlanificacion}>Editar</button>
                    {fila.laborPropia?.estadoVinculacion === 'provisorio' && !fila.laborPropia.servicioErpId && (
                      <button className="small" type="button" onClick={() => fila.laborPropia && abrirVinculacion(fila.laborPropia)} disabled={!puedeConfigurarPlanificacion}>Vincular</button>
                    )}
                  </div>
                )
                : <span className="hint">Importada</span>,
            },
          ]}
        />
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

      {laborPropiaParaVincular && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vincular-labor-title">
            <div className="modal-header">
              <div>
                <h2 id="vincular-labor-title">Vincular labor provisoria</h2>
                <p className="hint">La labor propia copiara datos base del servicio ALBOR y dejara de mostrarse como fila independiente.</p>
              </div>
              <button className="ghost" type="button" onClick={() => { setLaborPropiaParaVincular(null); setServicioErpVincularId(''); }}>Cerrar</button>
            </div>
            <div className="reference-modal-grid">
              <div className="reference-total">
                <span>Labor provisoria</span>
                <strong>{laborPropiaParaVincular.nombre}</strong>
                <span>{laborPropiaParaVincular.codigo || 'Sin codigo'}</span>
              </div>
              <label className="reference-wide">
                Servicio ERP disponible
                <select value={servicioErpVincularId} onChange={(event) => setServicioErpVincularId(event.target.value)}>
                  {serviciosErpDisponiblesParaVincular.map((servicio) => (
                    <option key={servicio.erpId} value={servicio.erpId}>{servicio.codigo} - {servicio.descripcion}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <span className="hint">El backend valida que el servicio ERP exista y no este vinculado a otra labor del cliente.</span>
              <button className="primary" type="button" disabled={guardandoLabores || !servicioErpVincularId} onClick={confirmarVinculacionLabor}>
                <span className="button-content">{guardandoLabores && <span className="loading-spinner" />}Vincular</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
