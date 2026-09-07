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

  async function crearYEditarEscenario(datos: { nombre: string; campaniaErpId: string; descripcion?: string }) {
    const planificacionId = await props.crearEscenarioPlanificacion(datos);

    if (planificacionId) {
      setModoEdicion(true);
    }

    return Boolean(planificacionId);
  }

  async function copiarYEditarEscenario(planificacionId: string) {
    const copiaId = await props.copiarEscenarioPlanificacion(planificacionId);

    if (copiaId) {
      setModoEdicion(true);
    }

    return Boolean(copiaId);
  }

  if (modoEdicion) {
    return <PlanificacionEditorScreen {...props} onVolverResumen={() => setModoEdicion(false)} />;
  }

  return <PlanificacionesResumenScreen {...props} onEditarPlanificacion={abrirEditor} onNuevoEscenario={crearYEditarEscenario} onCopiarEscenario={copiarYEditarEscenario} />;
}
