import type { SesionUsuario } from '@agro/tipos';
import { FichaLoteObservaciones } from '../components/observaciones/FichaLoteObservaciones';
import { FormularioObservacion } from '../components/observaciones/FormularioObservacion';
import { TablaObservaciones } from '../components/observaciones/TablaObservaciones';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { useObservaciones } from '../hooks/useObservaciones';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type ObservacionesScreenProps = {
  sesion: SesionUsuario;
  notificar?: Notificar;
};

export function ObservacionesScreen({ sesion, notificar }: ObservacionesScreenProps) {
  const observaciones = useObservaciones(sesion, notificar);

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Operacion de campo"
        title="Observaciones"
        description="Carga y consulta de observaciones operativas por campo y lote, con severidad y ubicacion opcional."
        aside={<div className="status-pill">{observaciones.observacionesAltas} alta(s)</div>}
      />

      <Panel title="Nueva observacion" description={observaciones.estado}>
        <FormularioObservacion
          formulario={observaciones.formulario}
          campos={observaciones.campos}
          lotesDelCampo={observaciones.lotesDelCampo}
          recorridasCompatibles={observaciones.recorridasAbiertasCompatibles}
          archivoAdjunto={observaciones.archivoAdjunto}
          puedeCrear={observaciones.puedeCrear}
          guardando={observaciones.guardando}
          onChange={observaciones.actualizarFormulario}
          onArchivoChange={observaciones.setArchivoAdjunto}
          onGuardar={observaciones.guardar}
        />
      </Panel>

      <Panel title="Registros" description={`Ultimas observaciones registradas dentro del alcance de la sesion. Mostrando ${observaciones.observacionesFiltradas.length} de ${observaciones.observaciones.length}.`}>
        <TablaObservaciones
          observaciones={observaciones.observacionesFiltradas}
          totalObservaciones={observaciones.observaciones.length}
          campos={observaciones.campos}
          lotesFiltro={observaciones.lotesFiltro}
          camposPorId={observaciones.camposPorId}
          lotesPorId={observaciones.lotesPorId}
          recorridasPorId={observaciones.recorridasPorId}
          filtroCampoId={observaciones.filtroCampoId}
          filtroLoteId={observaciones.filtroLoteId}
          filtroSeveridad={observaciones.filtroSeveridad}
          filtroTexto={observaciones.filtroTexto}
          cargandoFicha={observaciones.cargandoFicha}
          onFiltroCampoChange={observaciones.cambiarFiltroCampo}
          onFiltroLoteChange={observaciones.setFiltroLoteId}
          onFiltroSeveridadChange={observaciones.setFiltroSeveridad}
          onFiltroTextoChange={observaciones.setFiltroTexto}
          onAbrirAdjunto={observaciones.abrirAdjunto}
          onVerFichaLote={observaciones.verFichaLote}
        />
      </Panel>

      {observaciones.fichaLote && (
        <FichaLoteObservaciones
          fichaLote={observaciones.fichaLote}
          onCerrar={() => observaciones.setFichaLote(null)}
        />
      )}
    </section>
  );
}
