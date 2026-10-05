import type { ErpLote, LoteApp } from '@agro/tipos';
import { DataTable } from '../DataTable';
import { IconButton } from '../IconButton';
import { OriginBadge } from '../OriginBadge';
import type { LoteTabla } from '../../utils/lotes/helpersLotes';

type TablaLotesProps = {
  filas: LoteTabla[];
  puedeConfigurarPlanificacion: boolean;
  onEditarLote: (lote: LoteApp) => void;
  onCopiarLote: (lote: LoteApp) => void;
  onCopiarLoteErp: (lote: ErpLote) => void;
  onAbrirArchivosGeograficos: (lote: LoteApp) => void;
  onAbrirVinculacion: (lote: LoteApp) => void;
};

export function TablaLotes({
  filas,
  puedeConfigurarPlanificacion,
  onEditarLote,
  onCopiarLote,
  onCopiarLoteErp,
  onAbrirArchivosGeograficos,
  onAbrirVinculacion,
}: TablaLotesProps) {
  return (
    <DataTable
      rows={filas}
      getRowKey={(fila) => fila.id}
      emptyMessage="Todavia no hay lotes para el filtro seleccionado."
      initialPageSize={25}
      columns={[
        {
          key: 'lote',
          label: 'Lote',
          width: 'minmax(190px, 1.35fr)',
          render: (fila) => (
            <>
              <strong>{fila.nombre}</strong>
              <span>{fila.detalle}</span>
            </>
          ),
        },
        { key: 'campo', label: 'Campo', width: 'minmax(150px, 1fr)', render: (fila) => fila.campo },
        { key: 'superficie', label: 'Superficie', width: 'minmax(110px, 0.75fr)', render: (fila) => fila.superficie },
        { key: 'origen', label: 'Origen', width: 'minmax(86px, 0.55fr)', render: (fila) => <OriginBadge origen={fila.origen} /> },
        { key: 'estado', label: 'Estado', width: 'minmax(110px, 0.7fr)', render: (fila) => <em>{fila.estado}</em> },
        {
          key: 'accion',
          label: 'Accion',
          width: 'minmax(190px, 0.85fr)',
          render: (fila) => fila.accion === 'editar'
            ? (
              <div className="table-icon-actions">
                <IconButton icon="edit" label={`Editar lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && onEditarLote(fila.lotePropio)} />
                <IconButton icon="copy" label={`Copiar lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && onCopiarLote(fila.lotePropio)} />
                <IconButton icon="map" label={`Archivos geograficos de ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && onAbrirArchivosGeograficos(fila.lotePropio)} />
                {fila.lotePropio?.estadoVinculacion === 'provisorio' && (
                  <IconButton icon="link" label={`Vincular lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion} onClick={() => fila.lotePropio && onAbrirVinculacion(fila.lotePropio)} />
                )}
              </div>
            )
            : (
              <div className="table-icon-actions">
                <IconButton icon="copy" label={`Copiar lote ${fila.nombre}`} disabled={!puedeConfigurarPlanificacion || !fila.loteErp} onClick={() => fila.loteErp && onCopiarLoteErp(fila.loteErp)} />
              </div>
            ),
        },
      ]}
    />
  );
}
