import { useState } from 'react';
import { PlanificacionEditorScreen } from './PlanificacionEditorScreen';
import { PlanificacionesResumenScreen } from './PlanificacionesResumenScreen';
import { PlanificacionBaseProps } from './planificacionTypes';

export function PlanificacionScreen(props: PlanificacionBaseProps) {
  const [modoEdicion, setModoEdicion] = useState(false);

  function abrirEditor(planificacionId: string) {
    props.seleccionarPlanificacion(planificacionId);
    setModoEdicion(true);
  }

  if (modoEdicion) {
    return <PlanificacionEditorScreen {...props} onVolverResumen={() => setModoEdicion(false)} />;
  }

  return <PlanificacionesResumenScreen {...props} onEditarPlanificacion={abrirEditor} />;
}
