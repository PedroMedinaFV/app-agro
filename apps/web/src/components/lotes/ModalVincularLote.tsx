import type { ErpCampo, ErpLote, LoteApp } from '@agro/tipos';
import { Button } from '../Button';

type SugerenciaLoteErp = {
  registro: ErpLote;
  motivo: string;
};

type ModalVincularLoteProps = {
  lote: LoteApp;
  loteErpVincularId: string;
  sugerencias: SugerenciaLoteErp[];
  camposErpPorId: Map<string, ErpCampo>;
  guardando: boolean;
  onClose: () => void;
  onChangeLoteErp: (loteErpId: string) => void;
  onConfirmar: () => void;
};

export function ModalVincularLote({
  lote,
  loteErpVincularId,
  sugerencias,
  camposErpPorId,
  guardando,
  onClose,
  onChangeLoteErp,
  onConfirmar,
}: ModalVincularLoteProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="vincular-lote-title">
        <div className="modal-header">
          <div>
            <h2 id="vincular-lote-title">Vincular lote provisorio</h2>
            <p className="hint">La vinculacion no modifica los datos historicos de planificacion; solo enlaza el lote propio con el identificador ERP.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="reference-modal-grid">
          <div className="reference-total">
            <span>Lote provisorio</span>
            <strong>{lote.nombre}</strong>
            <span>{lote.codigoInterno || 'Sin codigo interno'}</span>
          </div>
          <label className="reference-wide">
            Lote ERP disponible
            <select value={loteErpVincularId} onChange={(event) => onChangeLoteErp(event.target.value)}>
              {sugerencias.map(({ registro, motivo }) => {
                const campo = camposErpPorId.get(registro.campoErpId);

                return (
                  <option key={registro.erpId} value={registro.erpId}>
                    {registro.codigo ? `${registro.codigo} - ` : ''}{registro.nombre} ({campo?.nombre || `Campo ${registro.idCampo}`}; {motivo})
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <span className="hint">El backend valida que el lote ERP exista y que no este vinculado a otro lote del cliente.</span>
          <Button variant="primary" disabled={guardando || !loteErpVincularId} onClick={onConfirmar}>
            <span className="button-content">
              {guardando && <span className="loading-spinner" />}
              Vincular
            </span>
          </Button>
        </div>
      </section>
    </div>
  );
}
