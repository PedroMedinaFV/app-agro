import type { SesionUsuario } from '@agro/tipos';
import { FichaSeguimientoLote } from '../components/seguimiento/FichaSeguimientoLote';
import { FiltrosSeguimiento } from '../components/seguimiento/FiltrosSeguimiento';
import { MetricasSeguimiento } from '../components/seguimiento/MetricasSeguimiento';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { TablaSeguimientoObservaciones } from '../components/seguimiento/TablaSeguimientoObservaciones';
import { TablaSeguimientoPrecipitaciones } from '../components/seguimiento/TablaSeguimientoPrecipitaciones';
import { useSeguimientoOperativo } from '../hooks/useSeguimientoOperativo';

type Notificar = (toast: { tipo: 'success' | 'error' | 'info'; titulo: string; mensaje?: string }) => void;

type SeguimientoOperativoScreenProps = {
  sesion: SesionUsuario;
  notificar?: Notificar;
};

export function SeguimientoOperativoScreen({ sesion, notificar }: SeguimientoOperativoScreenProps) {
  const seguimiento = useSeguimientoOperativo(sesion, notificar);

  return (
    <section className="planning-stack">
      <PageHeader
        eyebrow="Seguimiento operativo"
        title="Campo y lote"
        description={seguimiento.estado}
        aside={<div className="status-pill">{seguimiento.observacionesFiltradas.length} obs.</div>}
      />

      <Panel>
        <FiltrosSeguimiento
          campos={seguimiento.campos}
          lotesDisponibles={seguimiento.lotesDisponibles}
          filtroCampoId={seguimiento.filtroCampoId}
          filtroLoteId={seguimiento.filtroLoteId}
          filtroSeveridad={seguimiento.filtroSeveridad}
          filtroDesde={seguimiento.filtroDesde}
          filtroHasta={seguimiento.filtroHasta}
          filtroTexto={seguimiento.filtroTexto}
          onCampoChange={seguimiento.seleccionarCampo}
          onLoteChange={seguimiento.seleccionarLote}
          onSeveridadChange={seguimiento.setFiltroSeveridad}
          onDesdeChange={seguimiento.setFiltroDesde}
          onHastaChange={seguimiento.setFiltroHasta}
          onTextoChange={seguimiento.setFiltroTexto}
        />
      </Panel>

      <MetricasSeguimiento
        observaciones={seguimiento.observacionesFiltradas.length}
        adjuntos={seguimiento.adjuntos}
        precipitaciones={seguimiento.precipitacionesFiltradas.length}
        totalMm={seguimiento.totalMm}
      />

      {seguimiento.fichaLote && (
        <FichaSeguimientoLote
          fichaLote={seguimiento.fichaLote}
          ultimoNdvi={seguimiento.ultimoNdvi}
          cargandoNdvi={seguimiento.cargandoNdvi}
        />
      )}

      <Panel title="Observaciones" description="Registros operativos generados desde web y mobile.">
        <TablaSeguimientoObservaciones
          observaciones={seguimiento.observacionesFiltradas}
          camposPorId={seguimiento.camposPorId}
          lotesPorId={seguimiento.lotesPorId}
          abrirAdjunto={seguimiento.abrirAdjunto}
        />
      </Panel>

      <Panel title="Precipitaciones" description="Lluvias registradas para el mismo alcance operativo.">
        <TablaSeguimientoPrecipitaciones
          precipitaciones={seguimiento.precipitacionesFiltradas}
          camposPorId={seguimiento.camposPorId}
          lotesPorId={seguimiento.lotesPorId}
        />
      </Panel>
    </section>
  );
}
