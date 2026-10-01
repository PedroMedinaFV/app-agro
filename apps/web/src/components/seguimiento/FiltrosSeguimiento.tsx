import type { CampoApp, LoteApp } from '@agro/tipos';
import type { FiltroSeveridadSeguimiento } from '../../hooks/useSeguimientoOperativo';

type FiltrosSeguimientoProps = {
  campos: CampoApp[];
  lotesDisponibles: LoteApp[];
  filtroCampoId: string;
  filtroLoteId: string;
  filtroSeveridad: FiltroSeveridadSeguimiento;
  filtroDesde: string;
  filtroHasta: string;
  filtroTexto: string;
  onCampoChange: (campoId: string) => void;
  onLoteChange: (loteId: string) => void;
  onSeveridadChange: (severidad: FiltroSeveridadSeguimiento) => void;
  onDesdeChange: (desde: string) => void;
  onHastaChange: (hasta: string) => void;
  onTextoChange: (texto: string) => void;
};

export function FiltrosSeguimiento({
  campos,
  lotesDisponibles,
  filtroCampoId,
  filtroLoteId,
  filtroSeveridad,
  filtroDesde,
  filtroHasta,
  filtroTexto,
  onCampoChange,
  onLoteChange,
  onSeveridadChange,
  onDesdeChange,
  onHastaChange,
  onTextoChange,
}: FiltrosSeguimientoProps) {
  return (
    <div className="reference-modal-grid">
      <label>
        Campo
        <select value={filtroCampoId} onChange={(event) => onCampoChange(event.target.value)}>
          <option value="">Todos</option>
          {campos.map((campo) => (
            <option key={campo.id} value={campo.id}>{campo.nombre}</option>
          ))}
        </select>
      </label>

      <label>
        Lote
        <select value={filtroLoteId} onChange={(event) => onLoteChange(event.target.value)}>
          <option value="">Todos</option>
          {lotesDisponibles.map((lote) => (
            <option key={lote.id} value={lote.id}>{lote.nombre}</option>
          ))}
        </select>
      </label>

      <label>
        Severidad
        <select value={filtroSeveridad} onChange={(event) => onSeveridadChange(event.target.value as FiltroSeveridadSeguimiento)}>
          <option value="todas">Todas</option>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </select>
      </label>

      <label>
        Desde
        <input type="date" value={filtroDesde} onChange={(event) => onDesdeChange(event.target.value)} />
      </label>

      <label>
        Hasta
        <input type="date" value={filtroHasta} onChange={(event) => onHastaChange(event.target.value)} />
      </label>

      <label className="reference-wide">
        Buscar
        <input value={filtroTexto} onChange={(event) => onTextoChange(event.target.value)} placeholder="Campo, lote, titulo u observaciones" />
      </label>
    </div>
  );
}
