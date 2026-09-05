import { useEffect, useMemo, useState } from 'react';
import type { ErpZona, SesionUsuario, ZonaPlanificacion } from '@agro/tipos';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { guardarZonaPlanificacion, obtenerZonasErpImportadas, obtenerZonasPlanificacion } from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type ZonasScreenProps = {
  sesion: SesionUsuario;
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
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

function crearZonaNueva(clienteId: string): ZonaPlanificacion {
  const ahora = new Date().toISOString();

  return {
    id: `zona-planificacion-${Date.now()}`,
    clienteId,
    empresaErpId: 'global',
    nombre: '',
    codigoInterno: '',
    estadoVinculacion: 'provisorio',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

export function ZonasScreen({ sesion, puedeConfigurarPlanificacion, notificar }: ZonasScreenProps) {
  const [zonasErp, setZonasErp] = useState<ErpZona[]>([]);
  const [zonasPropias, setZonasPropias] = useState<ZonaPlanificacion[]>([]);
  const [zonaEnEdicion, setZonaEnEdicion] = useState<ZonaPlanificacion | null>(null);
  const [estado, setEstado] = useState('Cargando zonas sincronizadas.');
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    async function cargarZonas() {
      try {
        const [respuestaErp, respuestaPropias] = await Promise.all([
          obtenerZonasErpImportadas(sesion.token),
          obtenerZonasPlanificacion(sesion.token),
        ]);

        setZonasErp(respuestaErp.zonas);
        setZonasPropias(respuestaPropias.zonas);
        setEstado('Zonas cargadas desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las zonas.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron zonas', mensaje });
      }
    }

    cargarZonas();
  }, [sesion.token, notificar]);

  const filtroNormalizado = normalizarCodigo(filtro);
  const zonasVinculadas = useMemo(() => new Set(zonasPropias.map((zona) => zona.zonaErpId).filter(Boolean)), [zonasPropias]);
  const zonasPropiasFiltradas = zonasPropias.filter((zona) => (
    normalizarCodigo(`${zona.codigoInterno || ''} ${zona.nombre}`).includes(filtroNormalizado)
  ));
  const zonasErpFiltradas = zonasErp.filter((zona) => (
    normalizarCodigo(`${zona.codigo} ${zona.nombre}`).includes(filtroNormalizado)
  ));
  const codigosPropios = new Map(zonasPropias.map((zona) => [normalizarCodigo(zona.codigoInterno || zona.nombre), zona.id]));
  const codigoZonaActual = zonaEnEdicion ? normalizarCodigo(zonaEnEdicion.codigoInterno || zonaEnEdicion.nombre) : '';
  const existeCodigoDuplicado = Boolean(zonaEnEdicion && codigoZonaActual && codigosPropios.has(codigoZonaActual) && codigosPropios.get(codigoZonaActual) !== zonaEnEdicion.id);

  function abrirNuevaZona() {
    setZonaEnEdicion(crearZonaNueva(sesion.usuario.clienteId || 'cliente-demo'));
  }

  function actualizarBorrador(cambios: Partial<ZonaPlanificacion>) {
    setZonaEnEdicion((actual) => actual && { ...actual, ...cambios, updatedAt: new Date().toISOString() });
  }

  async function guardarZona() {
    if (!zonaEnEdicion || !puedeConfigurarPlanificacion) {
      return;
    }

    const nombre = limpiarTextoVisible(zonaEnEdicion.nombre);

    if (!nombre) {
      notificar?.({ tipo: 'error', titulo: 'Zona incompleta', mensaje: 'El nombre de la zona es obligatorio.' });
      return;
    }

    const zonaPreparada: ZonaPlanificacion = {
      ...zonaEnEdicion,
      empresaErpId: 'global',
      nombre,
      codigoInterno: zonaEnEdicion.codigoInterno ? normalizarCodigo(zonaEnEdicion.codigoInterno) : normalizarCodigo(nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const respuesta = await guardarZonaPlanificacion(zonaPreparada.id, {
        zona: zonaPreparada,
        origen: 'web',
        motivo: 'Alta o edicion de zona desde padron maestro web',
      }, sesion.token);

      setZonasPropias((actuales) => {
        const existe = actuales.some((zona) => zona.id === respuesta.zona.id);
        return existe
          ? actuales.map((zona) => (zona.id === respuesta.zona.id ? respuesta.zona : zona))
          : [respuesta.zona, ...actuales];
      });
      setZonaEnEdicion(null);
      setEstado('Zona guardada con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Zona guardada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la zona.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo la zona', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="planning-stack">
      <section className="metrics">
        <article>
          <span>ERP sincronizadas</span>
          <strong>{zonasErp.length}</strong>
        </article>
        <article>
          <span>Propias Agro App</span>
          <strong>{zonasPropias.length}</strong>
        </article>
        <article>
          <span>Provisorias</span>
          <strong>{zonasPropias.filter((zona) => zona.estadoVinculacion === 'provisorio').length}</strong>
        </article>
        <article>
          <span>Vinculadas</span>
          <strong>{zonasPropias.filter((zona) => zona.estadoVinculacion === 'vinculado_erp').length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Zonas</h2>
            <p className="hint">{estado}</p>
          </div>
          <div className="button-row">
            <label className="compact-field">
              Buscar
              <input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Codigo o nombre" />
            </label>
            <button className="primary" type="button" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevaZona}>
              Nueva zona
            </button>
          </div>
        </div>

        <div className="reference-list">
          <div className="master-list-row reference-list-head">
            <span>Zona</span>
            <span>Origen</span>
            <span>Estado</span>
            <span>Actualizado</span>
            <span>Accion</span>
          </div>

          {!zonasPropiasFiltradas.length && !zonasErpFiltradas.length && (
            <div className="empty-state">Todavia no hay zonas para el filtro seleccionado.</div>
          )}

          {zonasPropiasFiltradas.map((zona) => (
            <div className="master-list-row" key={zona.id}>
              <div>
                <strong>{zona.nombre}</strong>
                <span>{zona.codigoInterno || 'Sin codigo interno'}</span>
              </div>
              <span>Agro App</span>
              <em>{zona.estadoVinculacion === 'provisorio' ? 'Provisorio' : zona.estadoVinculacion === 'archivado' ? 'Archivado' : 'Vinculado ERP'}</em>
              <span>{new Intl.DateTimeFormat('es-AR').format(new Date(zona.updatedAt || zona.createdAt))}</span>
              <button className="small" type="button" disabled={!puedeConfigurarPlanificacion} onClick={() => setZonaEnEdicion(zona)}>
                Editar
              </button>
            </div>
          ))}

          {zonasErpFiltradas.map((zona) => (
            <div className="master-list-row" key={zona.erpId}>
              <div>
                <strong>{zona.nombre}</strong>
                <span>{zona.codigo} - ALBOR #{zona.idZona}</span>
              </div>
              <span>ERP</span>
              <em>{zonasVinculadas.has(zona.erpId) ? 'Vinculada' : 'Disponible'}</em>
              <span>{zona.activo ? 'Activa' : 'Inactiva'}</span>
              <button className="small" type="button" disabled>
                Vincular
              </button>
            </div>
          ))}
        </div>
      </section>

      {zonaEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="zona-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="zona-modal-title">{zonasPropias.some((zona) => zona.id === zonaEnEdicion.id) ? 'Editar zona' : 'Nueva zona'}</h2>
                <p className="hint">Las zonas propias son globales para el cliente y quedan disponibles para crear campos.</p>
              </div>
              <button className="small" type="button" onClick={() => setZonaEnEdicion(null)}>Cerrar</button>
            </div>

            <div className="reference-modal-grid">
              <label>
                Codigo interno
                <input
                  value={zonaEnEdicion.codigoInterno || ''}
                  onChange={(event) => actualizarBorrador({ codigoInterno: event.target.value })}
                  placeholder="Se normaliza en mayusculas"
                />
              </label>
              <label>
                Estado
                <select
                  value={zonaEnEdicion.estadoVinculacion}
                  onChange={(event) => actualizarBorrador({ estadoVinculacion: event.target.value as ZonaPlanificacion['estadoVinculacion'] })}
                >
                  <option value="provisorio">Provisorio</option>
                  <option value="archivado">Archivado</option>
                </select>
              </label>
              <label className="reference-wide">
                Nombre
                <input
                  value={zonaEnEdicion.nombre}
                  onChange={(event) => actualizarBorrador({ nombre: event.target.value })}
                  placeholder="Nombre de la zona"
                />
              </label>
            </div>

            {existeCodigoDuplicado && (
              <p className="form-error">Ya existe una zona propia con ese codigo interno.</p>
            )}

            <div className="modal-actions">
              <span className="hint">La vinculacion con ERP quedara como accion separada y auditada.</span>
              <button
                className="primary"
                type="button"
                disabled={guardando || !zonaEnEdicion.nombre.trim() || existeCodigoDuplicado}
                onClick={guardarZona}
              >
                <span className="button-content">
                  {guardando && <LoadingSpinner label="Guardando zona" />}
                  {guardando ? 'Guardando...' : 'Guardar'}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
