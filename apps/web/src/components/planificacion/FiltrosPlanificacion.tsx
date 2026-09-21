import { Button } from '../Button';

export type EstadoCargaFiltro = 'todos' | 'completas' | 'pendientes' | 'duplicadas';

type OpcionFiltro = {
  id: string;
  nombre: string;
};

type FiltrosPlanificacionProps = {
  busqueda: string;
  filtroZonaId: string;
  filtroCampoId: string;
  filtroEstadoCarga: EstadoCargaFiltro;
  zonas: OpcionFiltro[];
  campos: OpcionFiltro[];
  lineasFiltradas: number;
  totalLineas: number;
  onBusquedaChange: (valor: string) => void;
  onZonaChange: (zonaId: string) => void;
  onCampoChange: (campoId: string) => void;
  onEstadoCargaChange: (estado: EstadoCargaFiltro) => void;
  onLimpiar: () => void;
};

export function FiltrosPlanificacion({
  busqueda,
  filtroZonaId,
  filtroCampoId,
  filtroEstadoCarga,
  zonas,
  campos,
  lineasFiltradas,
  totalLineas,
  onBusquedaChange,
  onZonaChange,
  onCampoChange,
  onEstadoCargaChange,
  onLimpiar,
}: FiltrosPlanificacionProps) {
  const tieneFiltros = Boolean(busqueda || filtroZonaId || filtroCampoId || filtroEstadoCarga !== 'todos');

  return (
    <section className="planning-filters" aria-label="Filtros de planificacion">
      <label>
        Buscar
        <input
          value={busqueda}
          onChange={(event) => onBusquedaChange(event.target.value)}
          placeholder="Zona, campo, lote, protocolo o destino"
        />
      </label>
      <label>
        Zona
        <select value={filtroZonaId} onChange={(event) => onZonaChange(event.target.value)}>
          <option value="">Todas las zonas</option>
          {zonas.map((zona) => (
            <option key={zona.id} value={zona.id}>{zona.nombre}</option>
          ))}
        </select>
      </label>
      <label>
        Campo
        <select value={filtroCampoId} onChange={(event) => onCampoChange(event.target.value)}>
          <option value="">Todos los campos</option>
          {campos.map((campo) => (
            <option key={campo.id} value={campo.id}>{campo.nombre}</option>
          ))}
        </select>
      </label>
      <label>
        Estado de carga
        <select value={filtroEstadoCarga} onChange={(event) => onEstadoCargaChange(event.target.value as EstadoCargaFiltro)}>
          <option value="todos">Todos</option>
          <option value="completas">Completas</option>
          <option value="pendientes">Pendientes</option>
          <option value="duplicadas">Duplicadas</option>
        </select>
      </label>
      <div className="planning-filter-summary">
        <strong>{lineasFiltradas}</strong>
        <span>de {totalLineas} lineas</span>
        <Button variant="small" onClick={onLimpiar} disabled={!tieneFiltros}>
          Limpiar
        </Button>
      </div>
    </section>
  );
}
