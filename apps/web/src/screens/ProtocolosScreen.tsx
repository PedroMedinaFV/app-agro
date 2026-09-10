import { useState } from 'react';
import { ErpSnapshot, PlanificacionSnapshot, ProtocoloProductivoDetalle, ProtocolosSnapshot } from '@agro/tipos';
import { DataTable } from '../components/DataTable';
import { ProtocoloModal } from '../components/protocolos/ProtocoloModal';

interface ProtocolosScreenProps {
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
  actualizarProtocolos: (updater: (protocolo: ProtocoloProductivoDetalle) => ProtocoloProductivoDetalle) => void;
  agregarEtapaProtocolo: () => void;
  actualizarEtapa: (etapaId: string, updates: Partial<ProtocoloProductivoDetalle['etapas'][number]>) => void;
  agregarLabor: (etapaId: string, servicioAppId?: string) => void;
  agregarInsumo: (etapaId: string, insumoAppId?: string) => void;
  formatearUsd: (valor: number) => string;
  leerNumero: (valor: string) => number;
}

export function ProtocolosScreen({
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

  function abrirNuevoProtocolo() {
    crearProtocoloVacio();
    setModoModal('crear');
    setModalAbierto(true);
  }

  function abrirEditarProtocolo(id: string) {
    setProtocoloSeleccionadoId(id);
    setModoModal('editar');
    setModalAbierto(true);
  }

  function abrirCopiarProtocolo(protocolo: ProtocoloProductivoDetalle) {
    copiarProtocoloSeleccionado(protocolo);
    setModoModal('copiar');
    setModalAbierto(true);
  }

  async function guardarYContinuar() {
    await guardarProtocoloSeleccionado();
  }

  return (
    <section className="planning-stack">
      <section className="planning-hero">
        <div>
          <p className="eyebrow">Protocolos productivos</p>
          <h2>Catalogo de protocolos</h2>
          <p className="hint">Plantillas reutilizables de labores e insumos para calcular costos productivos por hectarea.</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={abrirNuevoProtocolo} disabled={!puedeConfigurarPlanificacion}>Nuevo protocolo</button>
        </div>
        <div className="status-pill">{protocolos.protocolos.length}</div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Protocolos registrados</h2>
            <p className="hint">Listado para comparar, editar y copiar protocolos productivos.</p>
          </div>
          <span className="status-pill">{protocolos.protocolos.length}</span>
        </div>

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
                const actividad = planificacion.actividadesApp?.find((item) => item.id === protocolo.actividadAppId);
                return actividad?.nombre || protocolo.actividadErpId || protocolo.actividadAppId;
              },
            },
            {
              key: 'alcance',
              label: 'Alcance',
              width: 'minmax(120px, 0.8fr)',
              render: (protocolo) => {
                const zona = planificacion.zonasApp?.find((item) => item.id === protocolo.zonaAppId);
                const campo = planificacion.camposApp.find((item) => item.id === protocolo.campoAppId);
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
                <div className="button-row compact">
                  <button className="small" onClick={() => abrirEditarProtocolo(protocolo.id)} disabled={!puedeConfigurarPlanificacion}>Editar</button>
                  <button className="small" onClick={() => abrirCopiarProtocolo(protocolo)} disabled={!puedeConfigurarPlanificacion}>Copiar</button>
                </div>
              ),
            },
          ]}
        />
      </section>

      {modalAbierto && protocoloSeleccionado && (
        <ProtocoloModal
          modo={modoModal}
          protocolo={protocoloSeleccionado}
          planificacion={planificacion}
          campanias={snapshot.campanias}
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
