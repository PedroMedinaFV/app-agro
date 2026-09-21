import { Button } from '../Button';

export type TipoAlcancePlanificacion = 'zona' | 'campo' | 'lote';

type OpcionAlcance = {
  id: string;
  nombre: string;
};

type PlanificacionScopeActionsProps = {
  tipoAlcance: TipoAlcancePlanificacion;
  alcanceId: string;
  opciones: OpcionAlcance[];
  puedeEditar: boolean;
  onTipoAlcanceChange: (tipo: TipoAlcancePlanificacion) => void;
  onAlcanceChange: (alcanceId: string) => void;
  onAgregar: () => void;
};

export function PlanificacionScopeActions({
  tipoAlcance,
  alcanceId,
  opciones,
  puedeEditar,
  onTipoAlcanceChange,
  onAlcanceChange,
  onAgregar,
}: PlanificacionScopeActionsProps) {
  return (
    <section className="planning-scope-actions" aria-label="Alcance del escenario">
      <div>
        <p className="eyebrow">Alcance del escenario</p>
        <h3>Agregar zonas, campos o lotes</h3>
      </div>
      <label>
        Tipo
        <select value={tipoAlcance} onChange={(event) => onTipoAlcanceChange(event.target.value as TipoAlcancePlanificacion)} disabled={!puedeEditar}>
          <option value="zona">Zona</option>
          <option value="campo">Campo</option>
          <option value="lote">Lote</option>
        </select>
      </label>
      <label>
        Disponible
        <select value={alcanceId} onChange={(event) => onAlcanceChange(event.target.value)} disabled={!puedeEditar || opciones.length === 0}>
          <option value="">{opciones.length ? 'Seleccionar' : 'No hay disponibles'}</option>
          {opciones.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>
          ))}
        </select>
      </label>
      <Button variant="small" onClick={onAgregar} disabled={!puedeEditar || !alcanceId}>
        Agregar al escenario
      </Button>
    </section>
  );
}
