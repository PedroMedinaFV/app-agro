import type { LoteApp, LoteArchivoGeografico } from '@agro/tipos';
import { Button } from '../Button';
import { LoteGeoPreview } from './LoteGeoPreview';

type ModalArchivosGeograficosLoteProps = {
  lote: LoteApp;
  archivos: LoteArchivoGeografico[];
  archivoSeleccionado: File | null;
  guardando: boolean;
  onClose: () => void;
  onSeleccionarArchivo: (archivo: File | null) => void;
  onSubirArchivo: () => void;
};

export function ModalArchivosGeograficosLote({
  lote,
  archivos,
  archivoSeleccionado,
  guardando,
  onClose,
  onSeleccionarArchivo,
  onSubirArchivo,
}: ModalArchivosGeograficosLoteProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="archivos-geograficos-lote-title">
        <div className="modal-header">
          <div>
            <h2 id="archivos-geograficos-lote-title">Archivos geograficos</h2>
            <p className="hint">{lote.nombre}. Vincula KML o KMZ para usar el lote en recorridas georreferenciadas.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="reference-modal-grid">
          <label className="reference-wide">
            Archivo KML/KMZ
            <input
              type="file"
              accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
              onChange={(event) => onSeleccionarArchivo(event.target.files?.[0] || null)}
            />
          </label>
          <div className="reference-total">
            <span>Archivos vinculados</span>
            <strong>{archivos.length}</strong>
            <span>{archivos.some((archivo) => archivo.esPrincipal) ? 'Con archivo principal' : 'Sin archivo principal'}</span>
          </div>
        </div>

        <div className="reference-list">
          {archivos.length === 0 ? (
            <p className="hint">Todavia no hay archivos geograficos vinculados a este lote.</p>
          ) : archivos.map((archivo) => (
            <article key={archivo.id} className="geo-file-row">
              <LoteGeoPreview archivo={archivo} />
              <div className="geo-file-data">
                <strong>{archivo.nombreArchivo}</strong>
                <span>{archivo.tipo.toUpperCase()} - {(archivo.tamanioBytes / 1024).toFixed(1)} KB</span>
                {archivo.superficieCalculadaHa !== undefined && (
                  <span>Superficie detectada: {archivo.superficieCalculadaHa.toFixed(2)} ha</span>
                )}
                {archivo.observaciones && <span>{archivo.observaciones}</span>}
              </div>
              <div className="table-icon-actions">
                <em>{archivo.esPrincipal ? 'Principal' : 'Archivo'}</em>
                <em>{archivo.estado.replace(/_/g, ' ')}</em>
              </div>
            </article>
          ))}
        </div>

        <div className="modal-actions">
          <span className="hint">El backend procesa el archivo y guarda GeoJSON para mobile, recorridas y vista de mapa.</span>
          <Button variant="primary" disabled={guardando || !archivoSeleccionado} onClick={onSubirArchivo}>
            <span className="button-content">
              {guardando && <span className="loading-spinner" />}
              Vincular archivo
            </span>
          </Button>
        </div>
      </section>
    </div>
  );
}
