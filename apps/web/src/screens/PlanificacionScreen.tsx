import { useState } from 'react';
import { PlanificacionEditorScreen } from './PlanificacionEditorScreen';
import { PlanificacionesResumenScreen } from './PlanificacionesResumenScreen';
import { PlanificacionBaseProps } from './planificacionTypes';
import { AnexosPlanificacionPanel } from '../components/planificacion/AnexosPlanificacionPanel';

export function PlanificacionScreen(props: PlanificacionBaseProps) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [originalAnexosId, setOriginalAnexosId] = useState<string>();
  const [errorEditor, setErrorEditor] = useState('');

  async function abrirEditor(planificacionId: string) {
    setErrorEditor('');
    const detalle = await props.asegurarDetallePlanificacion(planificacionId);
    if (!detalle) throw new Error('No se pudo cargar el documento. Volve a intentarlo.');
    props.seleccionarPlanificacion(planificacionId);
    setOriginalAnexosId(undefined);
    setModoEdicion(true);
  }

  async function crearYEditarEscenario(datos: { nombre: string; campaniaErpId: string; descripcion?: string }) {
    await props.asegurarPlanificacion();
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

  return <>
    {errorEditor && <p role="alert" className="form-error">{errorEditor}</p>}
    <PlanificacionesResumenScreen {...props} onEditarPlanificacion={(id) => { void abrirEditor(id).catch((e: unknown) => setErrorEditor(e instanceof Error ? e.message : 'No se pudo abrir el documento.')); }} onNuevoEscenario={crearYEditarEscenario} onCopiarEscenario={copiarYEditarEscenario} onVerAnexos={setOriginalAnexosId} />
    {originalAnexosId && <AnexosPlanificacionPanel key={originalAnexosId} originalId={originalAnexosId} token={props.sesion.token} puedeCrear={props.puedeEditarPlanificacionPorPermiso} onCerrar={() => setOriginalAnexosId(undefined)} onAbrir={abrirEditor} />}
  </>;
}
