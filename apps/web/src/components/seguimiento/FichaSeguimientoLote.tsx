import type { FichaLoteOperativoResponse, LoteMapaNdvi } from '@agro/tipos';
import { Panel } from '../Panel';
import {
  describirFechaSeguimiento,
  formatearNdvi,
  obtenerEstadoNdvi,
} from '../../utils/seguimiento/helpersSeguimiento';

type FichaSeguimientoLoteProps = {
  fichaLote: FichaLoteOperativoResponse;
  ultimoNdvi: LoteMapaNdvi | null;
  cargandoNdvi: boolean;
};

export function FichaSeguimientoLote({ fichaLote, ultimoNdvi, cargandoNdvi }: FichaSeguimientoLoteProps) {
  return (
    <Panel className="operative-detail-panel" title="Ficha del lote" description={`${fichaLote.campo.nombre} / ${fichaLote.lote.nombre}`}>
      <div className="operative-detail-grid">
        <article>
          <h3>Base</h3>
          <p><strong>Zona:</strong> {fichaLote.zona?.nombre || 'Sin zona'}</p>
          <p><strong>Total:</strong> {fichaLote.lote.superficieTotal.toFixed(1)} ha</p>
          <p><strong>Productiva:</strong> {fichaLote.lote.superficieProductiva.toFixed(1)} ha</p>
          <p><strong>Geografia:</strong> {fichaLote.geografia?.estado === 'procesado' ? 'Disponible' : fichaLote.geografia?.estado || 'Sin archivo'}</p>
          {fichaLote.geografia?.superficieCalculadaHa !== undefined && (
            <p><strong>Superficie KML/KMZ:</strong> {fichaLote.geografia.superficieCalculadaHa.toFixed(2)} ha</p>
          )}
        </article>

        <article>
          <h3>Cultivos ERP</h3>
          {fichaLote.cultivos.length ? fichaLote.cultivos.slice(0, 4).map((cultivo) => (
            <p key={cultivo.id}>{cultivo.nombre} - {cultivo.campaniaNombre || 'Sin campania'} - {cultivo.hectareas.toFixed(1)} ha</p>
          )) : <p>Sin cultivos asociados.</p>}
        </article>

        <article>
          <h3>Planificacion</h3>
          {fichaLote.planificaciones.length ? fichaLote.planificaciones.slice(0, 4).map((linea) => (
            <p key={linea.id}>{linea.planificacionNombre} - {linea.actividadNombre || 'Sin actividad'} - MB USD {linea.margenBrutoEstimado.toFixed(0)}</p>
          )) : <p>Sin planificacion asociada.</p>}
        </article>

        <article>
          <h3>Actividad reciente</h3>
          <p><strong>Lluvias 30 dias:</strong> {fichaLote.precipitaciones.milimetrosUltimos30Dias.toFixed(1)} mm</p>
          <p><strong>Ultima lluvia:</strong> {describirFechaSeguimiento(fichaLote.precipitaciones.ultimoEvento)}</p>
          <p><strong>Observaciones altas:</strong> {fichaLote.observaciones.cantidadAlta}</p>
        </article>

        <article>
          <h3>Ultimo NDVI</h3>
          {cargandoNdvi ? (
            <p>Cargando NDVI...</p>
          ) : ultimoNdvi ? (
            <>
              <p><strong>Estado:</strong> {obtenerEstadoNdvi(ultimoNdvi)}</p>
              <p><strong>Fecha imagen:</strong> {describirFechaSeguimiento(ultimoNdvi.fechaImagen)}</p>
              <p><strong>Promedio:</strong> {formatearNdvi(ultimoNdvi.ndviPromedio)}</p>
              <p><strong>Rango:</strong> {formatearNdvi(ultimoNdvi.ndviMinimo)} / {formatearNdvi(ultimoNdvi.ndviMaximo)}</p>
              <p><strong>Proveedor:</strong> {ultimoNdvi.proveedor}</p>
              {ultimoNdvi.storagePathPreview && <p><strong>Preview:</strong> disponible</p>}
            </>
          ) : (
            <>
              <p>Sin mapa NDVI disponible para este lote.</p>
              <p className="hint">Primero se debe cargar o importar una escena NDVI procesada.</p>
            </>
          )}
        </article>
      </div>
    </Panel>
  );
}
