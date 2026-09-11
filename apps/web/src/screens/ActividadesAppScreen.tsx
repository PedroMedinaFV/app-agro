import { useEffect, useMemo, useState } from 'react';
import type { ActividadApp, ErpActividad, ErpEspecie, EspecieApp, SesionUsuario } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OriginBadge } from '../components/OriginBadge';
import { Panel } from '../components/Panel';
import {
  guardarActividadApp,
  obtenerActividadesErpImportadas,
  obtenerActividadesApp,
  obtenerEspeciesErpImportadas,
  obtenerEspeciesApp,
} from '../services/api';
import { sugerirVinculacion } from '../utils/vinculacionSugerida';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type ActividadesAppScreenProps = {
  sesion: SesionUsuario;
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
};

type EspecieSeleccionable = {
  clave: string;
  nombre: string;
  codigo?: string;
  origen: 'agro' | 'erp';
  especieAppId?: string;
  especieErpId?: string;
  idEspecie?: number;
};

type ActividadTabla = {
  id: string;
  nombre: string;
  detalle: string;
  especie: string;
  tipoGrano: string;
  tipoCultivo: string;
  epocaSiembra: string;
  origen: string;
  estado: string;
  accion: 'editar';
  actividadPropia?: ActividadApp;
  actividadErp?: ErpActividad;
};

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarCodigo(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function formatearAtributoActividad(valor?: string) {
  return valor ? valor.charAt(0).toUpperCase() + valor.slice(1) : 'Sin definir';
}

function crearActividadNueva(clienteId: string, especie?: EspecieSeleccionable): ActividadApp {
  const ahora = new Date().toISOString();

  return {
    id: `actividad-app-${Date.now()}`,
    clienteId,
    empresaErpId: 'global',
    nombre: '',
    codigoInterno: '',
    especieAppId: especie?.especieAppId,
    especieErpId: especie?.especieErpId,
    estadoVinculacion: 'provisorio',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

function crearIdActividadAppDesdeErp(actividad: ErpActividad) {
  return `actividad-app-erp-${actividad.erpId.replace(/[^a-zA-Z0-9]+/g, '-')}`;
}

export function ActividadesAppScreen({ sesion, puedeConfigurarPlanificacion, notificar }: ActividadesAppScreenProps) {
  const [actividadesErp, setActividadesErp] = useState<ErpActividad[]>([]);
  const [especiesErp, setEspeciesErp] = useState<ErpEspecie[]>([]);
  const [actividadesPropias, setActividadesPropias] = useState<ActividadApp[]>([]);
  const [especiesPropias, setEspeciesPropias] = useState<EspecieApp[]>([]);
  const [actividadEnEdicion, setActividadEnEdicion] = useState<ActividadApp | null>(null);
  const [estado, setEstado] = useState('Cargando actividades sincronizadas.');
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [actividadPropiaParaVincular, setActividadPropiaParaVincular] = useState<ActividadApp | null>(null);
  const [actividadErpVincularId, setActividadErpVincularId] = useState('');

  useEffect(() => {
    async function cargarActividades() {
      try {
        const [respuestaActividadesErp, respuestaEspeciesErp, respuestaActividadesPropias, respuestaEspeciesPropias] = await Promise.all([
          obtenerActividadesErpImportadas(sesion.token),
          obtenerEspeciesErpImportadas(sesion.token),
          obtenerActividadesApp(sesion.token),
          obtenerEspeciesApp(sesion.token),
        ]);

        setActividadesErp(respuestaActividadesErp.actividades);
        setEspeciesErp(respuestaEspeciesErp.especies);
        setActividadesPropias(respuestaActividadesPropias.actividades);
        setEspeciesPropias(respuestaEspeciesPropias.especies);
        setEstado('Actividades cargadas desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las actividades.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron actividades', mensaje });
      }
    }

    cargarActividades();
  }, [sesion.token, notificar]);

  const especiesDisponibles = useMemo<EspecieSeleccionable[]>(() => {
    const propias = especiesPropias.map((especie) => ({
      clave: `agro:${especie.id}`,
      nombre: especie.nombre,
      codigo: especie.codigoInterno,
      origen: 'agro' as const,
      especieAppId: especie.id,
      especieErpId: especie.especieErpId,
    }));
    const erp = especiesErp.map((especie) => ({
      clave: `erp:${especie.erpId}`,
      nombre: especie.nombre,
      codigo: especie.codigo,
      origen: 'erp' as const,
      especieErpId: especie.erpId,
      idEspecie: especie.idEspecie,
    }));

    return [...propias, ...erp].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [especiesErp, especiesPropias]);

  const especiesPorClave = useMemo(() => new Map(especiesDisponibles.map((especie) => [especie.clave, especie])), [especiesDisponibles]);
  const especiesPorErpId = useMemo(() => new Map(especiesErp.map((especie) => [especie.erpId, especie])), [especiesErp]);
  const especiesPorIdNumerico = useMemo(() => new Map(especiesErp.map((especie) => [especie.idEspecie, especie])), [especiesErp]);
  const especiesPropiasPorId = useMemo(() => new Map(especiesPropias.map((especie) => [especie.id, especie])), [especiesPropias]);
  const actividadesPropiasPorErpId = useMemo(() => (
    new Map(actividadesPropias.filter((actividad) => actividad.actividadErpId).map((actividad) => [actividad.actividadErpId, actividad]))
  ), [actividadesPropias]);
  const filtroNormalizado = normalizarCodigo(filtro);
  const actividadesVinculadas = useMemo(() => new Set(actividadesPropias.map((actividad) => actividad.actividadErpId).filter((id): id is string => Boolean(id))), [actividadesPropias]);
  const actividadesErpDisponiblesParaVincular = useMemo(() => {
    if (!actividadPropiaParaVincular) {
      return [];
    }

    return obtenerActividadesErpCompatibles(actividadPropiaParaVincular);
  }, [actividadPropiaParaVincular, actividadesErp, actividadesVinculadas, especiesPropiasPorId]);
  const actividadesErpSugeridasParaVincular = useMemo(() => (
    actividadPropiaParaVincular
      ? sugerirVinculacion(
        { codigo: actividadPropiaParaVincular.codigoInterno, nombre: actividadPropiaParaVincular.nombre },
        actividadesErpDisponiblesParaVincular,
        (registro) => registro.codigo,
        (registro) => registro.descripcion,
      )
      : []
  ), [actividadPropiaParaVincular, actividadesErpDisponiblesParaVincular]);
  const actividadesPropiasFiltradas = actividadesPropias.filter((actividad) => !actividad.actividadErpId).filter((actividad) => {
    const especie = actividad.especieAppId ? especiesPropiasPorId.get(actividad.especieAppId)?.nombre : especiesPorErpId.get(actividad.especieErpId || '')?.nombre;
    return normalizarCodigo(`${actividad.codigoInterno || ''} ${actividad.nombre} ${especie || ''} ${actividad.tipoGrano || ''} ${actividad.tipoCultivo || ''} ${actividad.epocaSiembra || ''}`).includes(filtroNormalizado);
  });
  const actividadesErpFiltradas = actividadesErp.filter((actividad) => {
    const especie = actividad.idEspecie ? especiesPorIdNumerico.get(actividad.idEspecie)?.nombre : '';
    const atributosAgro = actividadesPropiasPorErpId.get(actividad.erpId);

    return normalizarCodigo(`${actividad.codigo} ${actividad.descripcion} ${especie} ${atributosAgro?.tipoGrano || ''} ${atributosAgro?.tipoCultivo || ''} ${atributosAgro?.epocaSiembra || ''}`).includes(filtroNormalizado);
  });
  const codigoActual = actividadEnEdicion ? normalizarCodigo(actividadEnEdicion.codigoInterno || actividadEnEdicion.nombre) : '';
  const existeCodigoDuplicado = Boolean(actividadEnEdicion && codigoActual && actividadesPropias.some((actividad) => (
    actividad.id !== actividadEnEdicion.id && actividad.codigoInterno === codigoActual
  )));
  const filasActividad: ActividadTabla[] = [
    ...actividadesPropiasFiltradas.map((actividad) => ({
      id: actividad.id,
      nombre: actividad.nombre,
      detalle: actividad.codigoInterno || 'Sin codigo interno',
      especie: obtenerNombreEspecie(actividad),
      tipoGrano: formatearAtributoActividad(actividad.tipoGrano),
      tipoCultivo: formatearAtributoActividad(actividad.tipoCultivo),
      epocaSiembra: formatearAtributoActividad(actividad.epocaSiembra),
      origen: 'Agro App',
      estado: actividad.estadoVinculacion === 'provisorio' ? 'Provisoria' : actividad.estadoVinculacion === 'archivado' ? 'Archivada' : 'Vinculada ERP',
      accion: 'editar' as const,
      actividadPropia: actividad,
    })),
    ...actividadesErpFiltradas.map((actividad) => {
      const actividadPropia = actividadesPropiasPorErpId.get(actividad.erpId);

      return {
        id: actividad.erpId,
        nombre: actividad.descripcion,
        detalle: `${actividad.codigo} - ALBOR #${actividad.idActividad}`,
        especie: actividad.idEspecie ? especiesPorIdNumerico.get(actividad.idEspecie)?.nombre || `Especie ${actividad.idEspecie}` : 'Sin especie',
        tipoGrano: formatearAtributoActividad(actividadPropia?.tipoGrano),
        tipoCultivo: formatearAtributoActividad(actividadPropia?.tipoCultivo),
        epocaSiembra: formatearAtributoActividad(actividadPropia?.epocaSiembra),
        origen: 'ERP',
        estado: actividadPropia ? 'Configurada' : 'A completar',
        accion: 'editar' as const,
        actividadPropia,
        actividadErp: actividad,
      };
    }),
  ];

  function obtenerClaveEspecie(actividad: ActividadApp) {
    if (actividad.especieAppId) {
      return `agro:${actividad.especieAppId}`;
    }

    if (actividad.especieErpId) {
      return `erp:${actividad.especieErpId}`;
    }

    return '';
  }

  function obtenerNombreEspecie(actividad: ActividadApp) {
    if (actividad.especieAppId) {
      return especiesPropiasPorId.get(actividad.especieAppId)?.nombre || actividad.especieAppId;
    }

    return especiesPorErpId.get(actividad.especieErpId || '')?.nombre || actividad.especieErpId || 'Sin especie';
  }

  function abrirNuevaActividad() {
    setActividadEnEdicion(crearActividadNueva(sesion.usuario.clienteId || 'cliente-demo', especiesDisponibles[0]));
  }

  function abrirEdicionActividadErp(actividadErp: ErpActividad, actividadPropia?: ActividadApp) {
    const ahora = new Date().toISOString();

    setActividadEnEdicion(actividadPropia || {
      id: crearIdActividadAppDesdeErp(actividadErp),
      clienteId: sesion.usuario.clienteId || 'cliente-demo',
      empresaErpId: 'global',
      actividadErpId: actividadErp.erpId,
      especieErpId: actividadErp.idEspecie ? `especie:${actividadErp.idEspecie}` : undefined,
      nombre: actividadErp.descripcion,
      codigoInterno: normalizarCodigo(actividadErp.codigo || actividadErp.descripcion),
      estadoVinculacion: 'vinculado_erp',
      createdAt: ahora,
      updatedAt: ahora,
    });
  }

  function actualizarBorrador(cambios: Partial<ActividadApp>) {
    setActividadEnEdicion((actual) => actual && { ...actual, ...cambios, updatedAt: new Date().toISOString() });
  }

  function seleccionarEspecie(clave: string) {
    const especie = clave ? especiesPorClave.get(clave) : undefined;

    actualizarBorrador({
      especieAppId: especie?.especieAppId,
      especieErpId: especie?.especieErpId,
    });
  }

  async function guardarActividad() {
    if (!actividadEnEdicion || !puedeConfigurarPlanificacion) {
      return;
    }

    const nombre = limpiarTextoVisible(actividadEnEdicion.nombre);
    const actividadPreparada: ActividadApp = {
      ...actividadEnEdicion,
      empresaErpId: 'global',
      nombre,
      codigoInterno: normalizarCodigo(actividadEnEdicion.codigoInterno || nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const respuesta = await guardarActividadApp(actividadPreparada.id, {
        actividad: actividadPreparada,
        origen: 'web',
        motivo: actividadPreparada.actividadErpId
          ? 'Edicion de atributos Agro App de actividad ERP'
          : 'Alta o edicion de actividad desde padron maestro web',
      }, sesion.token);

      setActividadesPropias((actuales) => {
        const existe = actuales.some((actividad) => actividad.id === respuesta.actividad.id);
        return existe
          ? actuales.map((actividad) => (actividad.id === respuesta.actividad.id ? respuesta.actividad : actividad))
          : [respuesta.actividad, ...actuales];
      });
      setActividadEnEdicion(null);
      setEstado('Actividad guardada con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Actividad guardada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la actividad.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo la actividad', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  function obtenerActividadesErpCompatibles(actividadPropia: ActividadApp) {
    const especiePropia = actividadPropia.especieAppId
      ? especiesPropiasPorId.get(actividadPropia.especieAppId)
      : undefined;
    const especieErpEsperada = actividadPropia.especieErpId || especiePropia?.especieErpId;
    const idEspecieEsperada = obtenerIdEspecieDesdeErpId(especieErpEsperada);

    return actividadesErp
      .filter((actividad) => !actividadesVinculadas.has(actividad.erpId))
      .filter((actividad) => !idEspecieEsperada || actividad.idEspecie === idEspecieEsperada)
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'));
  }

  function obtenerIdEspecieDesdeErpId(especieErpId?: string) {
    const match = especieErpId?.match(/especie:(\d+)$/);

    return match ? Number(match[1]) : undefined;
  }

  function abrirVinculacion(actividad: ActividadApp) {
    const candidatos = sugerirVinculacion(
      { codigo: actividad.codigoInterno, nombre: actividad.nombre },
      obtenerActividadesErpCompatibles(actividad),
      (registro) => registro.codigo,
      (registro) => registro.descripcion,
    );

    if (actividad.estadoVinculacion !== 'provisorio' || actividad.actividadErpId) {
      notificar?.({ tipo: 'info', titulo: 'Actividad no vinculable', mensaje: 'Solo se pueden vincular actividades propias en estado provisorio.' });
      return;
    }

    if (!candidatos.length) {
      notificar?.({ tipo: 'info', titulo: 'No hay actividad ERP compatible', mensaje: 'No se encontro una actividad ERP disponible para vincular con esta actividad provisoria.' });
      return;
    }

    setActividadPropiaParaVincular(actividad);
    setActividadErpVincularId(candidatos[0].registro.erpId);
  }

  async function confirmarVinculacionActividad() {
    if (!actividadPropiaParaVincular || !actividadErpVincularId) {
      return;
    }

    const actividadErp = actividadesErp.find((actividad) => actividad.erpId === actividadErpVincularId);

    if (!actividadErp) {
      notificar?.({ tipo: 'error', titulo: 'No se encontro la actividad ERP', mensaje: 'Actualiza la pantalla e intenta nuevamente.' });
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await guardarActividadApp(actividadPropiaParaVincular.id, {
        actividad: {
          ...actividadPropiaParaVincular,
          empresaErpId: 'global',
          actividadErpId: actividadErp.erpId,
          especieErpId: actividadErp.idEspecie ? `especie:${actividadErp.idEspecie}` : actividadPropiaParaVincular.especieErpId,
          estadoVinculacion: 'vinculado_erp',
          updatedAt: new Date().toISOString(),
        },
        origen: 'web',
        motivo: `Vinculacion manual con actividad ERP ${actividadErp.erpId}`,
      }, sesion.token);

      setActividadesPropias((actuales) => actuales.map((actividad) => (actividad.id === respuesta.actividad.id ? respuesta.actividad : actividad)));
      setActividadPropiaParaVincular(null);
      setActividadErpVincularId('');
      setEstado('Actividad vinculada con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Actividad vinculada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular la actividad.';
      notificar?.({ tipo: 'error', titulo: 'No se vinculo la actividad', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="planning-stack">
      <section className="metrics">
        <article><span>ERP sincronizadas</span><strong>{actividadesErp.length}</strong></article>
        <article><span>Propias Agro App</span><strong>{actividadesPropias.length}</strong></article>
        <article><span>Provisorias</span><strong>{actividadesPropias.filter((actividad) => actividad.estadoVinculacion === 'provisorio').length}</strong></article>
        <article><span>Vinculadas</span><strong>{actividadesPropias.filter((actividad) => actividad.estadoVinculacion === 'vinculado_erp').length}</strong></article>
      </section>

      <Panel
        title="Actividades"
        description={estado}
        actions={(
          <ActionBar align="end">
            <label className="compact-field">
              Buscar
              <input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Codigo, nombre o especie" />
            </label>
            <Button variant="primary" disabled={!puedeConfigurarPlanificacion || !especiesDisponibles.length} onClick={abrirNuevaActividad}>
              Nueva actividad
            </Button>
          </ActionBar>
        )}
      >

        {!especiesDisponibles.length && (
          <p className="form-error">Para crear actividades primero debe existir al menos una especie ERP o una especie propia de Agro App.</p>
        )}

        <div className="dense-data-table">
          <DataTable
            rows={filasActividad}
            getRowKey={(fila) => fila.id}
            emptyMessage="Todavia no hay actividades para el filtro seleccionado."
            columns={[
              { key: 'actividad', label: 'Actividad', width: 'minmax(150px, 1.35fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
              { key: 'especie', label: 'Especie', width: 'minmax(110px, 0.9fr)', render: (fila) => fila.especie },
              { key: 'tipoGrano', label: 'Grano', width: 'minmax(72px, 0.5fr)', render: (fila) => fila.tipoGrano },
              { key: 'tipoCultivo', label: 'Cultivo', width: 'minmax(74px, 0.5fr)', render: (fila) => fila.tipoCultivo },
              { key: 'epocaSiembra', label: 'Epoca', width: 'minmax(74px, 0.5fr)', render: (fila) => fila.epocaSiembra },
              { key: 'origen', label: 'Origen', width: 'minmax(76px, 0.45fr)', render: (fila) => <OriginBadge origen={fila.origen} /> },
              { key: 'estado', label: 'Estado', width: 'minmax(94px, 0.55fr)', render: (fila) => <em>{fila.estado}</em> },
              {
                key: 'accion',
                label: '',
                width: 'minmax(58px, 0.35fr)',
                render: (fila) => fila.accion === 'editar'
                  ? (
                    <div className="table-icon-actions">
                      <IconButton
                        icon="edit"
                        label={fila.actividadErp ? `Editar atributos ${fila.nombre}` : `Editar actividad ${fila.nombre}`}
                        disabled={!puedeConfigurarPlanificacion}
                        onClick={() => fila.actividadErp ? abrirEdicionActividadErp(fila.actividadErp, fila.actividadPropia) : fila.actividadPropia && setActividadEnEdicion(fila.actividadPropia)}
                      />
                      {fila.actividadPropia?.estadoVinculacion === 'provisorio' && !fila.actividadPropia.actividadErpId && (
                        <IconButton icon="link" label={`Vincular actividad ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.actividadPropia && abrirVinculacion(fila.actividadPropia)} />
                      )}
                    </div>
                  )
                  : null,
              },
            ]}
          />
        </div>
      </Panel>

      {actividadEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="actividad-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="actividad-modal-title">{actividadesPropias.some((actividad) => actividad.id === actividadEnEdicion.id) ? 'Editar actividad' : 'Nueva actividad'}</h2>
              </div>
              <Button variant="small" onClick={() => setActividadEnEdicion(null)}>Cerrar</Button>
            </div>
            <div className="reference-modal-grid">
              <label>Codigo interno<input value={actividadEnEdicion.codigoInterno || ''} disabled={Boolean(actividadEnEdicion.actividadErpId)} onChange={(event) => actualizarBorrador({ codigoInterno: event.target.value })} placeholder="Se normaliza en mayusculas" /></label>
              <label>Estado<select value={actividadEnEdicion.estadoVinculacion} disabled={Boolean(actividadEnEdicion.actividadErpId)} onChange={(event) => actualizarBorrador({ estadoVinculacion: event.target.value as ActividadApp['estadoVinculacion'] })}><option value="provisorio">Provisoria</option><option value="vinculado_erp">Vinculada ERP</option><option value="archivado">Archivada</option></select></label>
              <label className="reference-wide">Nombre<input value={actividadEnEdicion.nombre} disabled={Boolean(actividadEnEdicion.actividadErpId)} onChange={(event) => actualizarBorrador({ nombre: event.target.value })} placeholder="Nombre de la actividad" /></label>
              <label className="reference-wide">Especie<select value={obtenerClaveEspecie(actividadEnEdicion)} disabled={Boolean(actividadEnEdicion.actividadErpId)} onChange={(event) => seleccionarEspecie(event.target.value)}><option value="">Seleccionar especie</option>{especiesDisponibles.map((especie) => <option key={especie.clave} value={especie.clave}>{especie.codigo ? `${especie.codigo} - ` : ''}{especie.nombre} ({especie.origen === 'erp' ? 'ERP' : 'Agro App'})</option>)}</select></label>
              <label>Tipo de grano<select value={actividadEnEdicion.tipoGrano || ''} onChange={(event) => actualizarBorrador({ tipoGrano: event.target.value as ActividadApp['tipoGrano'] || undefined })}><option value="">Sin definir</option><option value="fina">Fina</option><option value="gruesa">Gruesa</option></select></label>
              <label>Tipo de cultivo<select value={actividadEnEdicion.tipoCultivo || ''} onChange={(event) => actualizarBorrador({ tipoCultivo: event.target.value as ActividadApp['tipoCultivo'] || undefined })}><option value="">Sin definir</option><option value="primera">Primera</option><option value="segunda">Segunda</option></select></label>
              <label>Epoca de siembra<select value={actividadEnEdicion.epocaSiembra || ''} onChange={(event) => actualizarBorrador({ epocaSiembra: event.target.value as ActividadApp['epocaSiembra'] || undefined })}><option value="">Sin definir</option><option value="invierno">Invierno</option><option value="verano">Verano</option></select></label>
            </div>
            {existeCodigoDuplicado && <p className="form-error">Ya existe una actividad propia con ese codigo interno.</p>}
            <div className="modal-actions">
              <span className="hint">{actividadEnEdicion.actividadErpId ? 'Solo se editan atributos propios de Agro App; el nombre y la especie vienen del ERP.' : 'La actividad queda asociada a una especie y disponible para planificacion, precios, gastos y protocolos.'}</span>
              <Button variant="primary" disabled={guardando || !actividadEnEdicion.nombre.trim() || !obtenerClaveEspecie(actividadEnEdicion) || existeCodigoDuplicado} onClick={guardarActividad}>
                <span className="button-content">{guardando && <LoadingSpinner label="Guardando actividad" />}{guardando ? 'Guardando...' : 'Guardar'}</span>
              </Button>
            </div>
          </section>
        </div>
      )}

      {actividadPropiaParaVincular && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vincular-actividad-title">
            <div className="modal-header">
              <div>
                <h2 id="vincular-actividad-title">Vincular actividad provisoria</h2>
                <p className="hint">La actividad propia quedara enlazada a ALBOR y dejara de mostrarse como fila independiente.</p>
              </div>
              <Button variant="ghost" onClick={() => { setActividadPropiaParaVincular(null); setActividadErpVincularId(''); }}>Cerrar</Button>
            </div>
            <div className="reference-modal-grid">
              <div className="reference-total">
                <span>Actividad provisoria</span>
                <strong>{actividadPropiaParaVincular.nombre}</strong>
                <span>{obtenerNombreEspecie(actividadPropiaParaVincular)}</span>
              </div>
              <label className="reference-wide">
                Actividad ERP disponible
                <select value={actividadErpVincularId} onChange={(event) => setActividadErpVincularId(event.target.value)}>
                  {actividadesErpSugeridasParaVincular.map(({ registro, motivo }) => (
                    <option key={registro.erpId} value={registro.erpId}>
                      {registro.codigo} - {registro.descripcion} ({registro.idEspecie ? especiesPorIdNumerico.get(registro.idEspecie)?.nombre || `Especie ${registro.idEspecie}` : 'Sin especie'}; {motivo})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <span className="hint">El backend valida que la actividad ERP exista, respete la especie y no este vinculada a otra actividad del cliente.</span>
              <Button variant="primary" disabled={guardando || !actividadErpVincularId} onClick={confirmarVinculacionActividad}>
                <span className="button-content">{guardando && <span className="loading-spinner" />}Vincular</span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
