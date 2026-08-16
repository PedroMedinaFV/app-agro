import { useState } from 'react';
import { ErpSnapshot, PlanificacionSnapshot, ProtocoloProductivoDetalle, ProtocolosSnapshot } from '@agro/tipos';
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
  agregarLabor: (etapaId: string, laborReferenciaId?: string) => void;
  agregarInsumo: (etapaId: string, insumoPlanificacionId?: string) => void;
  formatearUsd: (valor: number) => string;
  leerNumero: (valor: string) => number;
}

export function ProtocolosScreen({
  protocolos,
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

        <div className="protocol-table">
          <div className="protocol-row protocol-head">
            <span>Nombre</span>
            <span>Actividad</span>
            <span>Campo</span>
            <span>Costo</span>
            <span>Actualizado</span>
            <span>Acciones</span>
          </div>
          {!protocolos.protocolos.length && (
            <div className="empty-state">Todavia no hay protocolos registrados.</div>
          )}
          {protocolos.protocolos.map((protocolo) => {
            const actividad = planificacion.actividadesPlanificacion?.find((item) => item.id === protocolo.actividadPlanificacionId);
            const campo = planificacion.camposPlanificacion.find((item) => item.id === protocolo.campoPlanificacionId);

            return (
              <div className="protocol-row" key={protocolo.id}>
                <div>
                  <strong>{protocolo.nombre}</strong>
                  <span>{protocolo.descripcion}</span>
                  {protocolo.protocoloOrigenId && <em>Copia de {protocolo.protocoloOrigenId}</em>}
                </div>
                <span>{actividad?.nombre || protocolo.actividadErpId || protocolo.actividadPlanificacionId}</span>
                <span>{campo?.nombre || 'General'}</span>
                <strong>{formatearUsd(protocolo.costoEstimadoPorHa)}</strong>
                <span>{new Date(protocolo.updatedAt).toLocaleDateString('es-AR')}</span>
                <div className="button-row">
                  <button className="small" onClick={() => abrirEditarProtocolo(protocolo.id)} disabled={!puedeConfigurarPlanificacion}>Editar</button>
                  <button className="small" onClick={() => abrirCopiarProtocolo(protocolo)} disabled={!puedeConfigurarPlanificacion}>Copiar</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {modalAbierto && protocoloSeleccionado && (
        <ProtocoloModal
          modo={modoModal}
          protocolo={protocoloSeleccionado}
          planificacion={planificacion}
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
