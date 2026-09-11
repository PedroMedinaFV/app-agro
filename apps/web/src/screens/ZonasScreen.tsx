import { useEffect, useMemo, useState } from 'react';
import type { ErpZona, SesionUsuario, ZonaApp } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Panel } from '../components/Panel';
import { guardarZonaApp, obtenerZonasErpImportadas, obtenerZonasApp } from '../services/api';
import { sugerirVinculacion } from '../utils/vinculacionSugerida';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type ZonasScreenProps = {
  sesion: SesionUsuario;
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
};

type ZonaTabla = {
  id: string;
  nombre: string;
  detalle: string;
  origen: string;
  estado: string;
  actualizado: string;
  accion: 'editar' | 'importado';
  zonaPropia?: ZonaApp;
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

function crearZonaNueva(clienteId: string): ZonaApp {
  const ahora = new Date().toISOString();

  return {
    id: `zona-app-${Date.now()}`,
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
  const [zonasPropias, setZonasPropias] = useState<ZonaApp[]>([]);
  const [zonaEnEdicion, setZonaEnEdicion] = useState<ZonaApp | null>(null);
  const [estado, setEstado] = useState('Cargando zonas sincronizadas.');
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [zonaPropiaParaVincular, setZonaPropiaParaVincular] = useState<ZonaApp | null>(null);
  const [zonaErpVincularId, setZonaErpVincularId] = useState('');

  useEffect(() => {
    async function cargarZonas() {
      try {
        const [respuestaErp, respuestaPropias] = await Promise.all([
          obtenerZonasErpImportadas(sesion.token),
          obtenerZonasApp(sesion.token),
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
  const zonasVinculadas = useMemo(() => new Set(zonasPropias.map((zona) => zona.zonaErpId).filter((id): id is string => Boolean(id))), [zonasPropias]);
  const zonasErpDisponiblesParaVincular = useMemo(() => zonasErp
    .filter((zona) => !zonasVinculadas.has(zona.erpId))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [zonasErp, zonasVinculadas]);
  const zonasErpSugeridasParaVincular = useMemo(() => (
    zonaPropiaParaVincular
      ? obtenerSugerenciasZona(zonaPropiaParaVincular)
      : []
  ), [zonaPropiaParaVincular, zonasErpDisponiblesParaVincular]);
  const zonasPropiasFiltradas = zonasPropias.filter((zona) => !zona.zonaErpId).filter((zona) => (
    normalizarCodigo(`${zona.codigoInterno || ''} ${zona.nombre}`).includes(filtroNormalizado)
  ));
  const zonasErpFiltradas = zonasErp.filter((zona) => (
    normalizarCodigo(`${zona.codigo} ${zona.nombre}`).includes(filtroNormalizado)
  ));
  const codigosPropios = new Map(zonasPropias.map((zona) => [normalizarCodigo(zona.codigoInterno || zona.nombre), zona.id]));
  const codigoZonaActual = zonaEnEdicion ? normalizarCodigo(zonaEnEdicion.codigoInterno || zonaEnEdicion.nombre) : '';
  const existeCodigoDuplicado = Boolean(zonaEnEdicion && codigoZonaActual && codigosPropios.has(codigoZonaActual) && codigosPropios.get(codigoZonaActual) !== zonaEnEdicion.id);
  const filasZona: ZonaTabla[] = [
    ...zonasPropiasFiltradas.map((zona) => ({
      id: zona.id,
      nombre: zona.nombre,
      detalle: zona.codigoInterno || 'Sin codigo interno',
      origen: 'Agro App',
      estado: zona.estadoVinculacion === 'provisorio' ? 'Provisorio' : zona.estadoVinculacion === 'archivado' ? 'Archivado' : 'Vinculado ERP',
      actualizado: new Intl.DateTimeFormat('es-AR').format(new Date(zona.updatedAt || zona.createdAt)),
      accion: 'editar' as const,
      zonaPropia: zona,
    })),
    ...zonasErpFiltradas.map((zona) => ({
      id: zona.erpId,
      nombre: zona.nombre,
      detalle: `${zona.codigo} - ALBOR #${zona.idZona}`,
      origen: 'ERP',
      estado: zonasVinculadas.has(zona.erpId) ? 'Vinculada' : 'Disponible',
      actualizado: zona.activo ? 'Activa' : 'Inactiva',
      accion: 'importado' as const,
    })),
  ];

  function abrirNuevaZona() {
    setZonaEnEdicion(crearZonaNueva(sesion.usuario.clienteId || 'cliente-demo'));
  }

  function actualizarBorrador(cambios: Partial<ZonaApp>) {
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

    const zonaPreparada: ZonaApp = {
      ...zonaEnEdicion,
      empresaErpId: 'global',
      nombre,
      codigoInterno: zonaEnEdicion.codigoInterno ? normalizarCodigo(zonaEnEdicion.codigoInterno) : normalizarCodigo(nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const respuesta = await guardarZonaApp(zonaPreparada.id, {
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

  function abrirVinculacion(zona: ZonaApp) {
    const sugerencias = obtenerSugerenciasZona(zona);

    if (zona.estadoVinculacion !== 'provisorio' || zona.zonaErpId) {
      notificar?.({ tipo: 'info', titulo: 'Zona no vinculable', mensaje: 'Solo se pueden vincular zonas propias en estado provisorio.' });
      return;
    }

    if (!sugerencias.length) {
      notificar?.({ tipo: 'info', titulo: 'No hay zona ERP disponible', mensaje: 'Todas las zonas ERP ya estan vinculadas o no hay zonas importadas.' });
      return;
    }

    setZonaPropiaParaVincular(zona);
    setZonaErpVincularId(sugerencias[0].registro.erpId);
  }

  function obtenerSugerenciasZona(zona: ZonaApp) {
    return sugerirVinculacion(
      { codigo: zona.codigoInterno, nombre: zona.nombre },
      zonasErpDisponiblesParaVincular,
      (registro) => registro.codigo,
      (registro) => registro.nombre,
    );
  }

  async function confirmarVinculacionZona() {
    if (!zonaPropiaParaVincular || !zonaErpVincularId) {
      return;
    }

    const zonaErp = zonasErp.find((zona) => zona.erpId === zonaErpVincularId);

    if (!zonaErp) {
      notificar?.({ tipo: 'error', titulo: 'No se encontro la zona ERP', mensaje: 'Actualiza la pantalla e intenta nuevamente.' });
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await guardarZonaApp(zonaPropiaParaVincular.id, {
        zona: {
          ...zonaPropiaParaVincular,
          empresaErpId: 'global',
          zonaErpId: zonaErp.erpId,
          estadoVinculacion: 'vinculado_erp',
          updatedAt: new Date().toISOString(),
        },
        origen: 'web',
        motivo: `Vinculacion manual con zona ERP ${zonaErp.erpId}`,
      }, sesion.token);

      setZonasPropias((actuales) => actuales.map((zona) => (zona.id === respuesta.zona.id ? respuesta.zona : zona)));
      setZonaPropiaParaVincular(null);
      setZonaErpVincularId('');
      setEstado('Zona vinculada con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Zona vinculada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular la zona.';
      notificar?.({ tipo: 'error', titulo: 'No se vinculo la zona', mensaje });
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

      <Panel
        title="Zonas"
        description={estado}
        actions={(
          <ActionBar align="end">
            <label className="compact-field">
              Buscar
              <input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Codigo o nombre" />
            </label>
            <Button variant="primary" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevaZona}>
              Nueva zona
            </Button>
          </ActionBar>
        )}
      >
        <DataTable
          rows={filasZona}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay zonas para el filtro seleccionado."
          columns={[
            { key: 'zona', label: 'Zona', width: 'minmax(180px, 1.4fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'origen', label: 'Origen', width: 'minmax(96px, 0.7fr)', render: (fila) => fila.origen },
            { key: 'estado', label: 'Estado', width: 'minmax(110px, 0.8fr)', render: (fila) => <em>{fila.estado}</em> },
            { key: 'actualizado', label: 'Actualizado', width: 'minmax(110px, 0.8fr)', render: (fila) => fila.actualizado },
            {
              key: 'accion',
              label: 'Accion',
              width: 'minmax(150px, 0.7fr)',
              render: (fila) => fila.accion === 'editar'
                ? (
                  <div className="table-icon-actions">
                    <IconButton icon="edit" label={`Editar zona ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.zonaPropia && setZonaEnEdicion(fila.zonaPropia)} />
                    {fila.zonaPropia?.estadoVinculacion === 'provisorio' && !fila.zonaPropia.zonaErpId && (
                      <IconButton icon="link" label={`Vincular zona ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.zonaPropia && abrirVinculacion(fila.zonaPropia)} />
                    )}
                  </div>
                )
                : <span className="hint">Importada</span>,
            },
          ]}
        />
      </Panel>

      {zonaEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="zona-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="zona-modal-title">{zonasPropias.some((zona) => zona.id === zonaEnEdicion.id) ? 'Editar zona' : 'Nueva zona'}</h2>
                <p className="hint">Las zonas propias son globales para el cliente y quedan disponibles para crear campos.</p>
              </div>
              <Button variant="small" onClick={() => setZonaEnEdicion(null)}>Cerrar</Button>
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
                  onChange={(event) => actualizarBorrador({ estadoVinculacion: event.target.value as ZonaApp['estadoVinculacion'] })}
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
              <Button
                variant="primary"
                disabled={guardando || !zonaEnEdicion.nombre.trim() || existeCodigoDuplicado}
                onClick={guardarZona}
              >
                <span className="button-content">
                  {guardando && <LoadingSpinner label="Guardando zona" />}
                  {guardando ? 'Guardando...' : 'Guardar'}
                </span>
              </Button>
            </div>
          </section>
        </div>
      )}

      {zonaPropiaParaVincular && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vincular-zona-title">
            <div className="modal-header">
              <div>
                <h2 id="vincular-zona-title">Vincular zona provisoria</h2>
                <p className="hint">La zona propia quedara enlazada a ALBOR y dejara de mostrarse como fila independiente.</p>
              </div>
              <Button variant="ghost" onClick={() => { setZonaPropiaParaVincular(null); setZonaErpVincularId(''); }}>Cerrar</Button>
            </div>
            <div className="reference-modal-grid">
              <div className="reference-total">
                <span>Zona provisoria</span>
                <strong>{zonaPropiaParaVincular.nombre}</strong>
                <span>{zonaPropiaParaVincular.codigoInterno || 'Sin codigo interno'}</span>
              </div>
              <label className="reference-wide">
                Zona ERP disponible
                <select value={zonaErpVincularId} onChange={(event) => setZonaErpVincularId(event.target.value)}>
                  {zonasErpSugeridasParaVincular.map(({ registro, motivo }) => (
                    <option key={registro.erpId} value={registro.erpId}>{registro.codigo} - {registro.nombre} ({motivo})</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <span className="hint">El backend valida que la zona ERP exista y no este vinculada a otra zona del cliente.</span>
              <Button variant="primary" disabled={guardando || !zonaErpVincularId} onClick={confirmarVinculacionZona}>
                <span className="button-content">{guardando && <span className="loading-spinner" />}Vincular</span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
