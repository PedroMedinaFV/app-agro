import { ModalConfirmacion } from '../ModalConfirmacion';

export type ConfirmacionCambioCampania = {
  campaniaErpId: string;
  codigo: string;
};

type ModalCambioCampaniaPlanificacionProps = {
  confirmacion: ConfirmacionCambioCampania | null;
  campaniaActual: string;
  totalLineas: number;
  onCerrar: () => void;
  onConfirmar: () => void;
};

export function ModalCambioCampaniaPlanificacion({
  confirmacion,
  campaniaActual,
  totalLineas,
  onCerrar,
  onConfirmar,
}: ModalCambioCampaniaPlanificacionProps) {
  return (
    <ModalConfirmacion
      abierto={Boolean(confirmacion)}
      titulo="Cambiar campania"
      descripcion="La campania define los protocolos disponibles y los calculos economicos del escenario."
      confirmarTexto="Cambiar y resetear"
      varianteConfirmar="danger"
      onCerrar={onCerrar}
      onConfirmar={onConfirmar}
    >
      {confirmacion && (
        <>
          <div className="confirmation-summary">
            <article>
              <span>Campania actual</span>
              <strong>{campaniaActual}</strong>
            </article>
            <article>
              <span>Nueva campania</span>
              <strong>{confirmacion.codigo}</strong>
            </article>
            <article>
              <span>Lineas afectadas</span>
              <strong>{totalLineas}</strong>
            </article>
          </div>

          <p className="hint">
            Al confirmar se quitaran los protocolos aplicados y se resetearan destino, rinde, precio, gastos comerciales, costos e indicadores economicos.
            Se conservan los lotes y hectareas cargadas.
          </p>
        </>
      )}
    </ModalConfirmacion>
  );
}
