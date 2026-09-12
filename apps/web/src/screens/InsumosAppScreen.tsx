import { useEffect, useMemo, useState } from 'react';
import { ErpInsumo, ErpMoneda, ErpSnapshot, ErpTipoInsumo, InsumoApp, PlanificacionSnapshot, SesionUsuario } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { DecimalInput } from '../components/DecimalInput';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OriginBadge } from '../components/OriginBadge';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { obtenerInsumosErpImportados, obtenerMonedasErpImportadas, obtenerTiposInsumoErpImportados } from '../services/api';
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

interface InsumosAppScreenProps {
  sesion: SesionUsuario;
  planificacion: PlanificacionSnapshot;
  snapshot: ErpSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoInsumos: boolean;
  guardarInsumo: (insumo: InsumoApp) => Promise<boolean>;
  notificar?: Notificar;
}

type InsumoTabla = {
  id: string;
  nombre: string;
  detalle: string;
  codigo: string;
  tipo: string;
  unidad: string;
  precio: string;
  origen: string;
  accion: 'editar';
  insumoPropio?: InsumoApp;
  insumoErp?: ErpInsumo;
};

function crearIdInsumoAppDesdeErp(insumo: ErpInsumo) {
  return `insumo-app-erp-${insumo.erpId.replace(/[^a-zA-Z0-9]+/g, '-')}`;
}

function unirTiposInsumo(principales: ErpTipoInsumo[], secundarios: ErpTipoInsumo[]) {
  const mapa = new Map<number, ErpTipoInsumo>();

  for (const tipo of secundarios) {
    mapa.set(tipo.idTipoInsumo, tipo);
  }

  for (const tipo of principales) {
    mapa.set(tipo.idTipoInsumo, tipo);
  }

  return [...mapa.values()];
}

export function InsumosAppScreen({
  sesion,
  planificacion,
  snapshot,
  puedeConfigurarPlanificacion,
  guardandoInsumos,
  guardarInsumo,
  notificar,
}: InsumosAppScreenProps) {
  const [insumoEnEdicion, setInsumoEnEdicion] = useState<InsumoApp | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [insumosErp, setInsumosErp] = useState<ErpInsumo[]>([]);
  const [tiposInsumoErp, setTiposInsumoErp] = useState<ErpTipoInsumo[]>(snapshot.tiposInsumo || []);
  const [monedasErp, setMonedasErp] = useState<ErpMoneda[]>(snapshot.monedas || []);
  const [estadoCargaErp, setEstadoCargaErp] = useState('Cargando insumos ERP.');
  const [insumoPropioParaVincular, setInsumoPropioParaVincular] = useState<InsumoApp | null>(null);
  const [insumoErpVincularId, setInsumoErpVincularId] = useState('');
  const insumosOrdenados = useMemo(() => (
    [...(planificacion.insumosApp || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  ), [planificacion.insumosApp]);
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
  const monedaPorDefecto = monedasDisponibles.find((moneda) => moneda.codigo.toUpperCase() === 'USD')?.codigo
    || monedasDisponibles[0]?.codigo
    || 'USD';
  const tiposInsumoTodos = useMemo(() => (
    unirTiposInsumo(snapshot.tiposInsumo || [], tiposInsumoErp)
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'))
  ), [snapshot.tiposInsumo, tiposInsumoErp]);
  const tiposInsumoDisponibles = useMemo(() => (
    tiposInsumoTodos.filter((tipo) => tipo.activo)
  ), [tiposInsumoTodos]);
  const tipoInsumoPorId = useMemo(() => new Map(tiposInsumoTodos.map((tipo) => [tipo.idTipoInsumo, tipo])), [tiposInsumoTodos]);

  useEffect(() => {
    if ((snapshot.tiposInsumo || []).length) {
      setTiposInsumoErp(snapshot.tiposInsumo);
    }

    async function cargarTiposInsumoErp() {
      try {
        const respuesta = await obtenerTiposInsumoErpImportados(sesion.token);
        setTiposInsumoErp(respuesta.tiposInsumo);
      } catch {
        setTiposInsumoErp([]);
      }
    }

    cargarTiposInsumoErp();
  }, [sesion.token, snapshot.tiposInsumo]);

  useEffect(() => {
    async function cargarInsumosErp() {
      try {
        const respuesta = await obtenerInsumosErpImportados(sesion.token);

        setInsumosErp(respuesta.insumos);
        setEstadoCargaErp('Insumos ERP cargados desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar los insumos ERP.';
        setEstadoCargaErp(mensaje);
      }
    }

    cargarInsumosErp();
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

  function crearBorradorInsumo(): InsumoApp {
    const ahora = new Date().toISOString();

    return {
      id: `insumo-app-${Date.now()}`,
      clienteId: planificacion.planificaciones[0]?.clienteId || insumosOrdenados[0]?.clienteId || 'cliente-demo',
      empresaErpId: 'global',
      nombre: '',
      codigoInterno: '',
      idTipoInsumo: tiposInsumoDisponibles[0]?.idTipoInsumo,
      tipo: '',
      unidad: unidadesDisponibles.find((unidad) => unidad.codigo === 'Lts')?.codigo || unidadesDisponibles[0]?.codigo || 'Unid',
      precioUnitarioEstimado: 0,
      moneda: monedaPorDefecto,
      estadoVinculacion: 'provisorio',
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  function abrirNuevoInsumo() {
    setModoModal('crear');
    setInsumoEnEdicion(crearBorradorInsumo());
  }

  function abrirEditarInsumo(insumo: InsumoApp) {
    setModoModal('editar');
    setInsumoEnEdicion({ ...insumo });
  }

  function actualizarBorrador(cambios: Partial<InsumoApp>) {
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
    const insumoPreparado: InsumoApp = {
      ...insumoEnEdicion,
      empresaErpId: 'global',
      nombre,
      codigoInterno: normalizarCodigo(insumoEnEdicion.codigoInterno || nombre),
      idTipoInsumo: insumoEnEdicion.idTipoInsumo,
      tipo: insumoEnEdicion.idTipoInsumo ? tipoInsumoPorId.get(insumoEnEdicion.idTipoInsumo)?.descripcion : undefined,
      unidad: limpiarTextoVisible(insumoEnEdicion.unidad || 'Unid'),
      moneda: limpiarTextoVisible(insumoEnEdicion.moneda || monedaPorDefecto).toUpperCase(),
      precioUnitarioEstimado: insumoEnEdicion.precioUnitarioEstimado || 0,
      estadoVinculacion: insumoEnEdicion.insumoErpId ? 'vinculado_erp' : 'provisorio',
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
  const filtroPropiosErp = useMemo(
    () => new Set(insumosOrdenados.map((insumo) => insumo.insumoErpId).filter((id): id is string => Boolean(id))),
    [insumosOrdenados],
  );
  const insumosPropiosPorErpId = useMemo(() => (
    new Map(insumosOrdenados.filter((insumo) => insumo.insumoErpId).map((insumo) => [insumo.insumoErpId, insumo]))
  ), [insumosOrdenados]);
  const insumosErpDisponiblesParaVincular = useMemo(() => insumosErp
    .filter((insumo) => !filtroPropiosErp.has(insumo.erpId))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [filtroPropiosErp, insumosErp]);
  const insumosErpSugeridosParaVincular = useMemo(() => (
    insumoPropioParaVincular
      ? sugerirVinculacion(
        { codigo: insumoPropioParaVincular.codigoInterno, nombre: insumoPropioParaVincular.nombre },
        insumosErpDisponiblesParaVincular,
        (registro) => registro.codigo,
        (registro) => registro.nombre,
      )
      : []
  ), [insumoPropioParaVincular, insumosErpDisponiblesParaVincular]);
  const filasInsumo: InsumoTabla[] = [
    ...insumosOrdenados.filter((insumo) => !insumo.insumoErpId).map((insumo) => ({
      id: insumo.id,
      nombre: insumo.nombre,
      detalle: insumo.estadoVinculacion === 'vinculado_erp' ? 'Vinculado ERP' : 'Provisorio',
      codigo: insumo.codigoInterno || '-',
      tipo: insumo.idTipoInsumo ? tipoInsumoPorId.get(insumo.idTipoInsumo)?.descripcion || insumo.tipo || `Tipo ${insumo.idTipoInsumo}` : insumo.tipo || '-',
      unidad: insumo.unidad,
      precio: insumo.precioUnitarioEstimado !== undefined ? formatearMoneda(insumo.precioUnitarioEstimado, insumo.moneda || monedaPorDefecto) : 'Sin precio',
      origen: 'Agro App',
      accion: 'editar' as const,
      insumoPropio: insumo,
    })),
    ...insumosErp.map((insumo) => {
      const unidad = snapshot.unidadesMedida.find((item) => item.idUnidadMedida === insumo.idUnidadMedida);
      const insumoPropio = insumosPropiosPorErpId.get(insumo.erpId);
      const precio = insumoPropio?.precioUnitarioEstimado ?? insumo.precioUnitario;
      const moneda = insumoPropio?.moneda || monedaPorId.get(insumo.idMonedaPrecioUnitario || 0)?.codigo || monedaPorDefecto;

      return {
        id: insumo.erpId,
        nombre: insumo.nombre,
        detalle: `${insumoPropio ? 'Con precio Agro App' : 'Disponible'} ERP`,
        codigo: insumo.codigo,
        tipo: insumo.idTipoInsumo ? tipoInsumoPorId.get(insumo.idTipoInsumo)?.descripcion || `Tipo ${insumo.idTipoInsumo}` : '-',
        unidad: unidad?.codigo || String(insumo.idUnidadMedida || '-'),
        precio: precio !== undefined ? formatearMoneda(precio, moneda) : 'Sin precio',
        origen: 'ERP',
        accion: 'editar' as const,
        insumoPropio,
        insumoErp: insumo,
      };
    }),
  ];

  function abrirEditarInsumoErp(insumoErp: ErpInsumo, insumoPropio?: InsumoApp) {
    const ahora = new Date().toISOString();
    const unidad = snapshot.unidadesMedida.find((item) => item.idUnidadMedida === insumoErp.idUnidadMedida);
    const moneda = monedaPorId.get(insumoErp.idMonedaPrecioUnitario || 0)?.codigo || monedaPorDefecto;

    setModoModal('editar');
    setInsumoEnEdicion(insumoPropio || {
      id: crearIdInsumoAppDesdeErp(insumoErp),
      clienteId: planificacion.planificaciones[0]?.clienteId || insumosOrdenados[0]?.clienteId || 'cliente-demo',
      empresaErpId: 'global',
      insumoErpId: insumoErp.erpId,
      nombre: limpiarTextoVisible(insumoErp.nombre),
      codigoInterno: normalizarCodigo(insumoErp.codigo || insumoErp.nombre),
      idTipoInsumo: insumoErp.idTipoInsumo,
      tipo: insumoErp.idTipoInsumo ? tipoInsumoPorId.get(insumoErp.idTipoInsumo)?.descripcion || `Tipo ${insumoErp.idTipoInsumo}` : undefined,
      unidad: unidad?.codigo || String(insumoErp.idUnidadMedida || 'Unid'),
      precioUnitarioEstimado: insumoErp.precioUnitario ?? 0,
      moneda,
      estadoVinculacion: 'vinculado_erp',
      createdAt: ahora,
      updatedAt: ahora,
    });
  }

  function abrirVinculacion(insumo: InsumoApp) {
    if (insumo.estadoVinculacion !== 'provisorio' || insumo.insumoErpId) {
      notificar?.({ tipo: 'info', titulo: 'Insumo no vinculable', mensaje: 'Solo se pueden vincular insumos propios en estado provisorio.' });
      return;
    }

    if (!insumosErpDisponiblesParaVincular.length) {
      notificar?.({ tipo: 'info', titulo: 'No hay insumo ERP disponible', mensaje: 'Todos los insumos ERP ya estan vinculados o no hay insumos importados.' });
      return;
    }

    const sugerencias = sugerirVinculacion(
      { codigo: insumo.codigoInterno, nombre: insumo.nombre },
      insumosErpDisponiblesParaVincular,
      (registro) => registro.codigo,
      (registro) => registro.nombre,
    );

    setInsumoPropioParaVincular(insumo);
    setInsumoErpVincularId(sugerencias[0].registro.erpId);
  }

  async function confirmarVinculacionInsumo() {
    if (!insumoPropioParaVincular || !insumoErpVincularId) {
      return;
    }

    const insumoErp = insumosErp.find((insumo) => insumo.erpId === insumoErpVincularId);
    const unidad = snapshot.unidadesMedida.find((item) => item.idUnidadMedida === insumoErp?.idUnidadMedida);
    const moneda = monedaPorId.get(insumoErp?.idMonedaPrecioUnitario || 0)?.codigo || insumoPropioParaVincular.moneda || monedaPorDefecto;

    if (!insumoErp) {
      notificar?.({ tipo: 'error', titulo: 'No se encontro el insumo ERP', mensaje: 'Actualiza la pantalla e intenta nuevamente.' });
      return;
    }

    const guardado = await guardarInsumo({
      ...insumoPropioParaVincular,
      empresaErpId: 'global',
      insumoErpId: insumoErp.erpId,
      nombre: limpiarTextoVisible(insumoErp.nombre),
      codigoInterno: normalizarCodigo(insumoErp.codigo || insumoErp.nombre),
      idTipoInsumo: insumoErp.idTipoInsumo,
      tipo: insumoErp.idTipoInsumo ? tipoInsumoPorId.get(insumoErp.idTipoInsumo)?.descripcion || `Tipo ${insumoErp.idTipoInsumo}` : insumoPropioParaVincular.tipo,
      unidad: unidad?.codigo || insumoPropioParaVincular.unidad,
      precioUnitarioEstimado: insumoErp.precioUnitario ?? insumoPropioParaVincular.precioUnitarioEstimado,
      moneda,
      estadoVinculacion: 'vinculado_erp',
      updatedAt: new Date().toISOString(),
    });

    if (guardado) {
      setInsumoPropioParaVincular(null);
      setInsumoErpVincularId('');
      notificar?.({ tipo: 'success', titulo: 'Insumo vinculado', mensaje: 'La vinculacion quedo guardada con auditoria.' });
    }
  }

  return (
    <section className="planning-stack">
      <section className="metrics">
        <article><span>ERP sincronizados</span><strong>{insumosErp.length}</strong></article>
        <article><span>Propios Agro App</span><strong>{insumosOrdenados.length}</strong></article>
        <article><span>Provisorios</span><strong>{insumosOrdenados.filter((insumo) => insumo.estadoVinculacion === 'provisorio').length}</strong></article>
        <article><span>Vinculados</span><strong>{insumosOrdenados.filter((insumo) => insumo.estadoVinculacion === 'vinculado_erp').length}</strong></article>
      </section>

      <PageHeader
        eyebrow="Padrones maestros"
        title="Insumos"
        description={`Catalogo operativo para seleccionar insumos en protocolos. ${estadoCargaErp}`}
        aside={<div className="status-pill">{insumosOrdenados.length}</div>}
      />

      <Panel
        title="Insumos registrados"
        description="El precio estimado se copia al protocolo al seleccionar el insumo; cambios posteriores no alteran historicos cerrados."
        actions={(
          <ActionBar align="end">
            <Button variant="small" onClick={abrirNuevoInsumo} disabled={!puedeConfigurarPlanificacion}>
              Nuevo insumo
            </Button>
          </ActionBar>
        )}
      >
        <DataTable
          rows={filasInsumo}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay insumos registrados."
          initialPageSize={25}
          columns={[
            { key: 'insumo', label: 'Insumo', width: 'minmax(190px, 1.4fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'codigo', label: 'Codigo', width: 'minmax(92px, 0.65fr)', render: (fila) => fila.codigo },
            { key: 'tipo', label: 'Tipo', width: 'minmax(96px, 0.7fr)', render: (fila) => fila.tipo },
            { key: 'unidad', label: 'Unidad', width: 'minmax(76px, 0.5fr)', render: (fila) => fila.unidad },
            { key: 'precio', label: 'Precio', width: 'minmax(96px, 0.65fr)', render: (fila) => fila.precio },
            { key: 'origen', label: 'Origen', width: 'minmax(86px, 0.55fr)', render: (fila) => <OriginBadge origen={fila.origen} /> },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(150px, 0.7fr)',
              render: (fila) => fila.accion === 'editar'
                ? (
                  <div className="table-icon-actions">
                    <IconButton
                      icon="edit"
                      label={fila.insumoErp ? `Editar precio ${fila.nombre}` : `Editar insumo ${fila.nombre}`}
                      onClick={() => fila.insumoErp ? abrirEditarInsumoErp(fila.insumoErp, fila.insumoPropio) : fila.insumoPropio && abrirEditarInsumo(fila.insumoPropio)}
                      disabled={!puedeConfigurarPlanificacion}
                    />
                    {fila.insumoPropio?.estadoVinculacion === 'provisorio' && !fila.insumoPropio.insumoErpId && (
                      <IconButton icon="link" label={`Vincular insumo ${fila.nombre}`} onClick={() => fila.insumoPropio && abrirVinculacion(fila.insumoPropio)} disabled={!puedeConfigurarPlanificacion} />
                    )}
                  </div>
                )
                : null,
            },
          ]}
        />
      </Panel>

      {insumoEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="insumo-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="insumo-modal-title">{modoModal === 'crear' ? 'Nuevo insumo' : 'Editar insumo'}</h2>
              </div>
              <Button variant="small" onClick={() => setInsumoEnEdicion(null)}>Cerrar</Button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Nombre
                <input
                  value={insumoEnEdicion.nombre}
                  disabled={Boolean(insumoEnEdicion.insumoErpId)}
                  placeholder="Ej. Glifosato 66%"
                  onChange={(event) => actualizarBorrador({ nombre: event.target.value })}
                />
              </label>

              <label>
                Codigo
                <input
                  value={insumoEnEdicion.codigoInterno || ''}
                  disabled={Boolean(insumoEnEdicion.insumoErpId)}
                  placeholder="Ej. GLI66"
                  onChange={(event) => actualizarBorrador({ codigoInterno: event.target.value })}
                />
              </label>

              <label>
                Tipo
                <select
                  value={insumoEnEdicion.idTipoInsumo || ''}
                  disabled={Boolean(insumoEnEdicion.insumoErpId)}
                  onChange={(event) => {
                    const idTipoInsumo = event.target.value ? Number(event.target.value) : undefined;
                    actualizarBorrador({
                      idTipoInsumo,
                      tipo: idTipoInsumo ? tipoInsumoPorId.get(idTipoInsumo)?.descripcion : undefined,
                    });
                  }}
                >
                  <option value="">Sin tipo</option>
                  {tiposInsumoDisponibles.map((tipo) => (
                    <option key={tipo.erpId} value={tipo.idTipoInsumo}>{tipo.codigo} - {tipo.descripcion}</option>
                  ))}
                </select>
              </label>

              <label>
                Unidad
                <select
                  value={insumoEnEdicion.unidad}
                  disabled={Boolean(insumoEnEdicion.insumoErpId)}
                  onChange={(event) => actualizarBorrador({ unidad: event.target.value })}
                >
                  {unidadesDisponibles.length === 0 && <option value={insumoEnEdicion.unidad}>{insumoEnEdicion.unidad}</option>}
                  {unidadesDisponibles.map((unidad) => (
                    <option key={unidad.erpId} value={unidad.codigo}>{unidad.codigo} - {unidad.descripcion}</option>
                  ))}
                </select>
              </label>

              <label>
                Precio propio
                <DecimalInput
                  value={insumoEnEdicion.precioUnitarioEstimado || 0}
                  min={0}
                  onValueChange={(value) => actualizarBorrador({ precioUnitarioEstimado: value })}
                />
              </label>

              <label>
                Moneda
                <select
                  value={insumoEnEdicion.moneda || monedaPorDefecto}
                  onChange={(event) => actualizarBorrador({ moneda: event.target.value })}
                >
                  {monedasDisponibles.length === 0 && <option value={insumoEnEdicion.moneda || monedaPorDefecto}>{insumoEnEdicion.moneda || monedaPorDefecto}</option>}
                  {monedasDisponibles.map((moneda) => (
                    <option key={moneda.erpId} value={moneda.codigo}>{moneda.codigo} - {moneda.nombre}</option>
                  ))}
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
              <Button variant="small" onClick={() => setInsumoEnEdicion(null)}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={aplicarModal}
                disabled={guardandoInsumos || !insumoEnEdicion.nombre.trim() || !insumoEnEdicion.unidad.trim() || existeCodigoDuplicado}
              >
                <span className="button-content">
                  {guardandoInsumos && <LoadingSpinner label="Guardando insumo" />}
                  {guardandoInsumos ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}

      {insumoPropioParaVincular && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vincular-insumo-title">
            <div className="modal-header">
              <div>
                <h2 id="vincular-insumo-title">Vincular insumo provisorio</h2>
                <p className="hint">El insumo propio copiara datos base de ALBOR y dejara de mostrarse como fila independiente.</p>
              </div>
              <Button variant="ghost" onClick={() => { setInsumoPropioParaVincular(null); setInsumoErpVincularId(''); }}>Cerrar</Button>
            </div>
            <div className="reference-modal-grid">
              <div className="reference-total">
                <span>Insumo provisorio</span>
                <strong>{insumoPropioParaVincular.nombre}</strong>
                <span>{insumoPropioParaVincular.codigoInterno || 'Sin codigo interno'}</span>
              </div>
              <label className="reference-wide">
                Insumo ERP disponible
                <select value={insumoErpVincularId} onChange={(event) => setInsumoErpVincularId(event.target.value)}>
                  {insumosErpSugeridosParaVincular.map(({ registro, motivo }) => (
                    <option key={registro.erpId} value={registro.erpId}>{registro.codigo} - {registro.nombre} ({motivo})</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <span className="hint">El backend valida que el insumo ERP exista y no este vinculado a otro insumo del cliente.</span>
              <Button variant="primary" disabled={guardandoInsumos || !insumoErpVincularId} onClick={confirmarVinculacionInsumo}>
                <span className="button-content">{guardandoInsumos && <span className="loading-spinner" />}Vincular</span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
