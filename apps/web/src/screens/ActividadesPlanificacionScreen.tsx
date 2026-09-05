import { useEffect, useMemo, useState } from 'react';
import type { ActividadPlanificacion, ErpActividad, ErpEspecie, EspeciePlanificacion, SesionUsuario } from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  guardarActividadPlanificacion,
  obtenerActividadesErpImportadas,
  obtenerActividadesPlanificacion,
  obtenerEspeciesErpImportadas,
  obtenerEspeciesPlanificacion,
} from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type ActividadesPlanificacionScreenProps = {
  sesion: SesionUsuario;
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
};

type EspecieSeleccionable = {
  clave: string;
  nombre: string;
  codigo?: string;
  origen: 'agro' | 'erp';
  especiePlanificacionId?: string;
  especieErpId?: string;
  idEspecie?: number;
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

function crearActividadNueva(clienteId: string, especie?: EspecieSeleccionable): ActividadPlanificacion {
  const ahora = new Date().toISOString();

  return {
    id: `actividad-planificacion-${Date.now()}`,
    clienteId,
    empresaErpId: 'global',
    nombre: '',
    codigoInterno: '',
    especiePlanificacionId: especie?.especiePlanificacionId,
    especieErpId: especie?.especieErpId,
    estadoVinculacion: 'provisorio',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

export function ActividadesPlanificacionScreen({ sesion, puedeConfigurarPlanificacion, notificar }: ActividadesPlanificacionScreenProps) {
  const [actividadesErp, setActividadesErp] = useState<ErpActividad[]>([]);
  const [especiesErp, setEspeciesErp] = useState<ErpEspecie[]>([]);
  const [actividadesPropias, setActividadesPropias] = useState<ActividadPlanificacion[]>([]);
  const [especiesPropias, setEspeciesPropias] = useState<EspeciePlanificacion[]>([]);
  const [actividadEnEdicion, setActividadEnEdicion] = useState<ActividadPlanificacion | null>(null);
  const [estado, setEstado] = useState('Cargando actividades sincronizadas.');
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    async function cargarActividades() {
      try {
        const [respuestaActividadesErp, respuestaEspeciesErp, respuestaActividadesPropias, respuestaEspeciesPropias] = await Promise.all([
          obtenerActividadesErpImportadas(sesion.token),
          obtenerEspeciesErpImportadas(sesion.token),
          obtenerActividadesPlanificacion(sesion.token),
          obtenerEspeciesPlanificacion(sesion.token),
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
      especiePlanificacionId: especie.id,
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
  const filtroNormalizado = normalizarCodigo(filtro);
  const actividadesVinculadas = useMemo(() => new Set(actividadesPropias.map((actividad) => actividad.actividadErpId).filter(Boolean)), [actividadesPropias]);
  const actividadesPropiasFiltradas = actividadesPropias.filter((actividad) => {
    const especie = actividad.especiePlanificacionId ? especiesPropiasPorId.get(actividad.especiePlanificacionId)?.nombre : especiesPorErpId.get(actividad.especieErpId || '')?.nombre;
    return normalizarCodigo(`${actividad.codigoInterno || ''} ${actividad.nombre} ${especie || ''}`).includes(filtroNormalizado);
  });
  const actividadesErpFiltradas = actividadesErp.filter((actividad) => {
    const especie = actividad.idEspecie ? especiesPorIdNumerico.get(actividad.idEspecie)?.nombre : '';
    return normalizarCodigo(`${actividad.codigo} ${actividad.descripcion} ${especie}`).includes(filtroNormalizado);
  });
  const codigoActual = actividadEnEdicion ? normalizarCodigo(actividadEnEdicion.codigoInterno || actividadEnEdicion.nombre) : '';
  const existeCodigoDuplicado = Boolean(actividadEnEdicion && codigoActual && actividadesPropias.some((actividad) => (
    actividad.id !== actividadEnEdicion.id && actividad.codigoInterno === codigoActual
  )));

  function obtenerClaveEspecie(actividad: ActividadPlanificacion) {
    if (actividad.especiePlanificacionId) {
      return `agro:${actividad.especiePlanificacionId}`;
    }

    if (actividad.especieErpId) {
      return `erp:${actividad.especieErpId}`;
    }

    return '';
  }

  function obtenerNombreEspecie(actividad: ActividadPlanificacion) {
    if (actividad.especiePlanificacionId) {
      return especiesPropiasPorId.get(actividad.especiePlanificacionId)?.nombre || actividad.especiePlanificacionId;
    }

    return especiesPorErpId.get(actividad.especieErpId || '')?.nombre || actividad.especieErpId || 'Sin especie';
  }

  function abrirNuevaActividad() {
    setActividadEnEdicion(crearActividadNueva(sesion.usuario.clienteId || 'cliente-demo', especiesDisponibles[0]));
  }

  function actualizarBorrador(cambios: Partial<ActividadPlanificacion>) {
    setActividadEnEdicion((actual) => actual && { ...actual, ...cambios, updatedAt: new Date().toISOString() });
  }

  function seleccionarEspecie(clave: string) {
    const especie = clave ? especiesPorClave.get(clave) : undefined;

    actualizarBorrador({
      especiePlanificacionId: especie?.especiePlanificacionId,
      especieErpId: especie?.especieErpId,
    });
  }

  async function guardarActividad() {
    if (!actividadEnEdicion || !puedeConfigurarPlanificacion) {
      return;
    }

    const nombre = limpiarTextoVisible(actividadEnEdicion.nombre);
    const actividadPreparada: ActividadPlanificacion = {
      ...actividadEnEdicion,
      empresaErpId: 'global',
      nombre,
      codigoInterno: normalizarCodigo(actividadEnEdicion.codigoInterno || nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const respuesta = await guardarActividadPlanificacion(actividadPreparada.id, {
        actividad: actividadPreparada,
        origen: 'web',
        motivo: 'Alta o edicion de actividad desde padron maestro web',
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

  return (
    <div className="planning-stack">
      <section className="metrics">
        <article><span>ERP sincronizadas</span><strong>{actividadesErp.length}</strong></article>
        <article><span>Propias Agro App</span><strong>{actividadesPropias.length}</strong></article>
        <article><span>Provisorias</span><strong>{actividadesPropias.filter((actividad) => actividad.estadoVinculacion === 'provisorio').length}</strong></article>
        <article><span>Vinculadas</span><strong>{actividadesPropias.filter((actividad) => actividad.estadoVinculacion === 'vinculado_erp').length}</strong></article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Actividades</h2>
            <p className="hint">{estado}</p>
          </div>
          <div className="button-row">
            <label className="compact-field">
              Buscar
              <input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Codigo, nombre o especie" />
            </label>
            <button className="primary" type="button" disabled={!puedeConfigurarPlanificacion || !especiesDisponibles.length} onClick={abrirNuevaActividad}>
              Nueva actividad
            </button>
          </div>
        </div>

        {!especiesDisponibles.length && (
          <p className="form-error">Para crear actividades primero debe existir al menos una especie ERP o una especie propia de Agro App.</p>
        )}

        <div className="reference-list">
          <div className="master-list-row reference-list-head">
            <span>Actividad</span><span>Especie</span><span>Origen</span><span>Estado</span><span>Accion</span>
          </div>
          {actividadesPropiasFiltradas.map((actividad) => (
            <div className="master-list-row" key={actividad.id}>
              <div><strong>{actividad.nombre}</strong><span>{actividad.codigoInterno || 'Sin codigo interno'}</span></div>
              <span>{obtenerNombreEspecie(actividad)}</span>
              <span>Agro App</span>
              <em>{actividad.estadoVinculacion === 'provisorio' ? 'Provisoria' : actividad.estadoVinculacion === 'archivado' ? 'Archivada' : 'Vinculada ERP'}</em>
              <button className="small" type="button" disabled={!puedeConfigurarPlanificacion} onClick={() => setActividadEnEdicion(actividad)}>Editar</button>
            </div>
          ))}
          {actividadesErpFiltradas.map((actividad) => (
            <div className="master-list-row" key={actividad.erpId}>
              <div><strong>{actividad.descripcion}</strong><span>{actividad.codigo} - ALBOR #{actividad.idActividad}</span></div>
              <span>{actividad.idEspecie ? especiesPorIdNumerico.get(actividad.idEspecie)?.nombre || `Especie ${actividad.idEspecie}` : 'Sin especie'}</span>
              <span>ERP</span>
              <em>{actividadesVinculadas.has(actividad.erpId) ? 'Vinculada' : 'Disponible'}</em>
              <button className="small" type="button" disabled>Vincular</button>
            </div>
          ))}
        </div>
      </section>

      {actividadEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="actividad-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="actividad-modal-title">{actividadesPropias.some((actividad) => actividad.id === actividadEnEdicion.id) ? 'Editar actividad' : 'Nueva actividad'}</h2>
              </div>
              <button className="small" type="button" onClick={() => setActividadEnEdicion(null)}>Cerrar</button>
            </div>
            <div className="reference-modal-grid">
              <label>Codigo interno<input value={actividadEnEdicion.codigoInterno || ''} onChange={(event) => actualizarBorrador({ codigoInterno: event.target.value })} placeholder="Se normaliza en mayusculas" /></label>
              <label>Estado<select value={actividadEnEdicion.estadoVinculacion} onChange={(event) => actualizarBorrador({ estadoVinculacion: event.target.value as ActividadPlanificacion['estadoVinculacion'] })}><option value="provisorio">Provisoria</option><option value="archivado">Archivada</option></select></label>
              <label className="reference-wide">Nombre<input value={actividadEnEdicion.nombre} onChange={(event) => actualizarBorrador({ nombre: event.target.value })} placeholder="Nombre de la actividad" /></label>
              <label className="reference-wide">Especie<select value={obtenerClaveEspecie(actividadEnEdicion)} onChange={(event) => seleccionarEspecie(event.target.value)}><option value="">Seleccionar especie</option>{especiesDisponibles.map((especie) => <option key={especie.clave} value={especie.clave}>{especie.codigo ? `${especie.codigo} - ` : ''}{especie.nombre} ({especie.origen === 'erp' ? 'ERP' : 'Agro App'})</option>)}</select></label>
            </div>
            {existeCodigoDuplicado && <p className="form-error">Ya existe una actividad propia con ese codigo interno.</p>}
            <div className="modal-actions">
              <span className="hint">La actividad queda asociada a una especie y disponible para planificacion, precios, gastos y protocolos.</span>
              <button className="primary" type="button" disabled={guardando || !actividadEnEdicion.nombre.trim() || !obtenerClaveEspecie(actividadEnEdicion) || existeCodigoDuplicado} onClick={guardarActividad}>
                <span className="button-content">{guardando && <LoadingSpinner label="Guardando actividad" />}{guardando ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
