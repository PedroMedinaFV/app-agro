import type { CampoApp, LoteApp, ObjetivoRecorridaCampo } from '@agro/tipos';
import { Button } from '../Button';
import { FechaInput } from '../FechaInput';
import { objetivosRecorrida } from '../../utils/recorridas/helpersRecorridas';
import type { FormularioRecorrida as FormularioRecorridaValores } from '../../utils/recorridas/helpersRecorridas';

type FormularioRecorridaProps = {
  formulario: FormularioRecorridaValores;
  campos: CampoApp[];
  lotesDelCampo: LoteApp[];
  puedeCrear: boolean;
  guardando: boolean;
  onChange: (cambios: Partial<FormularioRecorridaValores>) => void;
  onGuardar: () => void;
};

export function FormularioRecorrida({
  formulario,
  campos,
  lotesDelCampo,
  puedeCrear,
  guardando,
  onChange,
  onGuardar,
}: FormularioRecorridaProps) {
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
            <option value="">Campo completo</option>
            {lotesDelCampo.map((lote) => (
              <option key={lote.id} value={lote.id}>{lote.nombre}</option>
            ))}
          </select>
        </label>

        <label>
          Objetivo
          <select
            value={formulario.objetivo}
            disabled={!puedeCrear || guardando}
            onChange={(event) => onChange({ objetivo: event.target.value as ObjetivoRecorridaCampo })}
          >
            {objetivosRecorrida.map((objetivo) => (
              <option key={objetivo.valor} value={objetivo.valor}>{objetivo.etiqueta}</option>
            ))}
          </select>
        </label>

        <label>
          Fecha
          <FechaInput
            value={formulario.fechaInicio}
            disabled={!puedeCrear || guardando}
            onChange={(fechaInicio) => onChange({ fechaInicio })}
          />
        </label>

        <label className="reference-wide">
          Titulo
          <input
            value={formulario.titulo}
            disabled={!puedeCrear || guardando}
            placeholder="Ej. Recorrida malezas lote norte"
            onChange={(event) => onChange({ titulo: event.target.value })}
          />
        </label>

        <label className="reference-wide">
          Observaciones
          <input
            value={formulario.observaciones}
            disabled={!puedeCrear || guardando}
            placeholder="Comentario opcional"
            onChange={(event) => onChange({ observaciones: event.target.value })}
          />
        </label>
      </div>

      <div className="modal-actions">
        <Button variant="primary" disabled={!puedeCrear || guardando} onClick={onGuardar}>
          {guardando ? 'Guardando...' : 'Crear recorrida'}
        </Button>
      </div>
    </>
  );
}
