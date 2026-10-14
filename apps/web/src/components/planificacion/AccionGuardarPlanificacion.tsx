import { ActionBar } from '../ActionBar';
import { Button } from '../Button';
import { LoadingSpinner } from '../LoadingSpinner';

type AccionGuardarPlanificacionProps = {
  guardando: boolean;
  deshabilitado: boolean;
  cancelarDeshabilitado?: boolean;
  onGuardar: () => void;
  onCancelar: () => void;
};

export function AccionGuardarPlanificacion({
  guardando,
  deshabilitado,
  cancelarDeshabilitado,
  onGuardar,
  onCancelar,
}: AccionGuardarPlanificacionProps) {
  return (
    <ActionBar align="end">
      <Button variant="ghost" onClick={onCancelar} disabled={cancelarDeshabilitado || guardando}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={onGuardar} disabled={deshabilitado}>
        <span className="button-content">
          {guardando && <LoadingSpinner label="Guardando planificacion" />}
          {guardando ? 'Guardando...' : 'Guardar borrador'}
        </span>
      </Button>
    </ActionBar>
  );
}
