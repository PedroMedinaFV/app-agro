import type { LoteApp } from '@agro/tipos';
import { Button } from '../Button';
import type { CampoSeleccionable } from './tiposLotes';

type ModoFormularioLote = 'crear' | 'editar' | 'copiar';

type FormularioLoteModalProps = {
  lote: LoteApp;
  modo: ModoFormularioLote;
  camposSeleccionables: CampoSeleccionable[];
  campoSeleccionadoClave: string;
  guardando: boolean;
  onClose: () => void;
  onSeleccionarCampo: (clave: string) => void;
  onActualizarLote: (lote: LoteApp) => void;
  onGuardar: () => void;
};

function leerNumeroPositivo(valor: string) {
  const numero = Number(valor);

  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

export function FormularioLoteModal({
  lote,
  modo,
  camposSeleccionables,
  campoSeleccionadoClave,
  guardando,
  onClose,
  onSeleccionarCampo,
  onActualizarLote,
  onGuardar,
}: FormularioLoteModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel">
        <div className="modal-header">
          <div>
            <h2>{modo === 'editar' ? 'Editar lote' : modo === 'copiar' ? 'Copiar lote' : 'Nuevo lote'}</h2>
            <p className="hint">Los lotes propios permiten planificar aunque todavia no existan en ALBOR.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="reference-modal-grid">
          <label className="reference-wide">
            Campo
            <select
              value={campoSeleccionadoClave || `agro:${lote.campoAppId}`}
              onChange={(event) => onSeleccionarCampo(event.target.value)}
            >
              {camposSeleccionables.map((campo) => (
                <option key={campo.clave} value={campo.clave}>
                  {campo.codigo ? `${campo.codigo} - ` : ''}{campo.nombre} ({campo.origen === 'erp' ? 'ERP' : 'Agro App'})
                </option>
              ))}
            </select>
          </label>
          <label>
            Codigo interno
            <input
              value={lote.codigoInterno || ''}
              onChange={(event) => onActualizarLote({ ...lote, codigoInterno: event.target.value })}
              placeholder="Se normaliza en mayusculas"
            />
          </label>
          <label className="reference-wide">
            Nombre
            <input
              value={lote.nombre}
              onChange={(event) => onActualizarLote({ ...lote, nombre: event.target.value })}
              placeholder="Nombre del lote"
            />
          </label>
          <label>
            Superficie total
            <input
              min="0"
              step="0.01"
              type="number"
              value={lote.superficieTotal}
              onChange={(event) => onActualizarLote({ ...lote, superficieTotal: leerNumeroPositivo(event.target.value) })}
            />
          </label>
          <label>
            Superficie productiva
            <input
              min="0"
              step="0.01"
              type="number"
              value={lote.superficieProductiva}
              onChange={(event) => onActualizarLote({ ...lote, superficieProductiva: leerNumeroPositivo(event.target.value) })}
            />
          </label>
        </div>

        <div className="modal-actions">
          <span className="hint">{modo === 'copiar' ? 'La copia se guarda como lote provisorio nuevo y queda lista para ajustar nombre o codigo.' : 'La vinculacion con ERP quedara como accion separada, propuesta y auditada.'}</span>
          <Button variant="primary" disabled={guardando} onClick={onGuardar}>
            <span className="button-content">
              {guardando && <span className="loading-spinner" />}
              Guardar
            </span>
          </Button>
        </div>
      </section>
    </div>
  );
}
