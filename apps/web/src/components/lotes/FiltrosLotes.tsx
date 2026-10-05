import { ActionBar } from '../ActionBar';
import { Button } from '../Button';
import type { CampoSeleccionable } from './tiposLotes';

type FiltrosLotesProps = {
  filtro: string;
  filtroCampoClave: string;
  camposParaFiltrar: CampoSeleccionable[];
  puedeConfigurarPlanificacion: boolean;
  onCambiarFiltro: (filtro: string) => void;
  onCambiarCampo: (campoClave: string) => void;
  onNuevoLote: () => void;
};

export function FiltrosLotes({
  filtro,
  filtroCampoClave,
  camposParaFiltrar,
  puedeConfigurarPlanificacion,
  onCambiarFiltro,
  onCambiarCampo,
  onNuevoLote,
}: FiltrosLotesProps) {
  return (
    <ActionBar align="end">
      <label className="compact-field">
        Buscar
        <input value={filtro} onChange={(event) => onCambiarFiltro(event.target.value)} placeholder="Codigo, lote, campo o empresa" />
      </label>
      <label className="compact-field">
        Campo
        <select value={filtroCampoClave} onChange={(event) => onCambiarCampo(event.target.value)}>
          <option value="">Todos</option>
          {camposParaFiltrar.map((campo) => (
            <option key={campo.clave} value={campo.clave}>
              {campo.codigo ? `${campo.codigo} - ` : ''}{campo.nombre} ({campo.origen === 'erp' ? 'ERP' : 'Agro App'})
            </option>
          ))}
        </select>
      </label>
      <Button variant="primary" disabled={!puedeConfigurarPlanificacion} onClick={onNuevoLote}>
        Nuevo lote
      </Button>
    </ActionBar>
  );
}
