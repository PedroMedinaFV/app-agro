import { useEffect, useMemo, useState } from 'react';
import type { ErpEspecie, EspecieApp, SesionUsuario } from '@agro/tipos';
import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OriginBadge } from '../components/OriginBadge';
import { Panel } from '../components/Panel';
import { guardarEspecieApp, obtenerEspeciesErpImportadas, obtenerEspeciesApp } from '../services/api';
import { sugerirVinculacion } from '../utils/vinculacionSugerida';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type EspeciesAppScreenProps = {
  sesion: SesionUsuario;
  puedeConfigurarPlanificacion: boolean;
  notificar?: Notificar;
};

type EspecieTabla = {
  id: string;
  nombre: string;
  detalle: string;
  origen: string;
  estado: string;
  actualizado: string;
  accion: 'editar' | 'importada';
  especiePropia?: EspecieApp;
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

function crearEspecieNueva(clienteId: string): EspecieApp {
  const ahora = new Date().toISOString();

  return {
    id: `especie-app-${Date.now()}`,
    clienteId,
    empresaErpId: 'global',
    nombre: '',
    codigoInterno: '',
    estadoVinculacion: 'provisorio',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

export function EspeciesAppScreen({ sesion, puedeConfigurarPlanificacion, notificar }: EspeciesAppScreenProps) {
  const [especiesErp, setEspeciesErp] = useState<ErpEspecie[]>([]);
  const [especiesPropias, setEspeciesPropias] = useState<EspecieApp[]>([]);
  const [especieEnEdicion, setEspecieEnEdicion] = useState<EspecieApp | null>(null);
  const [estado, setEstado] = useState('Cargando especies sincronizadas.');
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [especiePropiaParaVincular, setEspeciePropiaParaVincular] = useState<EspecieApp | null>(null);
  const [especieErpVincularId, setEspecieErpVincularId] = useState('');

  useEffect(() => {
    async function cargarEspecies() {
      try {
        const [respuestaErp, respuestaPropias] = await Promise.all([
          obtenerEspeciesErpImportadas(sesion.token),
          obtenerEspeciesApp(sesion.token),
        ]);

        setEspeciesErp(respuestaErp.especies);
        setEspeciesPropias(respuestaPropias.especies);
        setEstado('Especies cargadas desde Supabase.');
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar las especies.';
        setEstado(mensaje);
        notificar?.({ tipo: 'error', titulo: 'No se cargaron especies', mensaje });
      }
    }

    cargarEspecies();
  }, [sesion.token, notificar]);

  const filtroNormalizado = normalizarCodigo(filtro);
  const especiesVinculadas = useMemo(() => new Set(especiesPropias.map((especie) => especie.especieErpId).filter((id): id is string => Boolean(id))), [especiesPropias]);
  const especiesErpDisponiblesParaVincular = useMemo(() => especiesErp
    .filter((especie) => !especiesVinculadas.has(especie.erpId))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [especiesErp, especiesVinculadas]);
  const especiesErpSugeridasParaVincular = useMemo(() => (
    especiePropiaParaVincular
      ? obtenerSugerenciasEspecie(especiePropiaParaVincular)
      : []
  ), [especiePropiaParaVincular, especiesErpDisponiblesParaVincular]);
  const especiesPropiasFiltradas = especiesPropias.filter((especie) => !especie.especieErpId).filter((especie) => normalizarCodigo(`${especie.codigoInterno || ''} ${especie.nombre}`).includes(filtroNormalizado));
  const especiesErpFiltradas = especiesErp.filter((especie) => normalizarCodigo(`${especie.codigo} ${especie.nombre}`).includes(filtroNormalizado));
  const codigoActual = especieEnEdicion ? normalizarCodigo(especieEnEdicion.codigoInterno || especieEnEdicion.nombre) : '';
  const existeCodigoDuplicado = Boolean(especieEnEdicion && codigoActual && especiesPropias.some((especie) => (
    especie.id !== especieEnEdicion.id && especie.codigoInterno === codigoActual
  )));
  const filasEspecie: EspecieTabla[] = [
    ...especiesPropiasFiltradas.map((especie) => ({
      id: especie.id,
      nombre: especie.nombre,
      detalle: especie.codigoInterno || 'Sin codigo interno',
      origen: 'Agro App',
      estado: especie.estadoVinculacion === 'provisorio' ? 'Provisoria' : 'Vinculada ERP',
      actualizado: new Intl.DateTimeFormat('es-AR').format(new Date(especie.updatedAt || especie.createdAt)),
      accion: 'editar' as const,
      especiePropia: especie,
    })),
    ...especiesErpFiltradas.map((especie) => ({
      id: especie.erpId,
      nombre: especie.nombre,
      detalle: `${especie.codigo} - ALBOR #${especie.idEspecie}`,
      origen: 'ERP',
      estado: especiesVinculadas.has(especie.erpId) ? 'Vinculada' : 'Disponible',
      actualizado: new Intl.DateTimeFormat('es-AR').format(new Date(especie.actualizadoEn)),
      accion: 'importada' as const,
    })),
  ];

  function abrirNuevaEspecie() {
    setEspecieEnEdicion(crearEspecieNueva(sesion.usuario.clienteId || 'cliente-demo'));
  }

  function actualizarBorrador(cambios: Partial<EspecieApp>) {
    setEspecieEnEdicion((actual) => actual && { ...actual, ...cambios, updatedAt: new Date().toISOString() });
  }

  async function guardarEspecie() {
    if (!especieEnEdicion || !puedeConfigurarPlanificacion) {
      return;
    }

    const nombre = limpiarTextoVisible(especieEnEdicion.nombre);
    const especiePreparada: EspecieApp = {
      ...especieEnEdicion,
      empresaErpId: 'global',
      nombre,
      codigoInterno: normalizarCodigo(especieEnEdicion.codigoInterno || nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const respuesta = await guardarEspecieApp(especiePreparada.id, {
        especie: especiePreparada,
        origen: 'web',
        motivo: 'Alta o edicion de especie desde padron maestro web',
      }, sesion.token);

      setEspeciesPropias((actuales) => {
        const existe = actuales.some((especie) => especie.id === respuesta.especie.id);
        return existe
          ? actuales.map((especie) => (especie.id === respuesta.especie.id ? respuesta.especie : especie))
          : [respuesta.especie, ...actuales];
      });
      setEspecieEnEdicion(null);
      setEstado('Especie guardada con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Especie guardada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la especie.';
      notificar?.({ tipo: 'error', titulo: 'No se guardo la especie', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  function abrirVinculacion(especie: EspecieApp) {
    const sugerencias = obtenerSugerenciasEspecie(especie);

    if (especie.estadoVinculacion !== 'provisorio' || especie.especieErpId) {
      notificar?.({ tipo: 'info', titulo: 'Especie no vinculable', mensaje: 'Solo se pueden vincular especies propias en estado provisorio.' });
      return;
    }

    if (!sugerencias.length) {
      notificar?.({ tipo: 'info', titulo: 'No hay especie ERP disponible', mensaje: 'Todas las especies ERP ya estan vinculadas o no hay especies importadas.' });
      return;
    }

    setEspeciePropiaParaVincular(especie);
    setEspecieErpVincularId(sugerencias[0].registro.erpId);
  }

  function obtenerSugerenciasEspecie(especie: EspecieApp) {
    return sugerirVinculacion(
      { codigo: especie.codigoInterno, nombre: especie.nombre },
      especiesErpDisponiblesParaVincular,
      (registro) => registro.codigo,
      (registro) => registro.nombre,
    );
  }

  async function confirmarVinculacionEspecie() {
    if (!especiePropiaParaVincular || !especieErpVincularId) {
      return;
    }

    const especieErp = especiesErp.find((especie) => especie.erpId === especieErpVincularId);

    if (!especieErp) {
      notificar?.({ tipo: 'error', titulo: 'No se encontro la especie ERP', mensaje: 'Actualiza la pantalla e intenta nuevamente.' });
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await guardarEspecieApp(especiePropiaParaVincular.id, {
        especie: {
          ...especiePropiaParaVincular,
          empresaErpId: 'global',
          especieErpId: especieErp.erpId,
          estadoVinculacion: 'vinculado_erp',
          updatedAt: new Date().toISOString(),
        },
        origen: 'web',
        motivo: `Vinculacion manual con especie ERP ${especieErp.erpId}`,
      }, sesion.token);

      setEspeciesPropias((actuales) => actuales.map((especie) => (especie.id === respuesta.especie.id ? respuesta.especie : especie)));
      setEspeciePropiaParaVincular(null);
      setEspecieErpVincularId('');
      setEstado('Especie vinculada con auditoria.');
      notificar?.({ tipo: 'success', titulo: 'Especie vinculada', mensaje: respuesta.mensaje });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo vincular la especie.';
      notificar?.({ tipo: 'error', titulo: 'No se vinculo la especie', mensaje });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="planning-stack">
      <section className="metrics">
        <article><span>ERP sincronizadas</span><strong>{especiesErp.length}</strong></article>
        <article><span>Propias Agro App</span><strong>{especiesPropias.length}</strong></article>
        <article><span>Provisorias</span><strong>{especiesPropias.filter((especie) => especie.estadoVinculacion === 'provisorio').length}</strong></article>
        <article><span>Vinculadas</span><strong>{especiesPropias.filter((especie) => especie.estadoVinculacion === 'vinculado_erp').length}</strong></article>
      </section>

      <Panel
        title="Especies"
        description={estado}
        actions={(
          <ActionBar align="end">
            <label className="compact-field">
              Buscar
              <input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Codigo o nombre" />
            </label>
            <Button variant="primary" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevaEspecie}>
              Nueva especie
            </Button>
          </ActionBar>
        )}
      >
        <DataTable
          rows={filasEspecie}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay especies para el filtro seleccionado."
          columns={[
            { key: 'especie', label: 'Especie', width: 'minmax(180px, 1.4fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'origen', label: 'Origen', width: 'minmax(96px, 0.7fr)', render: (fila) => <OriginBadge origen={fila.origen} /> },
            { key: 'estado', label: 'Estado', width: 'minmax(110px, 0.8fr)', render: (fila) => <em>{fila.estado}</em> },
            { key: 'actualizado', label: 'Actualizado', width: 'minmax(110px, 0.8fr)', render: (fila) => fila.actualizado },
            {
              key: 'accion',
              label: 'Accion',
              width: 'minmax(150px, 0.7fr)',
              render: (fila) => fila.accion === 'editar'
                ? (
                  <div className="table-icon-actions">
                    <IconButton icon="edit" label={`Editar especie ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.especiePropia && setEspecieEnEdicion(fila.especiePropia)} />
                    {fila.especiePropia?.estadoVinculacion === 'provisorio' && !fila.especiePropia.especieErpId && (
                      <IconButton icon="link" label={`Vincular especie ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.especiePropia && abrirVinculacion(fila.especiePropia)} />
                    )}
                  </div>
                )
                : <span className="hint">Importada</span>,
            },
          ]} 
        />
      </Panel>

      {especieEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="especie-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="especie-modal-title">{especiesPropias.some((especie) => especie.id === especieEnEdicion.id) ? 'Editar especie' : 'Nueva especie'}</h2>
              </div>
              <Button variant="small" onClick={() => setEspecieEnEdicion(null)}>Cerrar</Button>
            </div>
            <div className="reference-modal-grid">
              <label>Codigo interno<input value={especieEnEdicion.codigoInterno || ''} onChange={(event) => actualizarBorrador({ codigoInterno: event.target.value })} placeholder="Se normaliza en mayusculas" /></label>
              <label className="reference-wide">Nombre<input value={especieEnEdicion.nombre} onChange={(event) => actualizarBorrador({ nombre: event.target.value })} placeholder="Nombre de la especie" /></label>
            </div>
            {existeCodigoDuplicado && <p className="form-error">Ya existe una especie propia con ese codigo interno.</p>}
            <div className="modal-actions">
              <span className="hint">La vinculacion con ERP quedara como accion separada y auditada.</span>
              <Button variant="primary" disabled={guardando || !especieEnEdicion.nombre.trim() || existeCodigoDuplicado} onClick={guardarEspecie}>
                <span className="button-content">{guardando && <LoadingSpinner label="Guardando especie" />}{guardando ? 'Guardando...' : 'Guardar'}</span>
              </Button>
            </div>
          </section>
        </div>
      )}

      {especiePropiaParaVincular && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vincular-especie-title">
            <div className="modal-header">
              <div>
                <h2 id="vincular-especie-title">Vincular especie provisoria</h2>
                <p className="hint">La especie propia quedara enlazada a ALBOR y dejara de mostrarse como fila independiente.</p>
              </div>
              <Button variant="ghost" onClick={() => { setEspeciePropiaParaVincular(null); setEspecieErpVincularId(''); }}>Cerrar</Button>
            </div>
            <div className="reference-modal-grid">
              <div className="reference-total">
                <span>Especie provisoria</span>
                <strong>{especiePropiaParaVincular.nombre}</strong>
                <span>{especiePropiaParaVincular.codigoInterno || 'Sin codigo interno'}</span>
              </div>
              <label className="reference-wide">
                Especie ERP disponible
                <select value={especieErpVincularId} onChange={(event) => setEspecieErpVincularId(event.target.value)}>
                  {especiesErpSugeridasParaVincular.map(({ registro, motivo }) => (
                    <option key={registro.erpId} value={registro.erpId}>{registro.codigo} - {registro.nombre} ({motivo})</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <span className="hint">El backend valida que la especie ERP exista y no este vinculada a otra especie del cliente.</span>
              <Button variant="primary" disabled={guardando || !especieErpVincularId} onClick={confirmarVinculacionEspecie}>
                <span className="button-content">{guardando && <span className="loading-spinner" />}Vincular</span>
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
