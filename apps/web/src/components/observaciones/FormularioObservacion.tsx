import type { CampoApp, LoteApp, RecorridaCampo, SeveridadObservacion } from '@agro/tipos';
import { Button } from '../Button';
import { SelectorRecorrida } from '../recorridas/SelectorRecorrida';
import type { FormularioObservacion as FormularioObservacionDatos } from '../../utils/observaciones/helpersObservaciones';

type FormularioObservacionProps = {
  formulario: FormularioObservacionDatos;
  campos: CampoApp[];
  lotesDelCampo: LoteApp[];
  recorridasCompatibles: RecorridaCampo[];
  archivoAdjunto: File | null;
  puedeCrear: boolean;
  guardando: boolean;
  onChange: (cambios: Partial<FormularioObservacionDatos>) => void;
  onArchivoChange: (archivo: File | null) => void;
  onGuardar: () => void;
};

export function FormularioObservacion({
  formulario,
  campos,
  lotesDelCampo,
  recorridasCompatibles,
  archivoAdjunto,
  puedeCrear,
  guardando,
  onChange,
  onArchivoChange,
  onGuardar,
}: FormularioObservacionProps) {
  return (
    <>
      <div className="reference-modal-grid">
        <label>
          Campo
          <select
            value={formulario.campoAppId}
            disabled={!puedeCrear || guardando}
            onChange={(event) => onChange({ campoAppId: event.target.value })}
          >
            <option value="">Seleccionar campo</option>
            {campos.map((campo) => (
              <option key={campo.id} value={campo.id}>{campo.nombre}</option>
            ))}
          </select>
        </label>

        <label>
          Lote
          <select
            value={formulario.loteAppId}
            disabled={!puedeCrear || guardando || !formulario.campoAppId}
            onChange={(event) => onChange({ loteAppId: event.target.value })}
          >
            <option value="">Sin lote especifico</option>
            {lotesDelCampo.map((lote) => (
              <option key={lote.id} value={lote.id}>{lote.nombre}</option>
            ))}
          </select>
        </label>

        <label>
          Severidad
          <select
            value={formulario.severidad}
            disabled={!puedeCrear || guardando}
            onChange={(event) => onChange({ severidad: event.target.value as SeveridadObservacion })}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </label>

        <SelectorRecorrida
          recorridas={recorridasCompatibles}
          value={formulario.recorridaId}
          disabled={!puedeCrear || guardando || !formulario.campoAppId}
          onChange={(recorridaId) => onChange({ recorridaId })}
        />

        <label>
          Fecha y hora
          <input
            type="datetime-local"
            value={formulario.fechaEvento}
            disabled={!puedeCrear || guardando}
            onChange={(event) => onChange({ fechaEvento: event.target.value })}
          />
        </label>

        <label className="reference-wide">
          Titulo
          <input
            value={formulario.titulo}
            disabled={!puedeCrear || guardando}
            placeholder="Ej. Mancha foliar detectada"
            onChange={(event) => onChange({ titulo: event.target.value })}
          />
        </label>

        <label className="reference-wide">
          Descripcion
          <textarea
            value={formulario.descripcion}
            disabled={!puedeCrear || guardando}
            placeholder="Detalle de lo observado"
            onChange={(event) => onChange({ descripcion: event.target.value })}
          />
        </label>

        <label>
          Latitud
          <input
            type="number"
            step="0.000001"
            value={formulario.latitud}
            disabled={!puedeCrear || guardando}
            placeholder="-37.12345"
            onChange={(event) => onChange({ latitud: event.target.value })}
          />
        </label>

        <label>
          Longitud
          <input
            type="number"
            step="0.000001"
            value={formulario.longitud}
            disabled={!puedeCrear || guardando}
            placeholder="-58.12345"
            onChange={(event) => onChange({ longitud: event.target.value })}
          />
        </label>

        <label className="reference-wide">
          Foto adjunta
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            disabled={!puedeCrear || guardando}
            onChange={(event) => onArchivoChange(event.target.files?.[0] || null)}
          />
          {archivoAdjunto && <span>{archivoAdjunto.name} - {Math.round(archivoAdjunto.size / 1024)} KB</span>}
        </label>
      </div>

      <div className="modal-actions">
        <Button variant="primary" disabled={!puedeCrear || guardando} onClick={onGuardar}>
          {guardando ? 'Guardando...' : 'Guardar observacion'}
        </Button>
      </div>
    </>
  );
}
