import { useMemo, useState } from 'react';
import { GastoComercialItemReferencia, GastosComercialesReferencia, PlanificacionSnapshot } from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface GastosComercialesScreenProps {
  planificacion: PlanificacionSnapshot;
  campanias: Array<{ erpId: string; nombre: string; codigo: string; esActual: boolean }>;
  puedeConfigurarPlanificacion: boolean;
  guardandoGastos: boolean;
  guardarGastoComercial: (gasto: GastosComercialesReferencia) => Promise<boolean>;
  formatearUsd: (valor: number) => string;
  leerNumero: (valor: string) => number;
}

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarTexto(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function formatearFecha(valor: string) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(valor));
}

export function GastosComercialesScreen({
  planificacion,
  campanias,
  puedeConfigurarPlanificacion,
  guardandoGastos,
  guardarGastoComercial,
  formatearUsd,
  leerNumero,
}: GastosComercialesScreenProps) {
  const [gastoEnEdicion, setGastoEnEdicion] = useState<GastosComercialesReferencia | null>(null);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [creandoDestino, setCreandoDestino] = useState(false);
  const actividades = planificacion.actividadesPlanificacion || [];
  const zonas = planificacion.zonasPlanificacion || [];
  const campos = planificacion.camposPlanificacion;
  const conceptosGastos = planificacion.conceptosGastosComerciales.filter((concepto) => concepto.activo);
  const planificacionActiva = planificacion.planificaciones[0];
  const camposDisponibles = gastoEnEdicion?.zonaPlanificacionId
    ? campos.filter((campo) => campo.zonaPlanificacionId === gastoEnEdicion.zonaPlanificacionId)
    : campos;
  const destinosDisponibles = useMemo(() => {
    const destinos = new Map<string, string>();

    for (const destino of planificacion.destinosReferencia) {
      destinos.set(destino.destinoVentaNormalizado || normalizarTexto(destino.destinoVenta), limpiarTextoVisible(destino.destinoVenta));
    }

    for (const precio of planificacion.preciosReferencia) {
      destinos.set(normalizarTexto(precio.destinoVenta), limpiarTextoVisible(precio.destinoVenta));
    }

    for (const gasto of planificacion.gastosComercialesReferencia) {
      if (gasto.destinoVenta) {
        destinos.set(normalizarTexto(gasto.destinoVenta), limpiarTextoVisible(gasto.destinoVenta));
      }
    }

    return Array.from(destinos.values()).sort((a, b) => a.localeCompare(b));
  }, [planificacion.destinosReferencia, planificacion.gastosComercialesReferencia, planificacion.preciosReferencia]);

  function crearItem(): GastoComercialItemReferencia {
    return {
      conceptoGastoComercialId: conceptosGastos[0]?.id || '',
      conceptoNombre: conceptosGastos[0]?.nombre || '',
      valorPorTonelada: 0,
      moneda: 'USD',
      observaciones: '',
    };
  }

  function crearBorradorGasto(): GastosComercialesReferencia {
    const ahora = new Date().toISOString();
    const actividad = actividades[0];

    return {
      id: `gastos-comerciales-${Date.now()}`,
      clienteId: planificacion.gastosComercialesReferencia[0]?.clienteId || planificacion.planificaciones[0]?.clienteId || 'cliente-demo',
      campaniaErpId: planificacionActiva?.campaniaErpId || campanias.find((campania) => campania.esActual)?.erpId || campanias[0]?.erpId || '',
      empresaErpId: actividad?.empresaErpId || planificacion.camposPlanificacion[0]?.empresaErpId || 'empresa-demo',
      actividadPlanificacionId: actividad?.id || '',
      actividadErpId: actividad?.actividadErpId,
      destinoVenta: '',
      descripcion: '',
      items: [crearItem()],
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    };
  }

  function abrirNuevoGasto() {
    setModoModal('crear');
    setCreandoDestino(false);
    setGastoEnEdicion(crearBorradorGasto());
  }

  function abrirEditarGasto(gasto: GastosComercialesReferencia) {
    setModoModal('editar');
    setCreandoDestino(false);
    setGastoEnEdicion({ ...gasto, items: gasto.items.map((item) => ({ ...item })) });
  }

  function actualizarBorrador(cambios: Partial<GastosComercialesReferencia>) {
    setGastoEnEdicion((actual) => (actual ? { ...actual, ...cambios, updatedAt: new Date().toISOString() } : actual));
  }

  function actualizarItem(indice: number, cambios: Partial<GastoComercialItemReferencia>) {
    setGastoEnEdicion((actual) => {
      if (!actual) {
        return actual;
      }

      return {
        ...actual,
        updatedAt: new Date().toISOString(),
        items: actual.items.map((item, itemIndice) => (itemIndice === indice ? { ...item, ...cambios } : item)),
      };
    });
  }

  function agregarItem() {
    setGastoEnEdicion((actual) => (actual ? { ...actual, items: [...actual.items, crearItem()], updatedAt: new Date().toISOString() } : actual));
  }

  function quitarItem(indice: number) {
    setGastoEnEdicion((actual) => {
      if (!actual || actual.items.length === 1) {
        return actual;
      }

      return {
        ...actual,
        updatedAt: new Date().toISOString(),
        items: actual.items.filter((_, itemIndice) => itemIndice !== indice),
      };
    });
  }

  async function aplicarModal() {
    if (!gastoEnEdicion) {
      return;
    }

    const guardado = await guardarGastoComercial(gastoEnEdicion);

    if (guardado) {
      setGastoEnEdicion(null);
    }
  }

  function describirAlcance(gasto: GastosComercialesReferencia) {
    const campo = gasto.campoPlanificacionId ? campos.find((item) => item.id === gasto.campoPlanificacionId) : undefined;
    const zona = gasto.zonaPlanificacionId ? zonas.find((item) => item.id === gasto.zonaPlanificacionId) : undefined;

    if (campo) {
      return campo.nombre;
    }

    if (zona) {
      return zona.nombre;
    }

    if (gasto.zonaErpId) {
      return `Zona ERP ${gasto.zonaErpId}`;
    }

    return 'General';
  }

  function describirCampania(campaniaErpId: string) {
    const campania = campanias.find((item) => item.erpId === campaniaErpId);

    return campania?.nombre || campania?.codigo || campaniaErpId || 'Sin campania';
  }

  function resumirItems(gasto: GastosComercialesReferencia) {
    return gasto.items.map((item) => `${item.conceptoNombre || 'Sin concepto'}: ${item.moneda} ${item.valorPorTonelada}/tn`).join(' | ');
  }

  function totalPorToneladaUsd(gasto: GastosComercialesReferencia) {
    return gasto.items
      .filter((item) => item.moneda === 'USD')
      .reduce((total, item) => total + item.valorPorTonelada, 0);
  }

  const destinoExistenteModal = gastoEnEdicion?.destinoVenta
    ? destinosDisponibles.some((destino) => normalizarTexto(destino) === normalizarTexto(gastoEnEdicion.destinoVenta || ''))
    : true;
  const destinoCanonicoModal = gastoEnEdicion?.destinoVenta
    ? destinosDisponibles.find((destino) => normalizarTexto(destino) === normalizarTexto(gastoEnEdicion.destinoVenta || ''))
    : undefined;
  const modalInvalido = !gastoEnEdicion
    || !gastoEnEdicion.actividadPlanificacionId
    || !gastoEnEdicion.campaniaErpId
    || !gastoEnEdicion.descripcion.trim()
    || (creandoDestino && !gastoEnEdicion.destinoVenta?.trim())
    || gastoEnEdicion.items.some((item) => !item.conceptoGastoComercialId.trim() || !item.conceptoNombre.trim() || item.valorPorTonelada < 0 || !item.moneda.trim());

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Referencias comerciales</p>
          <h2>Gastos comerciales</h2>
          <p className="hint">Tabla editable para definir fletes, acondicionamiento, comisiones y otros gastos por tonelada sugeridos por actividad, destino y alcance.</p>
        </div>
        <div className="status-pill">{planificacion.gastosComercialesReferencia.length}</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Gastos registrados</h2>
            <p className="hint">Estos valores se proponen en la planilla y se copian a cada linea para conservar el supuesto original.</p>
          </div>
          <div className="button-row">
            <button className="small" onClick={abrirNuevoGasto} disabled={!puedeConfigurarPlanificacion}>
              Nuevo gasto
            </button>
          </div>
        </div>

        <div className="reference-list expense-list">
          <div className="reference-list-row expense-list-row reference-list-head">
            <span>Descripcion</span>
            <span>Campania</span>
            <span>Actividad</span>
            <span>Destino</span>
            <span>Alcance</span>
            <span>Items</span>
            <span>Actualizado</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {!planificacion.gastosComercialesReferencia.length && (
            <div className="empty-state">Todavia no hay gastos comerciales registrados.</div>
          )}
          {planificacion.gastosComercialesReferencia.map((gasto) => {
            const actividad = actividades.find((item) => item.id === gasto.actividadPlanificacionId);
            const totalPorTonelada = totalPorToneladaUsd(gasto);

            return (
              <div className="reference-list-row expense-list-row" key={`tabla-${gasto.id}`}>
                <strong>{gasto.descripcion}</strong>
                <span>{describirCampania(gasto.campaniaErpId)}</span>
                <span>{actividad?.nombre || gasto.actividadErpId || 'Sin actividad'}</span>
                <span>{gasto.destinoVenta || 'General'}</span>
                <span>{describirAlcance(gasto)}</span>
                <span title={resumirItems(gasto)}>{gasto.items.length} item{gasto.items.length === 1 ? '' : 's'}{totalPorTonelada ? ` | ${formatearUsd(totalPorTonelada)}/tn` : ''}</span>
                <span>{formatearFecha(gasto.updatedAt || gasto.createdAt)}</span>
                <span>{gasto.activo ? 'Activo' : 'Inactivo'}</span>
                <button className="small" onClick={() => abrirEditarGasto(gasto)} disabled={!puedeConfigurarPlanificacion}>
                  Editar
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {gastoEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel modal-panel-wide" role="dialog" aria-modal="true" aria-labelledby="gastos-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Gasto comercial</p>
                <h2 id="gastos-modal-title">{modoModal === 'crear' ? 'Nuevo gasto' : 'Editar gasto'}</h2>
              </div>
              <button className="small" onClick={() => { setCreandoDestino(false); setGastoEnEdicion(null); }}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Campania
                <select
                  value={gastoEnEdicion.campaniaErpId}
                  onChange={(event) => actualizarBorrador({ campaniaErpId: event.target.value })}
                >
                  <option value="">Seleccionar campania</option>
                  {campanias.map((item) => (
                    <option key={item.erpId} value={item.erpId}>{item.nombre || item.codigo}</option>
                  ))}
                </select>
              </label>

              <label>
                Actividad
                <select
                  value={gastoEnEdicion.actividadPlanificacionId}
                  onChange={(event) => {
                    const actividadSeleccionada = actividades.find((item) => item.id === event.target.value);
                    actualizarBorrador({
                      actividadPlanificacionId: event.target.value,
                      empresaErpId: actividadSeleccionada?.empresaErpId || gastoEnEdicion.empresaErpId,
                      actividadErpId: actividadSeleccionada?.actividadErpId,
                    });
                  }}
                >
                  <option value="">Seleccionar actividad</option>
                  {actividades.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </label>

              <label>
                Destino
                <select
                  value={creandoDestino ? '__nuevo__' : !gastoEnEdicion.destinoVenta ? '' : destinoExistenteModal ? destinoCanonicoModal || '' : '__nuevo__'}
                  onChange={(event) => {
                    setCreandoDestino(event.target.value === '__nuevo__');
                    actualizarBorrador({ destinoVenta: event.target.value === '__nuevo__' ? '' : event.target.value });
                  }}
                >
                  <option value="">General</option>
                  {destinosDisponibles.map((destino) => (
                    <option key={destino} value={destino}>{destino}</option>
                  ))}
                  <option value="__nuevo__">Crear nuevo destino</option>
                </select>
              </label>

              {(creandoDestino || !destinoExistenteModal) && (
                <label>
                  Nuevo destino
                  <input
                    value={gastoEnEdicion.destinoVenta || ''}
                    placeholder="Ej. Puerto Quequen"
                    onChange={(event) => actualizarBorrador({ destinoVenta: event.target.value })}
                  />
                </label>
              )}

              <label>
                Zona
                <select
                  value={gastoEnEdicion.zonaPlanificacionId || ''}
                  onChange={(event) => {
                    const zonaSeleccionada = zonas.find((item) => item.id === event.target.value);
                    actualizarBorrador({
                      zonaPlanificacionId: zonaSeleccionada?.id,
                      zonaErpId: zonaSeleccionada?.zonaErpId,
                      empresaErpId: zonaSeleccionada?.empresaErpId || gastoEnEdicion.empresaErpId,
                      campoPlanificacionId: undefined,
                      campoErpId: undefined,
                    });
                  }}
                >
                  <option value="">Todas las zonas</option>
                  {zonas.map((zona) => (
                    <option key={zona.id} value={zona.id}>{zona.nombre}</option>
                  ))}
                </select>
              </label>

              <label>
                Campo
                <select
                  value={gastoEnEdicion.campoPlanificacionId || ''}
                  onChange={(event) => {
                    const campoSeleccionado = campos.find((item) => item.id === event.target.value);
                    actualizarBorrador({
                      zonaPlanificacionId: campoSeleccionado?.zonaPlanificacionId || gastoEnEdicion.zonaPlanificacionId,
                      campoPlanificacionId: campoSeleccionado?.id,
                      campoErpId: campoSeleccionado?.campoErpId,
                      zonaErpId: campoSeleccionado?.zonaErpId,
                      empresaErpId: campoSeleccionado?.empresaErpId || gastoEnEdicion.empresaErpId,
                    });
                  }}
                >
                  <option value="">Todos los campos</option>
                  {camposDisponibles.map((campo) => (
                    <option key={campo.id} value={campo.id}>{campo.nombre}</option>
                  ))}
                </select>
              </label>

              <label className="reference-wide">
                Descripcion
                <input
                  value={gastoEnEdicion.descripcion}
                  placeholder="Ej. Girasol a Quequen"
                  onChange={(event) => actualizarBorrador({ descripcion: event.target.value })}
                />
              </label>

              <label className="reference-check">
                <input type="checkbox" checked={gastoEnEdicion.activo} onChange={(event) => actualizarBorrador({ activo: event.target.checked })} />
                Activo
              </label>
            </div>

            <div className="expense-items">
              <div className="panel-header inline">
                <h3>Items</h3>
                <button className="small" onClick={agregarItem} disabled={!conceptosGastos.length}>Agregar item</button>
              </div>

              {gastoEnEdicion.items.map((item, indice) => (
                <div className="expense-item-row" key={`item-${indice}`}>
                  <label>
                    Concepto
                    <select
                      value={item.conceptoGastoComercialId}
                      onChange={(event) => {
                        const conceptoSeleccionado = conceptosGastos.find((concepto) => concepto.id === event.target.value);
                        actualizarItem(indice, {
                          conceptoGastoComercialId: conceptoSeleccionado?.id || '',
                          conceptoNombre: conceptoSeleccionado?.nombre || '',
                        });
                      }}
                    >
                      <option value="">Seleccionar concepto</option>
                      {conceptosGastos.map((concepto) => (
                        <option key={concepto.id} value={concepto.id}>{concepto.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Valor por tn
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valorPorTonelada}
                      onChange={(event) => actualizarItem(indice, { valorPorTonelada: leerNumero(event.target.value) })}
                    />
                  </label>
                  <label>
                    Moneda
                    <select value={item.moneda} onChange={(event) => actualizarItem(indice, { moneda: event.target.value })}>
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </label>
                  <label className="expense-item-notes">
                    Observaciones
                    <input
                      value={item.observaciones || ''}
                      placeholder="Opcional"
                      onChange={(event) => actualizarItem(indice, { observaciones: event.target.value })}
                    />
                  </label>
                  <button className="danger" onClick={() => quitarItem(indice)} disabled={gastoEnEdicion.items.length === 1}>
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="small" onClick={() => { setCreandoDestino(false); setGastoEnEdicion(null); }}>Cancelar</button>
              <button className="primary" onClick={aplicarModal} disabled={guardandoGastos || modalInvalido}>
                <span className="button-content">
                  {guardandoGastos && <LoadingSpinner label="Guardando gastos" />}
                  {guardandoGastos ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
