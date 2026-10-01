import type { CampoApp, LoteApp, RecorridaCampo } from '@agro/tipos';
import { DataTable } from '../DataTable';
import { IconButton } from '../IconButton';
import {
  obtenerEtiquetaObjetivoRecorrida,
} from '../../utils/recorridas/helpersRecorridas';
import { formatearFecha } from '../../utils/formatters';
import type { FiltroEstadoRecorrida } from '../../hooks/useRecorridas';

type TablaRecorridasProps = {
  recorridas: RecorridaCampo[];
  totalRecorridas: number;
  campos: CampoApp[];
  camposPorId: Map<string, CampoApp>;
  lotesPorId: Map<string, LoteApp>;
  filtroCampoId: string;
  filtroEstado: FiltroEstadoRecorrida;
  filtroTexto: string;
  puedeCerrar: boolean;
  cerrandoId: string | null;
  onFiltroCampoChange: (campoId: string) => void;
  onFiltroEstadoChange: (estado: FiltroEstadoRecorrida) => void;
  onFiltroTextoChange: (texto: string) => void;
  onCerrar: (recorrida: RecorridaCampo) => void;
};

export function TablaRecorridas({
  recorridas,
  totalRecorridas,
  campos,
  camposPorId,
  lotesPorId,
  filtroCampoId,
  filtroEstado,
  filtroTexto,
  puedeCerrar,
  cerrandoId,
  onFiltroCampoChange,
  onFiltroEstadoChange,
  onFiltroTextoChange,
  onCerrar,
}: TablaRecorridasProps) {
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
          Estado
          <select value={filtroEstado} onChange={(event) => onFiltroEstadoChange(event.target.value as FiltroEstadoRecorrida)}>
            <option value="todas">Todas</option>
            <option value="borrador">Borrador</option>
            <option value="en_curso">En curso</option>
            <option value="cerrada">Cerrada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>

        <label className="reference-wide">
          Buscar
          <input value={filtroTexto} onChange={(event) => onFiltroTextoChange(event.target.value)} placeholder="Titulo, campo, lote u observaciones" />
        </label>
      </div>

      <DataTable
        rows={recorridas}
        getRowKey={(recorrida) => recorrida.id}
        emptyMessage={totalRecorridas ? 'No hay recorridas con esos filtros.' : 'Todavia no hay recorridas registradas.'}
        columns={[
          {
            key: 'inicio',
            label: 'Inicio',
            width: 'minmax(110px, 0.7fr)',
            render: (recorrida) => formatearFecha(recorrida.fechaInicio),
          },
          {
            key: 'campo',
            label: 'Campo',
            width: 'minmax(170px, 1fr)',
            render: (recorrida) => <strong>{camposPorId.get(recorrida.campoAppId)?.nombre || recorrida.campoAppId}</strong>,
          },
          {
            key: 'lote',
            label: 'Lote',
            width: 'minmax(130px, 0.8fr)',
            render: (recorrida) => recorrida.loteAppId ? lotesPorId.get(recorrida.loteAppId)?.nombre || recorrida.loteAppId : 'Campo completo',
          },
          {
            key: 'detalle',
            label: 'Recorrida',
            width: 'minmax(220px, 1.2fr)',
            render: (recorrida) => (
              <>
                <strong>{recorrida.titulo}</strong>
                <span>{obtenerEtiquetaObjetivoRecorrida(recorrida.objetivo)}</span>
              </>
            ),
          },
          {
            key: 'observaciones',
            label: 'Hallazgos',
            width: 'minmax(100px, 0.6fr)',
            render: (recorrida) => (
              <>
                <strong>{recorrida.cantidadObservaciones}</strong>
                <span>{recorrida.severidadMaxima ? `Max. ${recorrida.severidadMaxima}` : 'Sin severidad'}</span>
              </>
            ),
          },
          {
            key: 'estado',
            label: 'Estado',
            width: 'minmax(100px, 0.6fr)',
            render: (recorrida) => <em>{recorrida.estado.replace('_', ' ')}</em>,
          },
          {
            key: 'acciones',
            label: 'Acciones',
            width: 'minmax(82px, 0.45fr)',
            render: (recorrida) => (
              <div className="table-icon-actions">
                <IconButton
                  icon="check"
                  label="Cerrar recorrida"
                  disabled={!puedeCerrar || cerrandoId === recorrida.id || recorrida.estado === 'cerrada' || recorrida.estado === 'cancelada'}
                  onClick={() => onCerrar(recorrida)}
                />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
