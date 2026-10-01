import type { CampoApp, LoteApp, ObservacionCampo, RecorridaCampo } from '@agro/tipos';
import { DataTable } from '../DataTable';
import { IconButton } from '../IconButton';
import { describirCoordenadasObservacion } from '../../utils/observaciones/helpersObservaciones';
import { formatearFechaHora } from '../../utils/formatters';
import type { FiltroSeveridadObservacion } from '../../hooks/useObservaciones';

type TablaObservacionesProps = {
  observaciones: ObservacionCampo[];
  totalObservaciones: number;
  campos: CampoApp[];
  lotesFiltro: LoteApp[];
  camposPorId: Map<string, CampoApp>;
  lotesPorId: Map<string, LoteApp>;
  recorridasPorId: Map<string, RecorridaCampo>;
  filtroCampoId: string;
  filtroLoteId: string;
  filtroSeveridad: FiltroSeveridadObservacion;
  filtroTexto: string;
  cargandoFicha: boolean;
  onFiltroCampoChange: (campoId: string) => void;
  onFiltroLoteChange: (loteId: string) => void;
  onFiltroSeveridadChange: (severidad: FiltroSeveridadObservacion) => void;
  onFiltroTextoChange: (texto: string) => void;
  onAbrirAdjunto: (adjuntoId: string) => void;
  onVerFichaLote: (loteAppId: string | undefined) => void;
};

export function TablaObservaciones({
  observaciones,
  totalObservaciones,
  campos,
  lotesFiltro,
  camposPorId,
  lotesPorId,
  recorridasPorId,
  filtroCampoId,
  filtroLoteId,
  filtroSeveridad,
  filtroTexto,
  cargandoFicha,
  onFiltroCampoChange,
  onFiltroLoteChange,
  onFiltroSeveridadChange,
  onFiltroTextoChange,
  onAbrirAdjunto,
  onVerFichaLote,
}: TablaObservacionesProps) {
  return (
    <>
      <div className="reference-modal-grid">
        <label>
          Campo
          <select value={filtroCampoId} onChange={(event) => onFiltroCampoChange(event.target.value)}>
            <option value="">Todos</option>
            {campos.map((campo) => (
              <option key={campo.id} value={campo.id}>{campo.nombre}</option>
            ))}
          </select>
        </label>

        <label>
          Lote
          <select value={filtroLoteId} onChange={(event) => onFiltroLoteChange(event.target.value)}>
            <option value="">Todos</option>
            {lotesFiltro.map((lote) => (
              <option key={lote.id} value={lote.id}>{lote.nombre}</option>
            ))}
          </select>
        </label>

        <label>
          Severidad
          <select value={filtroSeveridad} onChange={(event) => onFiltroSeveridadChange(event.target.value as FiltroSeveridadObservacion)}>
            <option value="todas">Todas</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </label>

        <label className="reference-wide">
          Buscar
          <input value={filtroTexto} onChange={(event) => onFiltroTextoChange(event.target.value)} placeholder="Titulo, descripcion, campo o lote" />
        </label>
      </div>

      <DataTable
        rows={observaciones}
        getRowKey={(observacion) => observacion.id}
        emptyMessage={totalObservaciones ? 'No hay observaciones con esos filtros.' : 'Todavia no hay observaciones registradas.'}
        columns={[
          {
            key: 'fecha',
            label: 'Fecha',
            width: 'minmax(130px, 0.8fr)',
            render: (observacion) => formatearFechaHora(observacion.fechaEvento),
          },
          {
            key: 'campo',
            label: 'Campo',
            width: 'minmax(170px, 1.1fr)',
            render: (observacion) => <strong>{camposPorId.get(observacion.campoAppId)?.nombre || observacion.campoAppId}</strong>,
          },
          {
            key: 'lote',
            label: 'Lote',
            width: 'minmax(130px, 0.8fr)',
            render: (observacion) => observacion.loteAppId ? lotesPorId.get(observacion.loteAppId)?.nombre || observacion.loteAppId : 'Campo completo',
          },
          {
            key: 'severidad',
            label: 'Severidad',
            width: 'minmax(92px, 0.6fr)',
            render: (observacion) => <em>{observacion.severidad}</em>,
          },
          {
            key: 'titulo',
            label: 'Titulo',
            width: 'minmax(170px, 1.1fr)',
            render: (observacion) => <><strong>{observacion.titulo}</strong><span>{observacion.descripcion}</span></>,
          },
          {
            key: 'recorrida',
            label: 'Recorrida',
            width: 'minmax(150px, 0.9fr)',
            render: (observacion) => {
              const recorrida = observacion.recorridaId ? recorridasPorId.get(observacion.recorridaId) : undefined;

              return recorrida ? <><strong>{recorrida.titulo}</strong><span>{recorrida.estado.replace('_', ' ')}</span></> : 'Sin recorrida';
            },
          },
          {
            key: 'ubicacion',
            label: 'Ubicacion',
            width: 'minmax(140px, 0.9fr)',
            render: describirCoordenadasObservacion,
          },
          {
            key: 'adjuntos',
            label: 'Adjuntos',
            width: 'minmax(110px, 0.7fr)',
            render: (observacion) => {
              const adjuntos = observacion.adjuntos || [];

              return adjuntos.length
                ? (
                  <>
                    <strong>{adjuntos.length}</strong>
                    {adjuntos.map((adjunto) => (
                      <button className="link-button" key={adjunto.id} type="button" onClick={() => onAbrirAdjunto(adjunto.id)}>
                        {adjunto.nombreArchivo}
                      </button>
                    ))}
                  </>
                )
                : 'Sin adjuntos';
            },
          },
          {
            key: 'acciones',
            label: '',
            width: 'minmax(54px, 0.35fr)',
            render: (observacion) => (
              <div className="table-icon-actions">
                <IconButton
                  icon="edit"
                  label="Ver ficha del lote"
                  disabled={!observacion.loteAppId || cargandoFicha}
                  onClick={() => onVerFichaLote(observacion.loteAppId)}
                />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
