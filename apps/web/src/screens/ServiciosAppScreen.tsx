import { useEffect, useMemo, useState } from 'react';
import { ErpMoneda, ErpServicio, ErpSnapshot, ServicioApp, PlanificacionSnapshot, SesionUsuario } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OriginBadge } from '../components/OriginBadge';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { obtenerMonedasErpImportadas, obtenerServiciosErpImportados } from '../services/api';
import { formatearMoneda } from '../utils/formatters';
import { sugerirVinculacion } from '../utils/vinculacionSugerida';

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

interface ServiciosAppScreenProps {
  sesion: SesionUsuario;
  planificacion: PlanificacionSnapshot;
  snapshot: ErpSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoLabores: boolean;
  guardarServicio: (servicio: ServicioApp) => Promise<boolean>;
  leerNumero: (valor: string) => number;
  notificar?: Notificar;
}

type LaborTabla = {
  id: string;
  nombre: string;
  detalle: string;
  codigo: string;
  unidad: string;
  costo: string;
  origen: string;
  estado: string;
  accion: 'editar';
  laborPropia?: ServicioApp;
  servicioErp?: ErpServicio;
};

function crearIdLaborDesdeErp(servicio: ErpServicio) {
  return `labor-ref-erp-${servicio.erpId.replace(/[^a-zA-Z0-9]+/g, '-')}`;
}

export function ServiciosAppScreen({
  sesion,
  planificacion,
  snapshot,
  puedeConfigurarPlanificacion,
  guardandoLabores,
  guardarServicio,
  leerNumero,
  notificar,
}: ServiciosAppScreenProps) {
  const [laborEnEdicion, setLaborEnEdicion] = useState<ServicioApp | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [serviciosErp, setServiciosErp] = useState<ErpServicio[]>([]);
  const [monedasErp, setMonedasErp] = useState<ErpMoneda[]>(snapshot.monedas || []);
  const [estadoCargaErp, setEstadoCargaErp] = useState('Cargando servicios ERP.');
  const [laborPropiaParaVincular, setLaborPropiaParaVincular] = useState<ServicioApp | null>(null);
  const [servicioErpVincularId, setServicioErpVincularId] = useState('');
  const laboresOrdenadas = useMemo(() => (
    [...planificacion.serviciosApp].sort((a, b) => a.nombre.localeCompare(b.nombre))
  ), [planificacion.serviciosApp]);
  const unidadesDisponibles = useMemo(() => (
    [...snapshot.unidadesMedida]
      .filter((unidad) => unidad.activo)
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'))
  ), [snapshot.unidadesMedida]);
  const monedasDisponibles = useMemo(() => (
    [...((snapshot.monedas || []).length ? snapshot.monedas : monedasErp)]
      .filter((moneda) => moneda.activo)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es'))
  ), [monedasErp, snapshot.monedas]);
  const monedaPorId = useMemo(() => (
    new Map(monedasDisponibles.map((moneda) => [moneda.idMoneda, moneda]))
  ), [monedasDisponibles]);
  const monedaPorDefecto = monedasDisponibles.find((moneda) => moneda.codigo.toUpperCase() === 'USD')
    || monedasDisponibles[0];

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

  useEffect(() => {
    if ((snapshot.monedas || []).length) {
      setMonedasErp(snapshot.monedas);
      return;
    }

    async function cargarMonedasErp() {
      try {
        const respuesta = await obtenerMonedasErpImportadas(sesion.token);
        setMonedasErp(respuesta.monedas);
      } catch {
        setMonedasErp([]);
      }
    }

    cargarMonedasErp();
  }, [sesion.token, snapshot.monedas]);

  function crearBorradorLabor(): ServicioApp {
    const ahora = new Date().toISOString();

    return {
      id: `labor-ref-${Date.now()}`,
      clienteId: planificacion.planificaciones[0]?.clienteId || planificacion.serviciosApp[0]?.clienteId || 'cliente-demo',
      codigo: '',
      nombre: '',
      idMoneda: monedaPorDefecto?.idMoneda,
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

  function abrirEditarLabor(labor: ServicioApp) {
    setModoModal('editar');
    setLaborEnEdicion({ ...labor });
  }

  function actualizarBorrador(cambios: Partial<ServicioApp>) {
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
    const laborPreparada: ServicioApp = {
      ...laborEnEdicion,
      codigo: normalizarCodigo(laborEnEdicion.codigo || nombre),
      nombre,
      descripcionAbreviada: laborEnEdicion.descripcionAbreviada ? limpiarTextoVisible(laborEnEdicion.descripcionAbreviada) : undefined,
      unidadSugerida: limpiarTextoVisible(laborEnEdicion.unidadSugerida || 'Ha'),
      costoUnitarioSugerido: laborEnEdicion.costoUnitarioSugerido || 0,
      estadoVinculacion: laborEnEdicion.servicioErpId ? 'vinculado_erp' : laborEnEdicion.estadoVinculacion,
      origen: laborEnEdicion.servicioErpId ? 'erp' : laborEnEdicion.origen,
    };
    const guardado = await guardarServicio(laborPreparada);

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
  const laboresPorServicioErpId = useMemo(() => (
    new Map(laboresOrdenadas.filter((labor) => labor.servicioErpId).map((labor) => [labor.servicioErpId, labor]))
  ), [laboresOrdenadas]);
  const serviciosErpDisponiblesParaVincular = useMemo(() => serviciosErp
    .filter((servicio) => !serviciosVinculados.has(servicio.erpId))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es')), [serviciosErp, serviciosVinculados]);
  const serviciosErpSugeridosParaVincular = useMemo(() => (
    laborPropiaParaVincular
      ? sugerirVinculacion(
        { codigo: laborPropiaParaVincular.codigo, nombre: laborPropiaParaVincular.nombre },
        serviciosErpDisponiblesParaVincular,
        (registro) => registro.codigo,
        (registro) => registro.descripcion,
      )
      : []
  ), [laborPropiaParaVincular, serviciosErpDisponiblesParaVincular]);
  const filasLabor: LaborTabla[] = [
    ...laboresOrdenadas.filter((labor) => !labor.servicioErpId).map((labor) => ({
      id: labor.id,
      nombre: labor.nombre,
      detalle: labor.estadoVinculacion === 'vinculado_erp' ? 'Vinculada ERP' : labor.origen,
      codigo: labor.codigo,
      unidad: labor.unidadSugerida,
      costo: labor.costoUnitarioSugerido !== undefined ? formatearMoneda(labor.costoUnitarioSugerido, monedaPorId.get(labor.idMoneda || 0)?.codigo || monedaPorDefecto?.codigo || 'USD') : 'Sin costo',
      origen: 'Agro App',
      estado: labor.estadoVinculacion === 'vinculado_erp' ? 'Vinculada ERP' : labor.origen,
      accion: 'editar' as const,
      laborPropia: labor,
    })),
    ...serviciosErp.map((servicio) => {
      const unidad = snapshot.unidadesMedida.find((item) => item.idUnidadMedida === servicio.idUnidadMedida);
      const laborPropia = laboresPorServicioErpId.get(servicio.erpId);
      const costo = laborPropia?.costoUnitarioSugerido ?? servicio.precioUnitario;
      const moneda = monedaPorId.get(laborPropia?.idMoneda || servicio.idMoneda || 0)?.codigo || monedaPorDefecto?.codigo || 'USD';

      return {
        id: servicio.erpId,
        nombre: servicio.descripcion,
        detalle: `${laborPropia ? 'Con costo Agro App' : 'Disponible'} ERP`,
        codigo: servicio.codigo,
        unidad: unidad?.codigo || String(servicio.idUnidadMedida || '-'),
        costo: costo !== undefined ? formatearMoneda(costo, moneda) : 'Sin costo',
        origen: 'ERP',
        estado: servicio.imputaDosis ? 'Imputa dosis' : 'No imputa dosis',
        accion: 'editar' as const,
        laborPropia,
        servicioErp: servicio,
      };
    }),
  ];

  function abrirEditarServicioErp(servicioErp: ErpServicio, laborPropia?: ServicioApp) {
    const ahora = new Date().toISOString();
    const unidad = snapshot.unidadesMedida.find((item) => item.idUnidadMedida === servicioErp.idUnidadMedida);

    setModoModal('editar');
    setLaborEnEdicion(laborPropia || {
      id: crearIdLaborDesdeErp(servicioErp),
      clienteId: planificacion.planificaciones[0]?.clienteId || planificacion.serviciosApp[0]?.clienteId || 'cliente-demo',
      empresaErpId: 'global',
      servicioErpId: servicioErp.erpId,
      idServicio: servicioErp.idServicio,
      idTipoServicio: servicioErp.idTipoServicio,
      codigo: normalizarCodigo(servicioErp.codigo || servicioErp.descripcion),
      nombre: limpiarTextoVisible(servicioErp.descripcion),
      descripcionAbreviada: servicioErp.descripcionAbreviada,
      idUnidadMedida: servicioErp.idUnidadMedida,
      idMoneda: servicioErp.idMoneda,
      unidadSugerida: unidad?.codigo || String(servicioErp.idUnidadMedida || 'Ha'),
      costoUnitarioSugerido: servicioErp.precioUnitario ?? 0,
      imputaDosis: servicioErp.imputaDosis,
      estadoVinculacion: 'vinculado_erp',
      activo: servicioErp.activo,
      origen: 'erp',
      fechaUltimaActualizacionErp: servicioErp.actualizadoEn,
      createdAt: ahora,
      updatedAt: ahora,
    });
  }

  function abrirVinculacion(labor: ServicioApp) {
    if (labor.estadoVinculacion !== 'provisorio' || labor.servicioErpId) {
      notificar?.({ tipo: 'info', titulo: 'Labor no vinculable', mensaje: 'Solo se pueden vincular labores propias en estado provisorio.' });
      return;
    }

    if (!serviciosErpDisponiblesParaVincular.length) {
      notificar?.({ tipo: 'info', titulo: 'No hay servicio ERP disponible', mensaje: 'Todos los servicios ERP ya estan vinculados o no hay servicios importados.' });
      return;
    }

    const sugerencias = sugerirVinculacion(
      { codigo: labor.codigo, nombre: labor.nombre },
      serviciosErpDisponiblesParaVincular,
      (registro) => registro.codigo,
      (registro) => registro.descripcion,
    );

    setLaborPropiaParaVincular(labor);
    setServicioErpVincularId(sugerencias[0].registro.erpId);
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

    const guardado = await guardarServicio({
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

      <PageHeader
        eyebrow="Padrones maestros"
        title="Labores"
        description={`Catalogo propio para seleccionar trabajos en protocolos. ${estadoCargaErp}`}
        aside={<div className="status-pill">{laboresOrdenadas.length}</div>}
      />

      <Panel
        title="Labores registradas"
        description="El costo sugerido se copia al protocolo al seleccionar la labor; cambios posteriores no alteran historicos cerrados."
        actions={(
          <ActionBar align="end">
            <Button variant="small" onClick={abrirNuevaLabor} disabled={!puedeConfigurarPlanificacion}>
              Nueva labor
            </Button>
          </ActionBar>
        )}
      >
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
            { key: 'origen', label: 'Origen', width: 'minmax(86px, 0.55fr)', render: (fila) => <OriginBadge origen={fila.origen} /> },
            { key: 'estado', label: 'Estado', width: 'minmax(116px, 0.8fr)', render: (fila) => <em>{fila.estado}</em> },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(150px, 0.7fr)',
              render: (fila) => fila.accion === 'editar'
                ? (
                  <div className="table-icon-actions">
                    <IconButton
                      icon="edit"
                      label={fila.servicioErp ? `Editar costo ${fila.nombre}` : `Editar labor ${fila.nombre}`}
                      onClick={() => fila.servicioErp ? abrirEditarServicioErp(fila.servicioErp, fila.laborPropia) : fila.laborPropia && abrirEditarLabor(fila.laborPropia)}
                      disabled={!puedeConfigurarPlanificacion}
                    />
                    {fila.laborPropia?.estadoVinculacion === 'provisorio' && !fila.laborPropia.servicioErpId && (
                      <IconButton icon="link" label={`Vincular labor ${fila.nombre}`} onClick={() => fila.laborPropia && abrirVinculacion(fila.laborPropia)} disabled={!puedeConfigurarPlanificacion} />
                    )}
                  </div>
                )
                : null,
            },
          ]}
        />
      </Panel>

      {laborEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="labor-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="labor-modal-title">{modoModal === 'crear' ? 'Nueva labor' : 'Editar labor'}</h2>
              </div>
              <Button variant="small" onClick={() => setLaborEnEdicion(null)}>Cerrar</Button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Nombre
                <input
                  value={laborEnEdicion.nombre}
                  disabled={Boolean(laborEnEdicion.servicioErpId)}
                  placeholder="Ej. Pulverizacion terrestre"
                  onChange={(event) => actualizarBorrador({ nombre: event.target.value })}
                />
              </label>

              <label>
                Codigo
                <input
                  value={laborEnEdicion.codigo}
                  disabled={Boolean(laborEnEdicion.servicioErpId)}
                  placeholder="Ej. PULT"
                  onChange={(event) => actualizarBorrador({ codigo: event.target.value })}
                />
              </label>

              <label>
                Unidad
                <select
                  value={laborEnEdicion.unidadSugerida}
                  disabled={Boolean(laborEnEdicion.servicioErpId)}
                  onChange={(event) => actualizarBorrador({ unidadSugerida: event.target.value })}
                >
                  {unidadesDisponibles.length === 0 && <option value={laborEnEdicion.unidadSugerida}>{laborEnEdicion.unidadSugerida}</option>}
                  {unidadesDisponibles.map((unidad) => (
                    <option key={unidad.erpId} value={unidad.codigo}>{unidad.codigo} - {unidad.descripcion}</option>
                  ))}
                </select>
              </label>

              <label>
                Costo propio
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
                  disabled={Boolean(laborEnEdicion.servicioErpId)}
                  placeholder="Descripcion visible para administradores"
                  onChange={(event) => actualizarBorrador({ descripcionAbreviada: event.target.value })}
                />
              </label>

              <label>
                Moneda
                <select
                  value={laborEnEdicion.idMoneda || ''}
                  onChange={(event) => actualizarBorrador({ idMoneda: event.target.value ? Number(event.target.value) : undefined })}
                >
                  {!laborEnEdicion.idMoneda && <option value="">Seleccionar moneda</option>}
                  {monedasDisponibles.map((moneda) => (
                    <option key={moneda.erpId} value={moneda.idMoneda}>{moneda.codigo} - {moneda.nombre}</option>
                  ))}
                </select>
              </label>

              <label>
                Origen
                <select value={laborEnEdicion.origen} disabled={Boolean(laborEnEdicion.servicioErpId)} onChange={(event) => actualizarBorrador({ origen: event.target.value as ServicioApp['origen'] })}>
                  <option value="provisorio">Provisorio</option>
                  <option value="semilla">Semilla</option>
                  <option value="erp">ERP</option>
                </select>
              </label>

              <label>
                Estado
                <select value={laborEnEdicion.estadoVinculacion} disabled={Boolean(laborEnEdicion.servicioErpId)} onChange={(event) => actualizarBorrador({ estadoVinculacion: event.target.value as ServicioApp['estadoVinculacion'] })}>
                  <option value="provisorio">Provisorio</option>
                  <option value="vinculado_erp">Vinculado ERP</option>
                  <option value="archivado">Archivado</option>
                </select>
              </label>

              <label className="reference-check">
                <input
                  type="checkbox"
                  checked={laborEnEdicion.activo}
                  disabled={Boolean(laborEnEdicion.servicioErpId)}
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
              <Button variant="small" onClick={() => setLaborEnEdicion(null)}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={aplicarModal}
                disabled={guardandoLabores || !laborEnEdicion.nombre.trim() || !laborEnEdicion.unidadSugerida.trim() || existeCodigoDuplicado}
              >
                <span className="button-content">
                  {guardandoLabores && <LoadingSpinner label="Guardando labor" />}
                  {guardandoLabores ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </Button>
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
              <Button variant="ghost" onClick={() => { setLaborPropiaParaVincular(null); setServicioErpVincularId(''); }}>Cerrar</Button>
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
                  {serviciosErpSugeridosParaVincular.map(({ registro, motivo }) => (
                    <option key={registro.erpId} value={registro.erpId}>{registro.codigo} - {registro.descripcion} ({motivo})</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <span className="hint">El backend valida que el servicio ERP exista y no este vinculado a otra labor del cliente.</span>
              <Button variant="primary" disabled={guardandoLabores || !servicioErpVincularId} onClick={confirmarVinculacionLabor}>
                <span className="button-content">{guardandoLabores && <span className="loading-spinner" />}Vincular</span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
