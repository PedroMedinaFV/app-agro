import { useEffect, useMemo, useState } from 'react';
import { ErpCampania, ErpSnapshot, PlanificacionSnapshot, ProtocoloProductivoDetalle, ProtocolosSnapshot, SesionUsuario } from '@agro/tipos';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { IconButton } from '../components/IconButton';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { ProtocoloModal } from '../components/protocolos/ProtocoloModal';
import { obtenerCampaniasErpImportadas } from '../services/api';

interface ProtocolosScreenProps {
  sesion: SesionUsuario;
  protocolos: ProtocolosSnapshot;
  snapshot: ErpSnapshot;
  planificacion: PlanificacionSnapshot;
  puedeConfigurarPlanificacion: boolean;
  guardandoProtocolo: boolean;
  protocoloSeleccionadoId: string;
  protocoloSeleccionado: ProtocoloProductivoDetalle | undefined;
  // Handlers
  setProtocoloSeleccionadoId: (id: string) => void;
  crearProtocoloVacio: () => void;
  copiarProtocoloSeleccionado: (protocolo?: ProtocoloProductivoDetalle) => void;
  guardarProtocoloSeleccionado: () => void;
  asegurarPlanificacion: () => Promise<void>;
  actualizarProtocolos: (updater: (protocolo: ProtocoloProductivoDetalle) => ProtocoloProductivoDetalle) => void;
  agregarEtapaProtocolo: () => void;
  actualizarEtapa: (etapaId: string, updates: Partial<ProtocoloProductivoDetalle['etapas'][number]>) => void;
  agregarLabor: (etapaId: string, servicioAppId?: string) => void;
  agregarInsumo: (etapaId: string, insumoAppId?: string) => void;
  formatearUsd: (valor: number) => string;
  leerNumero: (valor: string) => number;
}

export function ProtocolosScreen({
  sesion,
  protocolos,
  snapshot,
  planificacion,
  puedeConfigurarPlanificacion,
  guardandoProtocolo,
  protocoloSeleccionadoId,
  protocoloSeleccionado,
  crearProtocoloVacio,
  copiarProtocoloSeleccionado,
  guardarProtocoloSeleccionado,
  asegurarPlanificacion,
  actualizarProtocolos,
  agregarEtapaProtocolo,
  actualizarEtapa,
  agregarLabor,
  agregarInsumo,
  formatearUsd,
  leerNumero,
  setProtocoloSeleccionadoId,
}: ProtocolosScreenProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<'crear' | 'editar' | 'copiar'>('editar');
  const [campaniasErp, setCampaniasErp] = useState<ErpCampania[]>([]);
  const [accionPendiente, setAccionPendiente] = useState<
    | { tipo: 'crear' }
    | { tipo: 'editar'; protocoloId: string }
    | { tipo: 'copiar'; protocolo: ProtocoloProductivoDetalle }
    | null
  >(null);
  const campaniasDisponibles = campaniasErp.length ? campaniasErp : snapshot.campanias;
  const actividadesPorId = useMemo(
    () => new Map((planificacion.actividadesApp || []).map((actividad) => [actividad.id, actividad])),
    [planificacion.actividadesApp],
  );
  const zonasPorId = useMemo(
    () => new Map((planificacion.zonasApp || []).map((zona) => [zona.id, zona])),
    [planificacion.zonasApp],
  );
  const camposPorId = useMemo(
    () => new Map(planificacion.camposApp.map((campo) => [campo.id, campo])),
    [planificacion.camposApp],
  );

  async function prepararEdicionProtocolo() {
    await asegurarPlanificacion();

    if (!campaniasErp.length) {
      const respuesta = await obtenerCampaniasErpImportadas(sesion.token);
      setCampaniasErp(respuesta.campanias);
    }
  }

  useEffect(() => {
    if (!accionPendiente) {
      return;
    }

    if (accionPendiente.tipo === 'crear') {
      crearProtocoloVacio();
      setModoModal('crear');
    }

    if (accionPendiente.tipo === 'editar') {
      setProtocoloSeleccionadoId(accionPendiente.protocoloId);
      setModoModal('editar');
    }

    if (accionPendiente.tipo === 'copiar') {
      copiarProtocoloSeleccionado(accionPendiente.protocolo);
      setModoModal('copiar');
    }

    setModalAbierto(true);
    setAccionPendiente(null);
  }, [accionPendiente, copiarProtocoloSeleccionado, crearProtocoloVacio, setProtocoloSeleccionadoId]);

  async function abrirNuevoProtocolo() {
    await prepararEdicionProtocolo();
    setAccionPendiente({ tipo: 'crear' });
  }

  async function abrirEditarProtocolo(id: string) {
    await prepararEdicionProtocolo();
    setAccionPendiente({ tipo: 'editar', protocoloId: id });
  }

  async function abrirCopiarProtocolo(protocolo: ProtocoloProductivoDetalle) {
    await prepararEdicionProtocolo();
    setAccionPendiente({ tipo: 'copiar', protocolo });
  }

  async function guardarYContinuar() {
    await guardarProtocoloSeleccionado();
  }

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Protocolos productivos"
        title="Catalogo de protocolos"
        description="Plantillas reutilizables de labores e insumos para calcular costos productivos por hectarea."
        aside={<div className="status-pill">{protocolos.protocolos.length}</div>}
        actions={<Button variant="secondary" onClick={abrirNuevoProtocolo} disabled={!puedeConfigurarPlanificacion}>Nuevo protocolo</Button>}
      />

      <Panel
        title="Protocolos registrados"
        description="Listado para comparar, editar y copiar protocolos productivos."
        actions={<span className="status-pill">{protocolos.protocolos.length}</span>}
      >
        <DataTable
          rows={protocolos.protocolos}
          getRowKey={(protocolo) => protocolo.id}
          emptyMessage="Todavia no hay protocolos registrados."
          columns={[
            {
              key: 'nombre',
              label: 'Nombre',
              width: 'minmax(170px, 1.25fr)',
              render: (protocolo) => (
                <div className="stacked-cell">
                  <strong>{protocolo.nombre}</strong>
                  <span>{protocolo.descripcion}</span>
                  {protocolo.protocoloOrigenId && <em>Copia de {protocolo.protocoloOrigenId}</em>}
                </div>
              ),
            },
            {
              key: 'actividad',
              label: 'Actividad',
              width: 'minmax(130px, 0.9fr)',
              render: (protocolo) => {
                const actividad = actividadesPorId.get(protocolo.actividadAppId);
                return actividad?.nombre || protocolo.actividadErpId || protocolo.actividadAppId;
              },
            },
            {
              key: 'alcance',
              label: 'Alcance',
              width: 'minmax(120px, 0.8fr)',
              render: (protocolo) => {
                const zona = protocolo.zonaAppId ? zonasPorId.get(protocolo.zonaAppId) : undefined;
                const campo = protocolo.campoAppId ? camposPorId.get(protocolo.campoAppId) : undefined;
                return campo?.nombre || zona?.nombre || 'General';
              },
            },
            {
              key: 'fecha',
              label: 'Fechas',
              width: 'minmax(110px, 0.7fr)',
              render: (protocolo) => protocolo.tipoFecha === 'relativa_siembra' ? 'Relativa' : 'Absoluta',
            },
            {
              key: 'costo',
              label: 'Costo/ha',
              width: 'minmax(100px, 0.65fr)',
              render: (protocolo) => <strong>{formatearUsd(protocolo.costoEstimadoPorHa)}</strong>,
            },
            {
              key: 'actualizado',
              label: 'Actualizado',
              width: 'minmax(106px, 0.65fr)',
              render: (protocolo) => new Date(protocolo.updatedAt).toLocaleDateString('es-AR'),
            },
            {
              key: 'acciones',
              label: 'Acciones',
              width: 'minmax(132px, 0.75fr)',
              render: (protocolo) => (
                <div className="table-icon-actions">
                  <IconButton icon="edit" label={`Editar protocolo ${protocolo.nombre}`} onClick={() => abrirEditarProtocolo(protocolo.id)} disabled={!puedeConfigurarPlanificacion} />
                  <IconButton icon="copy" label={`Copiar protocolo ${protocolo.nombre}`} onClick={() => abrirCopiarProtocolo(protocolo)} disabled={!puedeConfigurarPlanificacion} />
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {modalAbierto && protocoloSeleccionado && (
        <ProtocoloModal
          modo={modoModal}
          protocolo={protocoloSeleccionado}
          planificacion={planificacion}
          campanias={campaniasDisponibles}
          puedeConfigurarPlanificacion={puedeConfigurarPlanificacion}
          guardandoProtocolo={guardandoProtocolo}
          onClose={() => setModalAbierto(false)}
          onGuardar={guardarYContinuar}
          actualizarProtocolos={actualizarProtocolos}
          agregarEtapaProtocolo={agregarEtapaProtocolo}
          actualizarEtapa={actualizarEtapa}
          agregarLabor={agregarLabor}
          agregarInsumo={agregarInsumo}
          formatearUsd={formatearUsd}
          leerNumero={leerNumero}
        />
      )}
    </section>
  );
}
