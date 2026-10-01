import type { FichaLoteOperativoResponse } from '@agro/tipos';
import { Button } from '../Button';
import { Panel } from '../Panel';
import { formatearFechaHora } from '../../utils/formatters';

type FichaLoteObservacionesProps = {
  fichaLote: FichaLoteOperativoResponse;
  onCerrar: () => void;
};

export function FichaLoteObservaciones({ fichaLote, onCerrar }: FichaLoteObservacionesProps) {
  return (
    <Panel
      className="operative-detail-panel"
      title="Ficha del lote"
      description={`${fichaLote.campo.nombre} / ${fichaLote.lote.nombre}`}
      actions={<Button variant="ghost" onClick={onCerrar}>Cerrar</Button>}
    >

      <section className="metrics operative-metrics">
        <article><span>Superficie total</span><strong>{fichaLote.lote.superficieTotal.toFixed(1)} ha</strong></article>
        <article><span>Productiva</span><strong>{fichaLote.lote.superficieProductiva.toFixed(1)} ha</strong></article>
        <article><span>Lluvias 30 dias</span><strong>{fichaLote.precipitaciones.milimetrosUltimos30Dias.toFixed(1)} mm</strong></article>
        <article><span>Observaciones altas</span><strong>{fichaLote.observaciones.cantidadAlta}</strong></article>
      </section>

      <div className="operative-detail-grid">
        <article>
          <h3>Ubicacion operativa</h3>
          <p><strong>Zona:</strong> {fichaLote.zona?.nombre || 'Sin zona'}</p>
          <p><strong>Estado lote:</strong> {fichaLote.lote.estadoVinculacion}</p>
          <p><strong>Codigo:</strong> {fichaLote.lote.codigoInterno || 'Sin codigo'}</p>
          <p><strong>Geografia:</strong> {fichaLote.geografia?.estado === 'procesado' ? 'Disponible' : fichaLote.geografia?.estado || 'Sin archivo'}</p>
          {fichaLote.geografia?.superficieCalculadaHa !== undefined && (
            <p><strong>Superficie KML/KMZ:</strong> {fichaLote.geografia.superficieCalculadaHa.toFixed(2)} ha</p>
          )}
        </article>

        <article>
          <h3>Cultivos ERP</h3>
          {fichaLote.cultivos.length ? fichaLote.cultivos.slice(0, 4).map((cultivo) => (
            <p key={cultivo.id}>{cultivo.nombre} - {cultivo.campaniaNombre || 'Sin campania'} - {cultivo.hectareas.toFixed(1)} ha</p>
          )) : <p>Sin cultivos ERP asociados.</p>}
        </article>

        <article>
          <h3>Planificacion</h3>
          {fichaLote.planificaciones.length ? fichaLote.planificaciones.slice(0, 4).map((linea) => (
            <p key={linea.id}>{linea.planificacionNombre} - {linea.actividadNombre || 'Sin actividad'} - MB USD {linea.margenBrutoEstimado.toFixed(0)}</p>
          )) : <p>Sin lineas de planificacion asociadas.</p>}
        </article>

        <article>
          <h3>Ultimas observaciones</h3>
          {fichaLote.observaciones.ultimas.length ? fichaLote.observaciones.ultimas.map((observacion) => (
            <p key={observacion.id}>{formatearFechaHora(observacion.fechaEvento)} - {observacion.severidad} - {observacion.titulo} - {observacion.cantidadAdjuntos} adj.</p>
          )) : <p>Sin observaciones registradas.</p>}
        </article>
      </div>
    </Panel>
  );
}
