import { ModalConfirmacion } from '../ModalConfirmacion';

export type ConfirmacionQuitarAlcance = {
  etiqueta: string;
  lineaIds: string[];
  totalLineas: number;
  lineasConDatos: number;
};

type ModalQuitarAlcancePlanificacionProps = {
  confirmacion: ConfirmacionQuitarAlcance | null;
  onCerrar: () => void;
  onConfirmar: () => void;
};

export function ModalQuitarAlcancePlanificacion({
  confirmacion,
  onCerrar,
  onConfirmar,
}: ModalQuitarAlcancePlanificacionProps) {
  return (
    <ModalConfirmacion
      abierto={Boolean(confirmacion)}
      titulo="Quitar del escenario"
      descripcion="Esta accion solo modifica la planificacion actual. No elimina zonas, campos ni lotes del padron."
      confirmarTexto="Quitar lineas"
      varianteConfirmar="danger"
      onCerrar={onCerrar}
      onConfirmar={onConfirmar}
    >
      {confirmacion && (
        <>
          <div className="confirmation-summary">
            <article>
              <span>Alcance</span>
              <strong>{confirmacion.etiqueta}</strong>
            </article>
            <article>
              <span>Lineas a quitar</span>
              <strong>{confirmacion.totalLineas}</strong>
            </article>
            <article>
              <span>Con datos cargados</span>
              <strong>{confirmacion.lineasConDatos}</strong>
            </article>
          </div>

          <p className="hint">
            Al confirmar, estas lineas se quitaran del borrador. Para hacer efectivo el cambio en la base, despues guarda el borrador.
          </p>
        </>
      )}
    </ModalConfirmacion>
  );
}
