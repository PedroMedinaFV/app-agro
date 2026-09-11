import { useEffect, useMemo, useState } from 'react';
import { ActividadApp, ErpActividad, ErpEspecie, ErpPuerto, PlanificacionSnapshot, PrecioReferencia, SesionUsuario } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { guardarActividadApp, obtenerActividadesErpImportadas, obtenerActividadesApp, obtenerEspeciesErpImportadas, obtenerPuertosErpImportados } from '../services/api';

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
  sesion: SesionUsuario;
  planificacion: PlanificacionSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoPrecios: boolean;
  guardarPrecioReferencia: (precio: PrecioReferencia) => Promise<boolean>;
  formatearUsd: (valor: number) => string;
  leerNumero: (valor: string) => number;
}

type ActividadSeleccionable = {
  clave: string;
  nombre: string;
  empresaErpId?: string;
  actividadAppId?: string;
  actividadErpId?: string;
  especieAppId?: string;
  especieErpId?: string;
  codigo?: string;
  origen: 'agro' | 'erp';
  erp?: ErpActividad;
};

export function PreciosReferenciaScreen({
  sesion,
  planificacion,
  puedeConfigurarPlanificacion,
  guardandoPrecios,
  guardarPrecioReferencia,
  formatearUsd,
  leerNumero,
}: PreciosReferenciaScreenProps) {
  const [precioEnEdicion, setPrecioEnEdicion] = useState<PrecioReferencia | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [modoDestinoNuevo, setModoDestinoNuevo] = useState(false);
  const [actividadSeleccionadaClave, setActividadSeleccionadaClave] = useState('');
  const [actividadesPropiasDb, setActividadesPropiasDb] = useState<ActividadApp[]>([]);
  const [actividadesErp, setActividadesErp] = useState<ErpActividad[]>([]);
  const [especiesErp, setEspeciesErp] = useState<ErpEspecie[]>([]);
  const [puertosErp, setPuertosErp] = useState<ErpPuerto[]>([]);
  const destinosDisponibles = useMemo(() => {
    const destinos = new Map<string, string>();

    for (const destino of planificacion.destinosReferencia) {
      destinos.set(destino.destinoVentaNormalizado || normalizarTexto(destino.destinoVenta), limpiarTextoVisible(destino.destinoVenta));
    }

    for (const precio of planificacion.preciosReferencia) {
      destinos.set(normalizarTexto(precio.destinoVenta), limpiarTextoVisible(precio.destinoVenta));
    }

    for (const puerto of puertosErp) {
      if (puerto.activo) {
        destinos.set(normalizarTexto(puerto.nombre), limpiarTextoVisible(puerto.nombre));
      }
    }

    return Array.from(destinos.values()).sort((a, b) => a.localeCompare(b));
  }, [planificacion.destinosReferencia, planificacion.preciosReferencia, puertosErp]);
  const actividadesPropias = actividadesPropiasDb.length ? actividadesPropiasDb : planificacion.actividadesApp || [];
  const actividadesAppIds = new Set(actividadesPropias.map((actividad) => actividad.actividadErpId).filter(Boolean));
  const especiesErpPorId = useMemo(() => new Map(especiesErp.map((especie) => [especie.idEspecie, especie])), [especiesErp]);
  const actividades = useMemo<ActividadSeleccionable[]>(() => {
    const propias = actividadesPropias.map((actividad) => ({
      clave: `agro:${actividad.id}`,
      nombre: actividad.nombre,
      empresaErpId: actividad.empresaErpId,
      actividadAppId: actividad.id,
      actividadErpId: actividad.actividadErpId,
      especieAppId: actividad.especieAppId,
      especieErpId: actividad.especieErpId,
      codigo: actividad.codigoInterno,
      origen: 'agro' as const,
    }));
    const erp = actividadesErp
      .filter((actividad) => !actividadesAppIds.has(actividad.erpId))
      .map((actividad) => {
        const especie = actividad.idEspecie ? especiesErpPorId.get(actividad.idEspecie) : undefined;

        return {
          clave: `erp:${actividad.erpId}`,
          nombre: actividad.descripcion,
          empresaErpId: actividad.empresaErpId,
          actividadErpId: actividad.erpId,
          especieErpId: especie?.erpId,
          codigo: actividad.codigo,
          origen: 'erp' as const,
          erp: actividad,
        };
      });

    return [...propias, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [actividadesErp, actividadesAppIds, actividadesPropias, especiesErpPorId]);
  const actividadesPorClave = useMemo(() => new Map(actividades.map((actividad) => [actividad.clave, actividad])), [actividades]);
  const actividadesPropiasPorId = useMemo(() => new Map(actividadesPropias.map((actividad) => [actividad.id, actividad])), [actividadesPropias]);

  useEffect(() => {
    async function cargarActividadesReales() {
      const [propias, erp, especies, puertos] = await Promise.all([
        obtenerActividadesApp(sesion.token),
        obtenerActividadesErpImportadas(sesion.token),
        obtenerEspeciesErpImportadas(sesion.token),
        obtenerPuertosErpImportados(sesion.token),
      ]);

      setActividadesPropiasDb(propias.actividades);
      setActividadesErp(erp.actividades);
      setEspeciesErp(especies.especies);
      setPuertosErp(puertos.puertos);
    }

    cargarActividadesReales().catch(() => undefined);
  }, [sesion.token]);

  function formatearFecha(valor: string) {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(valor));
  }

  function crearBorradorPrecio(): PrecioReferencia {
    const ahora = new Date().toISOString();
    const actividad = actividades[0];
    const destino = actividad?.actividadAppId ? planificacion.destinosReferencia.find((item) => item.actividadAppId === actividad.actividadAppId) : undefined;

    return {
      id: `precio-referencia-${Date.now()}`,
      clienteId: planificacion.preciosReferencia[0]?.clienteId || planificacion.planificaciones[0]?.clienteId || 'cliente-demo',
      empresaErpId: actividad?.empresaErpId,
      actividadAppId: actividad?.actividadAppId || '',
      actividadErpId: actividad?.actividadErpId,
      especieAppId: actividad?.especieAppId,
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
    setActividadSeleccionadaClave(actividades[0]?.clave || '');
    setModoDestinoNuevo(false);
    setPrecioEnEdicion(crearBorradorPrecio());
  }

  function abrirEditarPrecio(precio: PrecioReferencia) {
    setModoModal('editar');
    setActividadSeleccionadaClave(`agro:${precio.actividadAppId}`);
    setModoDestinoNuevo(false);
    setPrecioEnEdicion({ ...precio });
  }

  function actualizarBorrador(cambios: Partial<PrecioReferencia>) {
    setPrecioEnEdicion((actual) => (actual ? { ...actual, ...cambios, updatedAt: new Date().toISOString() } : actual));
  }

  function seleccionarActividad(clave: string) {
    const actividad = actividadesPorClave.get(clave);

    setActividadSeleccionadaClave(clave);
    actualizarBorrador({
      empresaErpId: actividad?.empresaErpId,
      actividadAppId: actividad?.actividadAppId || '',
      actividadErpId: actividad?.actividadErpId,
      especieAppId: actividad?.especieAppId,
      especieErpId: actividad?.especieErpId,
    });
  }

  function crearIdActividadDesdeErp(actividadErpId: string) {
    return `actividad-app-${actividadErpId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
  }

  async function asegurarActividadApp(precio: PrecioReferencia): Promise<PrecioReferencia> {
    if (precio.actividadAppId) {
      return precio;
    }

    const actividad = actividadesPorClave.get(actividadSeleccionadaClave);

    if (!actividad?.erp) {
      return precio;
    }

    const ahora = new Date().toISOString();
    const actividadPreparada: ActividadApp = {
      id: crearIdActividadDesdeErp(actividad.erp.erpId),
      clienteId: precio.clienteId,
      empresaErpId: 'global',
      actividadErpId: actividad.erp.erpId,
      especieErpId: actividad.especieErpId,
      nombre: actividad.erp.descripcion,
      codigoInterno: actividad.erp.codigo,
      estadoVinculacion: 'vinculado_erp',
      createdAt: ahora,
      updatedAt: ahora,
    };
    const respuesta = await guardarActividadApp(actividadPreparada.id, {
      actividad: actividadPreparada,
      origen: 'web',
      motivo: 'Creacion automatica de actividad operativa vinculada desde precio',
    }, sesion.token);

    setActividadesPropiasDb((actuales) => [respuesta.actividad, ...actuales]);
    setActividadSeleccionadaClave(`agro:${respuesta.actividad.id}`);

    return {
      ...precio,
      empresaErpId: respuesta.actividad.empresaErpId,
      actividadAppId: respuesta.actividad.id,
      actividadErpId: respuesta.actividad.actividadErpId,
      especieAppId: respuesta.actividad.especieAppId,
      especieErpId: respuesta.actividad.especieErpId,
    };
  }

  async function aplicarModal() {
    if (!precioEnEdicion) {
      return;
    }

    const precioPreparado = await asegurarActividadApp({ ...precioEnEdicion, unidad: 'tn' });
    const guardado = await guardarPrecioReferencia(precioPreparado);

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
  const valorSelectDestino = modoDestinoNuevo
    ? '__nuevo__'
    : !precioEnEdicion?.destinoVenta
      ? ''
      : destinoExistenteModal
        ? destinoCanonicoModal || ''
        : '__nuevo__';

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

        <DataTable
          rows={planificacion.preciosReferencia}
          getRowKey={(precio) => precio.id}
          emptyMessage="Todavia no hay precios registrados."
          columns={[
            { key: 'actividad', label: 'Actividad', width: 'minmax(140px, 1.1fr)', render: (precio) => <strong>{actividadesPropiasPorId.get(precio.actividadAppId)?.nombre || precio.actividadErpId || 'Sin actividad'}</strong> },
            { key: 'destino', label: 'Destino', width: 'minmax(130px, 1fr)', render: (precio) => precio.destinoVenta || 'Sin destino' },
            { key: 'precio', label: 'Precio', width: 'minmax(100px, 0.75fr)', render: (precio) => `${precio.moneda === 'USD' ? formatearUsd(precio.valor) : `${precio.moneda} ${precio.valor}`} / ${precio.unidad}` },
            { key: 'fuente', label: 'Fuente', width: 'minmax(90px, 0.6fr)', render: (precio) => precio.fuente },
            { key: 'actualizado', label: 'Actualizado', width: 'minmax(110px, 0.7fr)', render: (precio) => formatearFecha(precio.updatedAt || precio.createdAt) },
            { key: 'estado', label: 'Estado', width: 'minmax(86px, 0.55fr)', render: (precio) => <em>{precio.activo ? 'Activo' : 'Inactivo'}</em> },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(86px, 0.5fr)',
              render: (precio) => <button className="small" onClick={() => abrirEditarPrecio(precio)} disabled={!puedeConfigurarPlanificacion}>Editar</button>,
            },
          ]}
        />
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
                  value={actividadSeleccionadaClave}
                  onChange={(event) => seleccionarActividad(event.target.value)}
                >
                  <option value="">Seleccionar actividad</option>
                  {actividades.map((item) => (
                    <option key={item.clave} value={item.clave}>{item.codigo ? `${item.codigo} - ` : ''}{item.nombre} ({item.origen === 'erp' ? 'ERP' : 'Agro App'})</option>
                  ))}
                </select>
              </label>

              <label>
                Destino
                <select
                  value={valorSelectDestino}
                  onChange={(event) => {
                    const valor = event.target.value;

                    if (valor === '__nuevo__') {
                      setModoDestinoNuevo(true);
                      actualizarBorrador({ destinoVenta: '' });
                      return;
                    }

                    setModoDestinoNuevo(false);
                    actualizarBorrador({ destinoVenta: valor });
                  }}
                >
                  <option value="">Seleccionar destino</option>
                  {destinosDisponibles.map((destino) => (
                    <option key={destino} value={destino}>{destino}</option>
                  ))}
                  <option value="__nuevo__">Crear nuevo destino</option>
                </select>
              </label>

              {modoDestinoNuevo && (
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
                Valor por tn
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
                <input value="tn" disabled aria-readonly="true" />
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
                disabled={guardandoPrecios || !actividadSeleccionadaClave || !precioEnEdicion.destinoVenta.trim() || precioEnEdicion.valor < 0}
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
