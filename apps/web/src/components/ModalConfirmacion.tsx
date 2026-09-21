import type { ReactNode } from 'react';
import { Button } from './Button';

type VarianteConfirmacion = 'primary' | 'danger';

type ModalConfirmacionProps = {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  cerrarTexto?: string;
  cancelarTexto?: string;
  confirmarTexto: string;
  varianteConfirmar?: VarianteConfirmacion;
  onCerrar: () => void;
  onConfirmar: () => void;
  children?: ReactNode;
};

export function ModalConfirmacion({
  abierto,
  titulo,
  descripcion,
  cerrarTexto = 'Cerrar',
  cancelarTexto = 'Cancelar',
  confirmarTexto,
  varianteConfirmar = 'primary',
  onCerrar,
  onConfirmar,
  children,
}: ModalConfirmacionProps) {
  if (!abierto) {
    return null;
  }

  const tituloId = `modal-confirmacion-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel modal-panel-narrow" role="dialog" aria-modal="true" aria-labelledby={tituloId}>
        <div className="modal-header">
          <div>
            <h2 id={tituloId}>{titulo}</h2>
            {descripcion && <p className="hint">{descripcion}</p>}
          </div>
          <Button variant="ghost" onClick={onCerrar}>
            {cerrarTexto}
          </Button>
        </div>

        {children}

        <div className="modal-actions">
          <Button variant="ghost" onClick={onCerrar}>
            {cancelarTexto}
          </Button>
          <Button variant={varianteConfirmar} onClick={onConfirmar}>
            {confirmarTexto}
          </Button>
        </div>
      </section>
    </div>
  );
}
