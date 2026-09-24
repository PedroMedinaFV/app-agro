import { useEffect, useMemo, useState } from 'react';
import { ErpEspecie, ErpPuerto, EspecieApp, PlanificacionSnapshot, PrecioReferencia, SesionUsuario } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { DecimalInput } from '../components/DecimalInput';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { obtenerEspeciesApp, obtenerEspeciesErpImportadas, obtenerPuertosErpImportados } from '../services/api';

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
  formatearUsd: (valor: number, decimales?: number) => string;
}

type EspecieSeleccionable = {
  clave: string;
  nombre: string;
  empresaErpId?: string;
  especieAppId?: string;
  especieErpId?: string;
  codigo?: string;
  origen: 'agro' | 'erp';
  erp?: ErpEspecie;
};

export function PreciosReferenciaScreen({
  sesion,
  planificacion,
  puedeConfigurarPlanificacion,
  guardandoPrecios,
  guardarPrecioReferencia,
  formatearUsd,
}: PreciosReferenciaScreenProps) {
  const [precioEnEdicion, setPrecioEnEdicion] = useState<PrecioReferencia | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [modoDestinoNuevo, setModoDestinoNuevo] = useState(false);
  const [especieSeleccionadaClave, setEspecieSeleccionadaClave] = useState('');
  const [especiesPropiasDb, setEspeciesPropiasDb] = useState<EspecieApp[]>([]);
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
  const especiesPropias = especiesPropiasDb.length ? especiesPropiasDb : planificacion.especiesApp || [];
  const especiesAppErpIds = new Set(especiesPropias.map((especie) => especie.especieErpId).filter(Boolean));
  const especies = useMemo<EspecieSeleccionable[]>(() => {
    const propias = especiesPropias.map((especie) => {
      const esErp = especie.estadoVinculacion === 'vinculado_erp' || Boolean(especie.especieErpId);

      return {
        clave: esErp && especie.especieErpId ? `erp:${especie.especieErpId}` : `agro:${especie.id}`,
        nombre: especie.nombre,
        empresaErpId: especie.empresaErpId,
        especieAppId: especie.id,
        especieErpId: especie.especieErpId,
        codigo: especie.codigoInterno,
        origen: esErp ? 'erp' as const : 'agro' as const,
      };
    });
    const erp = especiesErp
      .filter((especie) => !especiesAppErpIds.has(especie.erpId))
      .map((especie) => ({
        clave: `erp:${especie.erpId}`,
        nombre: especie.nombre,
        empresaErpId: especie.empresaErpId,
        especieErpId: especie.erpId,
        codigo: especie.codigo,
        origen: 'erp' as const,
        erp: especie,
      }));

    return [...propias, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [especiesAppErpIds, especiesErp, especiesPropias]);
  const especiesPorClave = useMemo(() => new Map(especies.map((especie) => [especie.clave, especie])), [especies]);
  const especiesPropiasPorId = useMemo(() => new Map(especiesPropias.map((especie) => [especie.id, especie])), [especiesPropias]);
  const especiesErpPorErpId = useMemo(() => new Map(especiesErp.map((especie) => [especie.erpId, especie])), [especiesErp]);
  const actividadesPropiasPorId = useMemo(() => new Map((planificacion.actividadesApp || []).map((actividad) => [actividad.id, actividad])), [planificacion.actividadesApp]);

  useEffect(() => {
    async function cargarPadronesReales() {
      const [propias, especies, puertos] = await Promise.all([
        obtenerEspeciesApp(sesion.token),
        obtenerEspeciesErpImportadas(sesion.token),
        obtenerPuertosErpImportados(sesion.token),
      ]);

      setEspeciesPropiasDb(propias.especies);
      setEspeciesErp(especies.especies);
      setPuertosErp(puertos.puertos);
    }

    cargarPadronesReales().catch(() => undefined);
  }, [sesion.token]);

  function formatearFecha(valor: string) {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(valor));
  }

  function crearBorradorPrecio(): PrecioReferencia {
    const ahora = new Date().toISOString();
    const especie = especies[0];
    const destino = especie?.especieErpId
      ? planificacion.destinosReferencia.find((item) => item.especieErpId === especie.especieErpId)
      : undefined;

    return {
      id: `precio-referencia-${Date.now()}`,
      clienteId: planificacion.preciosReferencia[0]?.clienteId || planificacion.planificaciones[0]?.clienteId || '',
      empresaErpId: especie?.empresaErpId,
      especieAppId: especie?.especieAppId,
      especieErpId: especie?.especieErpId,
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
    setEspecieSeleccionadaClave(especies[0]?.clave || '');
    setModoDestinoNuevo(false);
    setPrecioEnEdicion(crearBorradorPrecio());
  }

  function abrirEditarPrecio(precio: PrecioReferencia) {
    setModoModal('editar');
    const actividad = precio.actividadAppId ? actividadesPropiasPorId.get(precio.actividadAppId) : undefined;
    const especieAppId = precio.especieAppId || actividad?.especieAppId;
    const especieErpId = precio.especieErpId || actividad?.especieErpId;

    setEspecieSeleccionadaClave(especieErpId ? `erp:${especieErpId}` : especieAppId ? `agro:${especieAppId}` : '');
    setModoDestinoNuevo(false);
    setPrecioEnEdicion({ ...precio, especieAppId, especieErpId });
  }

  function actualizarBorrador(cambios: Partial<PrecioReferencia>) {
    setPrecioEnEdicion((actual) => (actual ? { ...actual, ...cambios, updatedAt: new Date().toISOString() } : actual));
  }

  function seleccionarEspecie(clave: string) {
    const especie = especiesPorClave.get(clave);

    setEspecieSeleccionadaClave(clave);
    actualizarBorrador({
      empresaErpId: especie?.empresaErpId,
      actividadAppId: undefined,
      actividadErpId: undefined,
      especieAppId: especie?.especieAppId,
      especieErpId: especie?.especieErpId,
    });
  }

  async function aplicarModal() {
    if (!precioEnEdicion) {
      return;
    }

    const precioPreparado = { ...precioEnEdicion, unidad: 'tn' };
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
      <PageHeader
        eyebrow="Referencias comerciales"
        title="Precios de cereales"
        description="Tabla base editable para proponer precios por cereal y destino al crear la planificacion. Cada cambio queda auditado cuando se guarda en backend."
        aside={<div className="status-pill">{planificacion.preciosReferencia.length}</div>}
      />

      <Panel
        title="Precios registrados"
        description="Los valores se copian a la linea de planificacion para conservar el supuesto original. Editar un precio no reescribe planificaciones ya cerradas."
        actions={(
          <ActionBar align="end">
            <Button variant="small" onClick={abrirNuevoPrecio} disabled={!puedeConfigurarPlanificacion}>
              Nuevo precio
            </Button>
          </ActionBar>
        )}
      >
        <DataTable
          rows={planificacion.preciosReferencia}
          getRowKey={(precio) => precio.id}
          emptyMessage="Todavia no hay precios registrados."
          columns={[
            {
              key: 'especie',
              label: 'Cereal',
              width: 'minmax(140px, 1.1fr)',
              render: (precio) => {
                const actividad = precio.actividadAppId ? actividadesPropiasPorId.get(precio.actividadAppId) : undefined;
                const especieAppId = precio.especieAppId || actividad?.especieAppId;
                const especieErpId = precio.especieErpId || actividad?.especieErpId;
                const nombre = (especieAppId ? especiesPropiasPorId.get(especieAppId)?.nombre : undefined)
                  || (especieErpId ? especiesErpPorErpId.get(especieErpId)?.nombre : undefined)
                  || especieErpId
                  || 'Sin cereal';

                return <strong>{nombre}</strong>;
              },
            },
            { key: 'destino', label: 'Destino', width: 'minmax(130px, 1fr)', render: (precio) => precio.destinoVenta || 'Sin destino' },
            { key: 'precio', label: 'Precio', width: 'minmax(100px, 0.75fr)', render: (precio) => `${precio.moneda === 'USD' ? formatearUsd(precio.valor, 2) : `${precio.moneda} ${precio.valor}`} / ${precio.unidad}` },
            { key: 'fuente', label: 'Fuente', width: 'minmax(90px, 0.6fr)', render: (precio) => precio.fuente },
            { key: 'actualizado', label: 'Actualizado', width: 'minmax(110px, 0.7fr)', render: (precio) => formatearFecha(precio.updatedAt || precio.createdAt) },
            { key: 'estado', label: 'Estado', width: 'minmax(86px, 0.55fr)', render: (precio) => <em>{precio.activo ? 'Activo' : 'Inactivo'}</em> },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(86px, 0.5fr)',
              render: (precio) => (
                <div className="table-icon-actions">
                  <IconButton icon="edit" label={`Editar precio ${precio.destinoVenta}`} onClick={() => abrirEditarPrecio(precio)} disabled={!puedeConfigurarPlanificacion} />
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {precioEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="precio-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Precio de referencia</p>
                <h2 id="precio-modal-title">{modoModal === 'crear' ? 'Nuevo precio' : 'Editar precio'}</h2>
              </div>
              <Button variant="small" onClick={() => setPrecioEnEdicion(null)}>Cerrar</Button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Cereal
                <select
                  value={especieSeleccionadaClave}
                  onChange={(event) => seleccionarEspecie(event.target.value)}
                >
                  <option value="">Seleccionar cereal</option>
                  {especies.map((item) => (
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
                <DecimalInput
                  value={precioEnEdicion.valor}
                  onValueChange={(value) => actualizarBorrador({ valor: value })}
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
              <Button variant="small" onClick={() => setPrecioEnEdicion(null)}>Cancelar</Button>
              <Button
                variant="primary"
                onClick={aplicarModal}
                disabled={guardandoPrecios || !especieSeleccionadaClave || !precioEnEdicion.destinoVenta.trim() || precioEnEdicion.valor < 0}
              >
                <span className="button-content">
                  {guardandoPrecios && <LoadingSpinner label="Guardando precio" />}
                  {guardandoPrecios ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
