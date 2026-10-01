import type { SesionUsuario } from '@agro/tipos';
import { FormularioRecorrida } from '../components/recorridas/FormularioRecorrida';
import { TablaRecorridas } from '../components/recorridas/TablaRecorridas';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { useRecorridas } from '../hooks/useRecorridas';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type MonitoreosScreenProps = {
  sesion: SesionUsuario;
  notificar?: Notificar;
};

export function MonitoreosScreen({ sesion, notificar }: MonitoreosScreenProps) {
  const recorridas = useRecorridas(sesion, notificar);

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Operacion de campo"
        title="Monitoreos"
        description="Planificacion liviana de recorridas, vinculada a campos, lotes y observaciones operativas."
        aside={<div className="status-pill">{recorridas.recorridasAbiertas} abierta(s)</div>}
      />

      <Panel title="Nueva recorrida" description={recorridas.estado}>
        <FormularioRecorrida
          formulario={recorridas.formulario}
          campos={recorridas.campos}
          lotesDelCampo={recorridas.lotesDelCampo}
          puedeCrear={recorridas.puedeCrear}
          guardando={recorridas.guardando}
          onChange={recorridas.actualizarFormulario}
          onGuardar={recorridas.guardarRecorrida}
        />
      </Panel>

      <Panel title="Recorridas" description={`Mostrando ${recorridas.recorridasFiltradas.length} de ${recorridas.recorridas.length}.`}>
        <TablaRecorridas
          recorridas={recorridas.recorridasFiltradas}
          totalRecorridas={recorridas.recorridas.length}
          campos={recorridas.campos}
          camposPorId={recorridas.camposPorId}
          lotesPorId={recorridas.lotesPorId}
          filtroCampoId={recorridas.filtroCampoId}
          filtroEstado={recorridas.filtroEstado}
          filtroTexto={recorridas.filtroTexto}
          puedeCerrar={recorridas.puedeCerrar}
          cerrandoId={recorridas.cerrandoId}
          onFiltroCampoChange={recorridas.setFiltroCampoId}
          onFiltroEstadoChange={recorridas.setFiltroEstado}
          onFiltroTextoChange={recorridas.setFiltroTexto}
          onCerrar={recorridas.cerrarRecorrida}
        />
      </Panel>
    </section>
  );
}
