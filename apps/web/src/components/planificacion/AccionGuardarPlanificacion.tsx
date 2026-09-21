import { ActionBar } from '../ActionBar';
import { Button } from '../Button';
import { LoadingSpinner } from '../LoadingSpinner';

type AccionGuardarPlanificacionProps = {
  guardando: boolean;
  deshabilitado: boolean;
  onGuardar: () => void;
};

export function AccionGuardarPlanificacion({ guardando, deshabilitado, onGuardar }: AccionGuardarPlanificacionProps) {
  return (
    <ActionBar align="end">
      <Button variant="primary" onClick={onGuardar} disabled={deshabilitado}>
        <span className="button-content">
          {guardando && <LoadingSpinner label="Guardando planificacion" />}
          {guardando ? 'Guardando...' : 'Guardar borrador'}
        </span>
      </Button>
    </ActionBar>
  );
}
