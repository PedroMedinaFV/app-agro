import { useEffect, useMemo, useState } from 'react';
import type { ErpEspecie, EspeciePlanificacion, SesionUsuario } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { guardarEspeciePlanificacion, obtenerEspeciesErpImportadas, obtenerEspeciesPlanificacion } from '../services/api';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type EspeciesPlanificacionScreenProps = {
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
  accion: 'editar' | 'vincular';
  especiePropia?: EspeciePlanificacion;
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

function crearEspecieNueva(clienteId: string): EspeciePlanificacion {
  const ahora = new Date().toISOString();

  return {
    id: `especie-planificacion-${Date.now()}`,
    clienteId,
    empresaErpId: 'global',
    nombre: '',
    codigoInterno: '',
    estadoVinculacion: 'provisorio',
    createdAt: ahora,
    updatedAt: ahora,
  };
}

export function EspeciesPlanificacionScreen({ sesion, puedeConfigurarPlanificacion, notificar }: EspeciesPlanificacionScreenProps) {
  const [especiesErp, setEspeciesErp] = useState<ErpEspecie[]>([]);
  const [especiesPropias, setEspeciesPropias] = useState<EspeciePlanificacion[]>([]);
  const [especieEnEdicion, setEspecieEnEdicion] = useState<EspeciePlanificacion | null>(null);
  const [estado, setEstado] = useState('Cargando especies sincronizadas.');
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    async function cargarEspecies() {
      try {
        const [respuestaErp, respuestaPropias] = await Promise.all([
          obtenerEspeciesErpImportadas(sesion.token),
          obtenerEspeciesPlanificacion(sesion.token),
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
  const especiesVinculadas = useMemo(() => new Set(especiesPropias.map((especie) => especie.especieErpId).filter(Boolean)), [especiesPropias]);
  const especiesPropiasFiltradas = especiesPropias.filter((especie) => normalizarCodigo(`${especie.codigoInterno || ''} ${especie.nombre}`).includes(filtroNormalizado));
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
      estado: especie.estadoVinculacion === 'provisorio' ? 'Provisoria' : especie.estadoVinculacion === 'archivado' ? 'Archivada' : 'Vinculada ERP',
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
      accion: 'vincular' as const,
    })),
  ];

  function abrirNuevaEspecie() {
    setEspecieEnEdicion(crearEspecieNueva(sesion.usuario.clienteId || 'cliente-demo'));
  }

  function actualizarBorrador(cambios: Partial<EspeciePlanificacion>) {
    setEspecieEnEdicion((actual) => actual && { ...actual, ...cambios, updatedAt: new Date().toISOString() });
  }

  async function guardarEspecie() {
    if (!especieEnEdicion || !puedeConfigurarPlanificacion) {
      return;
    }

    const nombre = limpiarTextoVisible(especieEnEdicion.nombre);
    const especiePreparada: EspeciePlanificacion = {
      ...especieEnEdicion,
      empresaErpId: 'global',
      nombre,
      codigoInterno: normalizarCodigo(especieEnEdicion.codigoInterno || nombre),
      updatedAt: new Date().toISOString(),
    };

    setGuardando(true);

    try {
      const respuesta = await guardarEspeciePlanificacion(especiePreparada.id, {
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

  return (
    <div className="planning-stack">
      <section className="metrics">
        <article><span>ERP sincronizadas</span><strong>{especiesErp.length}</strong></article>
        <article><span>Propias Agro App</span><strong>{especiesPropias.length}</strong></article>
        <article><span>Provisorias</span><strong>{especiesPropias.filter((especie) => especie.estadoVinculacion === 'provisorio').length}</strong></article>
        <article><span>Vinculadas</span><strong>{especiesPropias.filter((especie) => especie.estadoVinculacion === 'vinculado_erp').length}</strong></article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Especies</h2>
            <p className="hint">{estado}</p>
          </div>
          <div className="button-row">
            <label className="compact-field">
              Buscar
              <input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Codigo o nombre" />
            </label>
            <button className="primary" type="button" disabled={!puedeConfigurarPlanificacion} onClick={abrirNuevaEspecie}>
              Nueva especie
            </button>
          </div>
        </div>

        <DataTable
          rows={filasEspecie}
          getRowKey={(fila) => fila.id}
          emptyMessage="Todavia no hay especies para el filtro seleccionado."
          columns={[
            { key: 'especie', label: 'Especie', width: 'minmax(180px, 1.4fr)', render: (fila) => <><strong>{fila.nombre}</strong><span>{fila.detalle}</span></> },
            { key: 'origen', label: 'Origen', width: 'minmax(96px, 0.7fr)', render: (fila) => fila.origen },
            { key: 'estado', label: 'Estado', width: 'minmax(110px, 0.8fr)', render: (fila) => <em>{fila.estado}</em> },
            { key: 'actualizado', label: 'Actualizado', width: 'minmax(110px, 0.8fr)', render: (fila) => fila.actualizado },
            {
              key: 'accion',
              label: 'Accion',
              width: 'minmax(86px, 0.55fr)',
              render: (fila) => fila.accion === 'editar'
                ? <button className="small" type="button" disabled={!puedeConfigurarPlanificacion} onClick={() => fila.especiePropia && setEspecieEnEdicion(fila.especiePropia)}>Editar</button>
                : <button className="small" type="button" disabled>Vincular</button>,
            },
          ]}
        />
      </section>

      {especieEnEdicion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="especie-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Padron maestro</p>
                <h2 id="especie-modal-title">{especiesPropias.some((especie) => especie.id === especieEnEdicion.id) ? 'Editar especie' : 'Nueva especie'}</h2>
              </div>
              <button className="small" type="button" onClick={() => setEspecieEnEdicion(null)}>Cerrar</button>
            </div>
            <div className="reference-modal-grid">
              <label>Codigo interno<input value={especieEnEdicion.codigoInterno || ''} onChange={(event) => actualizarBorrador({ codigoInterno: event.target.value })} placeholder="Se normaliza en mayusculas" /></label>
              <label>Estado<select value={especieEnEdicion.estadoVinculacion} onChange={(event) => actualizarBorrador({ estadoVinculacion: event.target.value as EspeciePlanificacion['estadoVinculacion'] })}><option value="provisorio">Provisoria</option><option value="archivado">Archivada</option></select></label>
              <label className="reference-wide">Nombre<input value={especieEnEdicion.nombre} onChange={(event) => actualizarBorrador({ nombre: event.target.value })} placeholder="Nombre de la especie" /></label>
            </div>
            {existeCodigoDuplicado && <p className="form-error">Ya existe una especie propia con ese codigo interno.</p>}
            <div className="modal-actions">
              <span className="hint">La vinculacion con ERP quedara como accion separada y auditada.</span>
              <button className="primary" type="button" disabled={guardando || !especieEnEdicion.nombre.trim() || existeCodigoDuplicado} onClick={guardarEspecie}>
                <span className="button-content">{guardando && <LoadingSpinner label="Guardando especie" />}{guardando ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
