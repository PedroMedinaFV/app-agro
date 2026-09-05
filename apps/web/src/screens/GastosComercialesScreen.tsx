import { useEffect, useMemo, useState } from 'react';
import {
  ActividadPlanificacion,
  ErpActividad,
  ErpCampo,
  ErpEspecie,
  ErpPuerto,
  ErpZona,
  GastoComercialItemReferencia,
  GastosComercialesReferencia,
  PlanificacionSnapshot,
  SesionUsuario,
} from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  guardarActividadPlanificacion,
  obtenerActividadesErpImportadas,
  obtenerActividadesPlanificacion,
  obtenerCamposErpImportados,
  obtenerEspeciesErpImportadas,
  obtenerPuertosErpImportados,
  obtenerZonasErpImportadas,
} from '../services/api';

interface GastosComercialesScreenProps {
  sesion: SesionUsuario;
  planificacion: PlanificacionSnapshot;
  campanias: Array<{ erpId: string; nombre: string; codigo: string; esActual: boolean }>;
  puedeConfigurarPlanificacion: boolean;
  guardandoGastos: boolean;
  guardarGastoComercial: (gasto: GastosComercialesReferencia) => Promise<boolean>;
  formatearUsd: (valor: number) => string;
  leerNumero: (valor: string) => number;
}

type ActividadSeleccionable = {
  clave: string;
  nombre: string;
  empresaErpId?: string;
  actividadPlanificacionId?: string;
  actividadErpId?: string;
  especieErpId?: string;
  codigo?: string;
  origen: 'agro' | 'erp';
  erp?: ErpActividad;
};

type ZonaSeleccionable = {
  clave: string;
  nombre: string;
  codigo?: string;
  zonaPlanificacionId?: string;
  zonaErpId?: string;
  idZona?: number;
  origen: 'agro' | 'erp';
};

type CampoSeleccionable = {
  clave: string;
  nombre: string;
  codigo?: string;
  empresaErpId: string;
  campoPlanificacionId?: string;
  campoErpId?: string;
  zonaPlanificacionId?: string;
  zonaErpId?: string;
  idZona?: number;
  origen: 'agro' | 'erp';
};

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
  sesion,
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
  const [actividadSeleccionadaClave, setActividadSeleccionadaClave] = useState('');
  const [zonaSeleccionadaClave, setZonaSeleccionadaClave] = useState('');
  const [campoSeleccionadoClave, setCampoSeleccionadoClave] = useState('');
  const [actividadesPropiasDb, setActividadesPropiasDb] = useState<ActividadPlanificacion[]>([]);
  const [actividadesErp, setActividadesErp] = useState<ErpActividad[]>([]);
  const [especiesErp, setEspeciesErp] = useState<ErpEspecie[]>([]);
  const [zonasErp, setZonasErp] = useState<ErpZona[]>([]);
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [puertosErp, setPuertosErp] = useState<ErpPuerto[]>([]);
  const actividadesPropias = actividadesPropiasDb.length ? actividadesPropiasDb : planificacion.actividadesPlanificacion || [];
  const zonas = planificacion.zonasPlanificacion || [];
  const campos = planificacion.camposPlanificacion;
  const conceptosGastos = planificacion.conceptosGastosComerciales.filter((concepto) => concepto.activo);
  const planificacionActiva = planificacion.planificaciones[0];
  const especiesErpPorId = useMemo(() => new Map(especiesErp.map((especie) => [especie.idEspecie, especie])), [especiesErp]);
  const actividadesPropiasErpIds = new Set(actividadesPropias.map((actividad) => actividad.actividadErpId).filter(Boolean));
  const actividades = useMemo<ActividadSeleccionable[]>(() => {
    const propias = actividadesPropias.map((actividad) => ({
      clave: `agro:${actividad.id}`,
      nombre: actividad.nombre,
      empresaErpId: actividad.empresaErpId,
      actividadPlanificacionId: actividad.id,
      actividadErpId: actividad.actividadErpId,
      especieErpId: actividad.especieErpId,
      codigo: actividad.codigoInterno,
      origen: 'agro' as const,
    }));
    const erp = actividadesErp
      .filter((actividad) => !actividadesPropiasErpIds.has(actividad.erpId))
      .map((actividad) => ({
        clave: `erp:${actividad.erpId}`,
        nombre: actividad.descripcion,
        empresaErpId: actividad.empresaErpId,
        actividadErpId: actividad.erpId,
        especieErpId: actividad.idEspecie ? especiesErpPorId.get(actividad.idEspecie)?.erpId : undefined,
        codigo: actividad.codigo,
        origen: 'erp' as const,
        erp: actividad,
      }));

    return [...propias, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [actividadesErp, actividadesPropias, actividadesPropiasErpIds, especiesErpPorId]);
  const actividadesPorClave = useMemo(() => new Map(actividades.map((actividad) => [actividad.clave, actividad])), [actividades]);
  const actividadesPropiasPorId = useMemo(() => new Map(actividadesPropias.map((actividad) => [actividad.id, actividad])), [actividadesPropias]);
  const zonasDisponibles = useMemo<ZonaSeleccionable[]>(() => {
    const propias = zonas.map((zona) => ({
      clave: `agro:${zona.id}`,
      nombre: zona.nombre,
      codigo: zona.codigoInterno,
      zonaPlanificacionId: zona.id,
      zonaErpId: zona.zonaErpId,
      origen: 'agro' as const,
    }));
    const erp = zonasErp.map((zona) => ({
      clave: `erp:${zona.erpId}`,
      nombre: zona.nombre,
      codigo: zona.codigo,
      zonaErpId: zona.erpId,
      idZona: zona.idZona,
      origen: 'erp' as const,
    }));

    return [...propias, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [zonas, zonasErp]);
  const zonasPorClave = useMemo(() => new Map(zonasDisponibles.map((zona) => [zona.clave, zona])), [zonasDisponibles]);
  const camposDisponibles = useMemo<CampoSeleccionable[]>(() => {
    const zonaSeleccionada = zonaSeleccionadaClave ? zonasPorClave.get(zonaSeleccionadaClave) : undefined;
    const propios = campos
      .filter((campo) => !zonaSeleccionada || campo.zonaPlanificacionId === zonaSeleccionada.zonaPlanificacionId || campo.zonaErpId === zonaSeleccionada.zonaErpId)
      .map((campo) => ({
        clave: `agro:${campo.id}`,
        nombre: campo.nombre,
        codigo: campo.codigoInterno,
        empresaErpId: campo.empresaErpId,
        campoPlanificacionId: campo.id,
        campoErpId: campo.campoErpId,
        zonaPlanificacionId: campo.zonaPlanificacionId,
        zonaErpId: campo.zonaErpId,
        origen: 'agro' as const,
      }));
    const erp = camposErp
      .filter((campo) => !zonaSeleccionada?.idZona || campo.idZona === zonaSeleccionada.idZona)
      .map((campo) => ({
        clave: `erp:${campo.erpId}`,
        nombre: campo.nombre,
        codigo: campo.codigo,
        empresaErpId: campo.empresaErpId,
        campoErpId: campo.erpId,
        zonaErpId: campo.idZona ? `zona:${campo.idZona}` : undefined,
        idZona: campo.idZona,
        origen: 'erp' as const,
      }));

    return [...propios, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [campos, camposErp, zonaSeleccionadaClave, zonasPorClave]);
  const camposPorClave = useMemo(() => new Map(camposDisponibles.map((campo) => [campo.clave, campo])), [camposDisponibles]);

  useEffect(() => {
    async function cargarPadronesReales() {
      const [actividadesPropiasRespuesta, actividadesErpRespuesta, especiesErpRespuesta, zonasErpRespuesta, camposErpRespuesta, puertosErpRespuesta] = await Promise.all([
        obtenerActividadesPlanificacion(sesion.token),
        obtenerActividadesErpImportadas(sesion.token),
        obtenerEspeciesErpImportadas(sesion.token),
        obtenerZonasErpImportadas(sesion.token),
        obtenerCamposErpImportados(sesion.token),
        obtenerPuertosErpImportados(sesion.token),
      ]);

      setActividadesPropiasDb(actividadesPropiasRespuesta.actividades);
      setActividadesErp(actividadesErpRespuesta.actividades);
      setEspeciesErp(especiesErpRespuesta.especies);
      setZonasErp(zonasErpRespuesta.zonas);
      setCamposErp(camposErpRespuesta.campos);
      setPuertosErp(puertosErpRespuesta.puertos);
    }

    cargarPadronesReales().catch(() => undefined);
  }, [sesion.token]);
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

    for (const puerto of puertosErp) {
      if (puerto.activo) {
        destinos.set(normalizarTexto(puerto.nombre), limpiarTextoVisible(puerto.nombre));
      }
    }

    return Array.from(destinos.values()).sort((a, b) => a.localeCompare(b));
  }, [planificacion.destinosReferencia, planificacion.gastosComercialesReferencia, planificacion.preciosReferencia, puertosErp]);

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
      empresaErpId: actividad?.empresaErpId || planificacion.camposPlanificacion[0]?.empresaErpId || 'global',
      actividadPlanificacionId: actividad?.actividadPlanificacionId || '',
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
    setActividadSeleccionadaClave(actividades[0]?.clave || '');
    setZonaSeleccionadaClave('');
    setCampoSeleccionadoClave('');
    setGastoEnEdicion(crearBorradorGasto());
  }

  function abrirEditarGasto(gasto: GastosComercialesReferencia) {
    setModoModal('editar');
    setCreandoDestino(false);
    setActividadSeleccionadaClave(`agro:${gasto.actividadPlanificacionId}`);
    setZonaSeleccionadaClave(gasto.zonaPlanificacionId ? `agro:${gasto.zonaPlanificacionId}` : gasto.zonaErpId ? `erp:${gasto.zonaErpId}` : '');
    setCampoSeleccionadoClave(gasto.campoPlanificacionId ? `agro:${gasto.campoPlanificacionId}` : gasto.campoErpId ? `erp:${gasto.campoErpId}` : '');
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

    const gastoPreparado = await asegurarActividadPlanificacion(gastoEnEdicion);
    const guardado = await guardarGastoComercial(gastoPreparado);

    if (guardado) {
      setGastoEnEdicion(null);
    }
  }

  function crearIdActividadDesdeErp(actividadErpId: string) {
    return `actividad-planificacion-${actividadErpId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
  }

  async function asegurarActividadPlanificacion(gasto: GastosComercialesReferencia): Promise<GastosComercialesReferencia> {
    if (gasto.actividadPlanificacionId) {
      return gasto;
    }

    const actividad = actividadesPorClave.get(actividadSeleccionadaClave);

    if (!actividad?.erp) {
      return gasto;
    }

    const ahora = new Date().toISOString();
    const actividadPreparada: ActividadPlanificacion = {
      id: crearIdActividadDesdeErp(actividad.erp.erpId),
      clienteId: gasto.clienteId,
      empresaErpId: 'global',
      actividadErpId: actividad.erp.erpId,
      especieErpId: actividad.especieErpId,
      nombre: actividad.erp.descripcion,
      codigoInterno: actividad.erp.codigo,
      estadoVinculacion: 'vinculado_erp',
      createdAt: ahora,
      updatedAt: ahora,
    };
    const respuesta = await guardarActividadPlanificacion(actividadPreparada.id, {
      actividad: actividadPreparada,
      origen: 'web',
      motivo: 'Creacion automatica de actividad operativa vinculada desde gastos comerciales',
    }, sesion.token);

    setActividadesPropiasDb((actuales) => [respuesta.actividad, ...actuales]);
    setActividadSeleccionadaClave(`agro:${respuesta.actividad.id}`);

    return {
      ...gasto,
      empresaErpId: respuesta.actividad.empresaErpId,
      actividadPlanificacionId: respuesta.actividad.id,
      actividadErpId: respuesta.actividad.actividadErpId,
    };
  }

  function seleccionarActividad(clave: string) {
    const actividadSeleccionada = actividadesPorClave.get(clave);

    setActividadSeleccionadaClave(clave);
    actualizarBorrador({
      actividadPlanificacionId: actividadSeleccionada?.actividadPlanificacionId || '',
      empresaErpId: actividadSeleccionada?.empresaErpId || gastoEnEdicion?.empresaErpId,
      actividadErpId: actividadSeleccionada?.actividadErpId,
    });
  }

  function seleccionarZona(clave: string) {
    const zonaSeleccionada = clave ? zonasPorClave.get(clave) : undefined;

    setZonaSeleccionadaClave(clave);
    setCampoSeleccionadoClave('');
    actualizarBorrador({
      zonaPlanificacionId: zonaSeleccionada?.zonaPlanificacionId,
      zonaErpId: zonaSeleccionada?.zonaErpId,
      campoPlanificacionId: undefined,
      campoErpId: undefined,
    });
  }

  function seleccionarCampo(clave: string) {
    const campoSeleccionado = clave ? camposPorClave.get(clave) : undefined;
    const zonaClave = campoSeleccionado?.zonaPlanificacionId
      ? `agro:${campoSeleccionado.zonaPlanificacionId}`
      : campoSeleccionado?.zonaErpId
        ? `erp:${campoSeleccionado.zonaErpId}`
        : zonaSeleccionadaClave;

    setCampoSeleccionadoClave(clave);
    setZonaSeleccionadaClave(zonaClave);
    actualizarBorrador({
      zonaPlanificacionId: campoSeleccionado?.zonaPlanificacionId || gastoEnEdicion?.zonaPlanificacionId,
      zonaErpId: campoSeleccionado?.zonaErpId || gastoEnEdicion?.zonaErpId,
      campoPlanificacionId: campoSeleccionado?.campoPlanificacionId,
      campoErpId: campoSeleccionado?.campoErpId,
      empresaErpId: campoSeleccionado?.empresaErpId || gastoEnEdicion?.empresaErpId,
    });
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
    || !actividadSeleccionadaClave
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

        <DataTable
          rows={planificacion.gastosComercialesReferencia}
          getRowKey={(gasto) => gasto.id}
          emptyMessage="Todavia no hay gastos comerciales registrados."
          columns={[
            { key: 'descripcion', label: 'Descripcion', width: 'minmax(150px, 1.15fr)', render: (gasto) => <strong>{gasto.descripcion}</strong> },
            { key: 'campania', label: 'Campania', width: 'minmax(88px, 0.6fr)', render: (gasto) => describirCampania(gasto.campaniaErpId) },
            { key: 'actividad', label: 'Actividad', width: 'minmax(130px, 0.95fr)', render: (gasto) => actividadesPropiasPorId.get(gasto.actividadPlanificacionId)?.nombre || gasto.actividadErpId || 'Sin actividad' },
            { key: 'destino', label: 'Destino', width: 'minmax(100px, 0.75fr)', render: (gasto) => gasto.destinoVenta || 'General' },
            { key: 'alcance', label: 'Alcance', width: 'minmax(120px, 0.85fr)', render: (gasto) => describirAlcance(gasto) },
            {
              key: 'items',
              label: 'Items',
              width: 'minmax(110px, 0.75fr)',
              render: (gasto) => {
                const totalPorTonelada = totalPorToneladaUsd(gasto);
                return <span title={resumirItems(gasto)}>{gasto.items.length} item{gasto.items.length === 1 ? '' : 's'}{totalPorTonelada ? ` | ${formatearUsd(totalPorTonelada)}/tn` : ''}</span>;
              },
            },
            { key: 'actualizado', label: 'Actualizado', width: 'minmax(106px, 0.7fr)', render: (gasto) => formatearFecha(gasto.updatedAt || gasto.createdAt) },
            { key: 'estado', label: 'Estado', width: 'minmax(86px, 0.55fr)', render: (gasto) => <em>{gasto.activo ? 'Activo' : 'Inactivo'}</em> },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(86px, 0.5fr)',
              render: (gasto) => <button className="small" onClick={() => abrirEditarGasto(gasto)} disabled={!puedeConfigurarPlanificacion}>Editar</button>,
            },
          ]}
        />
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
                  value={zonaSeleccionadaClave}
                  onChange={(event) => seleccionarZona(event.target.value)}
                >
                  <option value="">Todas las zonas</option>
                  {zonasDisponibles.map((zona) => (
                    <option key={zona.clave} value={zona.clave}>{zona.codigo ? `${zona.codigo} - ` : ''}{zona.nombre} ({zona.origen === 'erp' ? 'ERP' : 'Agro App'})</option>
                  ))}
                </select>
              </label>

              <label>
                Campo
                <select
                  value={campoSeleccionadoClave}
                  onChange={(event) => seleccionarCampo(event.target.value)}
                >
                  <option value="">Todos los campos</option>
                  {camposDisponibles.map((campo) => (
                    <option key={campo.clave} value={campo.clave}>{campo.codigo ? `${campo.codigo} - ` : ''}{campo.nombre} ({campo.origen === 'erp' ? 'ERP' : 'Agro App'})</option>
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
