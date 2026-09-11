import { useEffect, useMemo, useState } from 'react';
import {
  ActividadApp,
  ErpActividad,
  ErpCampania,
  ErpCampo,
  ErpEspecie,
  ErpPuerto,
  ErpZona,
  GastoComercialItemReferencia,
  GastosComercialesReferencia,
  PlanificacionSnapshot,
  SesionUsuario,
} from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import {
  guardarActividadApp,
  obtenerActividadesErpImportadas,
  obtenerActividadesApp,
  obtenerCampaniasErpImportadas,
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
  actividadAppId?: string;
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
  zonaAppId?: string;
  zonaErpId?: string;
  idZona?: number;
  origen: 'agro' | 'erp';
};

type CampoSeleccionable = {
  clave: string;
  nombre: string;
  codigo?: string;
  empresaErpId: string;
  campoAppId?: string;
  campoErpId?: string;
  zonaAppId?: string;
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
  const [actividadesPropiasDb, setActividadesPropiasDb] = useState<ActividadApp[]>([]);
  const [actividadesErp, setActividadesErp] = useState<ErpActividad[]>([]);
  const [campaniasErp, setCampaniasErp] = useState<ErpCampania[]>([]);
  const [especiesErp, setEspeciesErp] = useState<ErpEspecie[]>([]);
  const [zonasErp, setZonasErp] = useState<ErpZona[]>([]);
  const [camposErp, setCamposErp] = useState<ErpCampo[]>([]);
  const [puertosErp, setPuertosErp] = useState<ErpPuerto[]>([]);
  const actividadesPropias = actividadesPropiasDb.length ? actividadesPropiasDb : planificacion.actividadesApp || [];
  const zonas = planificacion.zonasApp || [];
  const campos = planificacion.camposApp;
  const conceptosGastos = planificacion.conceptosGastosComerciales.filter((concepto) => concepto.activo);
  const campaniasDisponibles = campaniasErp.length ? campaniasErp : campanias;
  const planificacionActiva = planificacion.planificaciones[0];
  const especiesErpPorId = useMemo(() => new Map(especiesErp.map((especie) => [especie.idEspecie, especie])), [especiesErp]);
  const actividadesPropiasErpIds = new Set(actividadesPropias.map((actividad) => actividad.actividadErpId).filter(Boolean));
  const actividades = useMemo<ActividadSeleccionable[]>(() => {
    const propias = actividadesPropias.map((actividad) => ({
      clave: `agro:${actividad.id}`,
      nombre: actividad.nombre,
      empresaErpId: actividad.empresaErpId,
      actividadAppId: actividad.id,
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
  const zonasPropiasErpIds = useMemo(() => new Set(zonas.map((zona) => zona.zonaErpId).filter(Boolean)), [zonas]);
  const zonasPropiasPorErpId = useMemo(() => new Map(zonas.filter((zona) => zona.zonaErpId).map((zona) => [zona.zonaErpId, zona])), [zonas]);
  const camposPropiosErpIds = useMemo(() => new Set(campos.map((campo) => campo.campoErpId).filter(Boolean)), [campos]);
  const camposPropiosPorErpId = useMemo(() => new Map(campos.filter((campo) => campo.campoErpId).map((campo) => [campo.campoErpId, campo])), [campos]);
  const zonasDisponibles = useMemo<ZonaSeleccionable[]>(() => {
    const propias = zonas.map((zona) => ({
      clave: `agro:${zona.id}`,
      nombre: zona.nombre,
      codigo: zona.codigoInterno,
      zonaAppId: zona.id,
      zonaErpId: zona.zonaErpId,
      origen: 'agro' as const,
    }));
    const erp = zonasErp
      .filter((zona) => !zonasPropiasErpIds.has(zona.erpId))
      .map((zona) => ({
        clave: `erp:${zona.erpId}`,
        nombre: zona.nombre,
        codigo: zona.codigo,
        zonaErpId: zona.erpId,
        idZona: zona.idZona,
        origen: 'erp' as const,
      }));

    return [...propias, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [zonas, zonasErp, zonasPropiasErpIds]);
  const zonasPorClave = useMemo(() => new Map(zonasDisponibles.map((zona) => [zona.clave, zona])), [zonasDisponibles]);
  const camposDisponibles = useMemo<CampoSeleccionable[]>(() => {
    const zonaSeleccionada = zonaSeleccionadaClave ? zonasPorClave.get(zonaSeleccionadaClave) : undefined;
    const propios = campos
      .filter((campo) => !zonaSeleccionada || campo.zonaAppId === zonaSeleccionada.zonaAppId || campo.zonaErpId === zonaSeleccionada.zonaErpId)
      .map((campo) => ({
        clave: `agro:${campo.id}`,
        nombre: campo.nombre,
        codigo: campo.codigoInterno,
        empresaErpId: campo.empresaErpId,
        campoAppId: campo.id,
        campoErpId: campo.campoErpId,
        zonaAppId: campo.zonaAppId,
        zonaErpId: campo.zonaErpId,
        origen: 'agro' as const,
      }));
    const erp = camposErp
      .filter((campo) => !camposPropiosErpIds.has(campo.erpId))
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
  }, [campos, camposErp, camposPropiosErpIds, zonaSeleccionadaClave, zonasPorClave]);
  const camposPorClave = useMemo(() => new Map(camposDisponibles.map((campo) => [campo.clave, campo])), [camposDisponibles]);

  useEffect(() => {
    async function cargarPadronesReales() {
      const [actividadesPropiasRespuesta, actividadesErpRespuesta, campaniasErpRespuesta, especiesErpRespuesta, zonasErpRespuesta, camposErpRespuesta, puertosErpRespuesta] = await Promise.all([
        obtenerActividadesApp(sesion.token),
        obtenerActividadesErpImportadas(sesion.token),
        obtenerCampaniasErpImportadas(sesion.token),
        obtenerEspeciesErpImportadas(sesion.token),
        obtenerZonasErpImportadas(sesion.token),
        obtenerCamposErpImportados(sesion.token),
        obtenerPuertosErpImportados(sesion.token),
      ]);

      setActividadesPropiasDb(actividadesPropiasRespuesta.actividades);
      setActividadesErp(actividadesErpRespuesta.actividades);
      setCampaniasErp(campaniasErpRespuesta.campanias);
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
    const concepto = conceptosGastos[0];

    return {
      conceptoGastoComercialId: concepto?.id || '',
      conceptoNombre: concepto?.nombre || '',
      valorPorTonelada: 0,
      unidadCalculo: concepto?.unidadCalculo || 'Tn',
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
      campaniaErpId: planificacionActiva?.campaniaErpId || campaniasDisponibles.find((campania) => campania.esActual)?.erpId || campaniasDisponibles[0]?.erpId || '',
      empresaErpId: actividad?.empresaErpId || planificacion.camposApp[0]?.empresaErpId || 'global',
      actividadAppId: actividad?.actividadAppId || '',
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
    const zonaPropiaVinculada = gasto.zonaErpId ? zonasPropiasPorErpId.get(gasto.zonaErpId) : undefined;
    const campoPropioVinculado = gasto.campoErpId ? camposPropiosPorErpId.get(gasto.campoErpId) : undefined;

    setModoModal('editar');
    setCreandoDestino(false);
    setActividadSeleccionadaClave(`agro:${gasto.actividadAppId}`);
    setZonaSeleccionadaClave(gasto.zonaAppId ? `agro:${gasto.zonaAppId}` : zonaPropiaVinculada ? `agro:${zonaPropiaVinculada.id}` : gasto.zonaErpId ? `erp:${gasto.zonaErpId}` : '');
    setCampoSeleccionadoClave(gasto.campoAppId ? `agro:${gasto.campoAppId}` : campoPropioVinculado ? `agro:${campoPropioVinculado.id}` : gasto.campoErpId ? `erp:${gasto.campoErpId}` : '');
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

    const gastoPreparado = await asegurarActividadApp(gastoEnEdicion);
    const guardado = await guardarGastoComercial(gastoPreparado);

    if (guardado) {
      setGastoEnEdicion(null);
    }
  }

  function crearIdActividadDesdeErp(actividadErpId: string) {
    return `actividad-app-${actividadErpId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
  }

  async function asegurarActividadApp(gasto: GastosComercialesReferencia): Promise<GastosComercialesReferencia> {
    if (gasto.actividadAppId) {
      return gasto;
    }

    const actividad = actividadesPorClave.get(actividadSeleccionadaClave);

    if (!actividad?.erp) {
      return gasto;
    }

    const ahora = new Date().toISOString();
    const actividadPreparada: ActividadApp = {
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
    const respuesta = await guardarActividadApp(actividadPreparada.id, {
      actividad: actividadPreparada,
      origen: 'web',
      motivo: 'Creacion automatica de actividad operativa vinculada desde gastos comerciales',
    }, sesion.token);

    setActividadesPropiasDb((actuales) => [respuesta.actividad, ...actuales]);
    setActividadSeleccionadaClave(`agro:${respuesta.actividad.id}`);

    return {
      ...gasto,
      empresaErpId: respuesta.actividad.empresaErpId,
      actividadAppId: respuesta.actividad.id,
      actividadErpId: respuesta.actividad.actividadErpId,
    };
  }

  function seleccionarActividad(clave: string) {
    const actividadSeleccionada = actividadesPorClave.get(clave);

    setActividadSeleccionadaClave(clave);
    actualizarBorrador({
      actividadAppId: actividadSeleccionada?.actividadAppId || '',
      empresaErpId: actividadSeleccionada?.empresaErpId || gastoEnEdicion?.empresaErpId,
      actividadErpId: actividadSeleccionada?.actividadErpId,
    });
  }

  function seleccionarZona(clave: string) {
    const zonaSeleccionada = clave ? zonasPorClave.get(clave) : undefined;

    setZonaSeleccionadaClave(clave);
    setCampoSeleccionadoClave('');
    actualizarBorrador({
      zonaAppId: zonaSeleccionada?.zonaAppId,
      zonaErpId: zonaSeleccionada?.zonaErpId,
      campoAppId: undefined,
      campoErpId: undefined,
    });
  }

  function seleccionarCampo(clave: string) {
    const campoSeleccionado = clave ? camposPorClave.get(clave) : undefined;
    const zonaClave = campoSeleccionado?.zonaAppId
      ? `agro:${campoSeleccionado.zonaAppId}`
      : campoSeleccionado?.zonaErpId
        ? `erp:${campoSeleccionado.zonaErpId}`
        : zonaSeleccionadaClave;

    setCampoSeleccionadoClave(clave);
    setZonaSeleccionadaClave(zonaClave);
    actualizarBorrador({
      zonaAppId: campoSeleccionado?.zonaAppId || gastoEnEdicion?.zonaAppId,
      zonaErpId: campoSeleccionado?.zonaErpId || gastoEnEdicion?.zonaErpId,
      campoAppId: campoSeleccionado?.campoAppId,
      campoErpId: campoSeleccionado?.campoErpId,
      empresaErpId: campoSeleccionado?.empresaErpId || gastoEnEdicion?.empresaErpId,
    });
  }

  function describirAlcance(gasto: GastosComercialesReferencia) {
    const campo = gasto.campoAppId ? campos.find((item) => item.id === gasto.campoAppId) : undefined;
    const zona = gasto.zonaAppId ? zonas.find((item) => item.id === gasto.zonaAppId) : undefined;

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
    const campania = campaniasDisponibles.find((item) => item.erpId === campaniaErpId);

    return campania?.nombre || campania?.codigo || campaniaErpId || 'Sin campania';
  }

  function describirUnidadItem(item: GastoComercialItemReferencia) {
    return `${item.moneda}/${item.unidadCalculo || 'Tn'}`;
  }

  function resumirItems(gasto: GastosComercialesReferencia) {
    return gasto.items.map((item) => `${item.conceptoNombre || 'Sin concepto'}: ${item.valorPorTonelada} ${describirUnidadItem(item)}`).join(' | ');
  }

  function totalPorToneladaUsd(gasto: GastosComercialesReferencia) {
    return gasto.items
      .filter((item) => item.moneda === 'USD' && (item.unidadCalculo || 'Tn') === 'Tn')
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
    || gastoEnEdicion.items.some((item) => !item.conceptoGastoComercialId.trim() || !item.conceptoNombre.trim() || item.valorPorTonelada < 0 || !item.moneda.trim() || !item.unidadCalculo);

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Referencias comerciales"
        title="Gastos comerciales"
        description="Tabla editable para definir fletes, acondicionamiento, comisiones y otros gastos por tonelada sugeridos por actividad, destino y alcance."
        aside={<div className="status-pill">{planificacion.gastosComercialesReferencia.length}</div>}
      />

      <Panel
        title="Gastos registrados"
        description="Estos valores se proponen en la planilla y se copian a cada linea para conservar el supuesto original."
        actions={(
          <ActionBar align="end">
            <Button variant="small" onClick={abrirNuevoGasto} disabled={!puedeConfigurarPlanificacion}>
              Nuevo gasto
            </Button>
          </ActionBar>
        )}
      >
        <DataTable
          rows={planificacion.gastosComercialesReferencia}
          getRowKey={(gasto) => gasto.id}
          emptyMessage="Todavia no hay gastos comerciales registrados."
          columns={[
            { key: 'descripcion', label: 'Descripcion', width: 'minmax(120px, 1fr)', render: (gasto) => <strong>{gasto.descripcion}</strong> },
            { key: 'campania', label: 'Campania', width: 'minmax(78px, 0.55fr)', render: (gasto) => describirCampania(gasto.campaniaErpId) },
            { key: 'actividad', label: 'Actividad', width: 'minmax(110px, 0.8fr)', render: (gasto) => actividadesPropiasPorId.get(gasto.actividadAppId)?.nombre || gasto.actividadErpId || 'Sin actividad' },
            { key: 'destino', label: 'Destino', width: 'minmax(86px, 0.65fr)', render: (gasto) => gasto.destinoVenta || 'General' },
            { key: 'alcance', label: 'Alcance', width: 'minmax(96px, 0.7fr)', render: (gasto) => describirAlcance(gasto) },
            {
              key: 'items',
              label: 'Items',
              width: 'minmax(96px, 0.65fr)',
              render: (gasto) => {
                const totalPorTonelada = totalPorToneladaUsd(gasto);
                return <span title={resumirItems(gasto)}>{gasto.items.length} item{gasto.items.length === 1 ? '' : 's'}{totalPorTonelada ? ` | ${formatearUsd(totalPorTonelada)}/tn` : ''}</span>;
              },
            },
            { key: 'actualizado', label: 'Actualizado', width: 'minmax(92px, 0.58fr)', render: (gasto) => formatearFecha(gasto.updatedAt || gasto.createdAt) },
            { key: 'estado', label: 'Estado', width: 'minmax(76px, 0.46fr)', render: (gasto) => <em>{gasto.activo ? 'Activo' : 'Inactivo'}</em> },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(76px, 0.44fr)',
              render: (gasto) => (
                <div className="table-icon-actions">
                  <IconButton icon="edit" label={`Editar gasto ${gasto.descripcion}`} onClick={() => abrirEditarGasto(gasto)} disabled={!puedeConfigurarPlanificacion} />
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {gastoEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel modal-panel-wide" role="dialog" aria-modal="true" aria-labelledby="gastos-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Gasto comercial</p>
                <h2 id="gastos-modal-title">{modoModal === 'crear' ? 'Nuevo gasto' : 'Editar gasto'}</h2>
              </div>
              <Button variant="small" onClick={() => { setCreandoDestino(false); setGastoEnEdicion(null); }}>Cerrar</Button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Campania
                <select
                  value={gastoEnEdicion.campaniaErpId}
                  onChange={(event) => actualizarBorrador({ campaniaErpId: event.target.value })}
                >
                  <option value="">Seleccionar campania</option>
                  {campaniasDisponibles.map((item) => (
                    <option key={item.erpId} value={item.erpId}>{item.nombre || item.codigo}{item.esActual ? ' (actual)' : ''}</option>
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
                <Button variant="small" onClick={agregarItem} disabled={!conceptosGastos.length}>Agregar item</Button>
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
                          unidadCalculo: conceptoSeleccionado?.unidadCalculo || 'Tn',
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
                    Valor
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valorPorTonelada}
                      onChange={(event) => actualizarItem(indice, { valorPorTonelada: leerNumero(event.target.value) })}
                    />
                  </label>
                  <label>
                    Unidad
                    <input value={item.unidadCalculo || 'Tn'} readOnly />
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
                  <Button variant="danger" onClick={() => quitarItem(indice)} disabled={gastoEnEdicion.items.length === 1}>
                    Quitar
                  </Button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <Button variant="small" onClick={() => { setCreandoDestino(false); setGastoEnEdicion(null); }}>Cancelar</Button>
              <Button variant="primary" onClick={aplicarModal} disabled={guardandoGastos || modalInvalido}>
                <span className="button-content">
                  {guardandoGastos && <LoadingSpinner label="Guardando gastos" />}
                  {guardandoGastos ? 'Guardando...' : modoModal === 'crear' ? 'Guardar' : 'Editar'}
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
