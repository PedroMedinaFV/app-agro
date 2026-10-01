import type { CampoApp, LoteApp, ObservacionCampo } from '@agro/tipos';
import { DataTable } from '../DataTable';
import { describirFechaSeguimiento } from '../../utils/seguimiento/helpersSeguimiento';

type TablaSeguimientoObservacionesProps = {
  observaciones: ObservacionCampo[];
  camposPorId: Map<string, CampoApp>;
  lotesPorId: Map<string, LoteApp>;
  abrirAdjunto: (adjuntoId: string) => void;
};

export function TablaSeguimientoObservaciones({
  observaciones,
  camposPorId,
  lotesPorId,
  abrirAdjunto,
}: TablaSeguimientoObservacionesProps) {
  return (
    <DataTable
      rows={observaciones}
      getRowKey={(observacion) => observacion.id}
      emptyMessage="No hay observaciones para los filtros seleccionados."
      columns={[
        {
          key: 'fecha',
          label: 'Fecha',
          width: 'minmax(130px, 0.8fr)',
          render: (observacion) => describirFechaSeguimiento(observacion.fechaEvento),
        },
        {
          key: 'campo',
          label: 'Campo',
          width: 'minmax(160px, 1fr)',
          render: (observacion) => (
            <strong>{camposPorId.get(observacion.campoAppId)?.nombre || observacion.campoAppId}</strong>
          ),
        },
        {
          key: 'lote',
          label: 'Lote',
          width: 'minmax(130px, 0.8fr)',
          render: (observacion) => (
            observacion.loteAppId
              ? lotesPorId.get(observacion.loteAppId)?.nombre || observacion.loteAppId
              : 'Campo completo'
          ),
        },
        {
          key: 'titulo',
          label: 'Titulo',
          width: 'minmax(190px, 1.4fr)',
          render: (observacion) => (
            <>
              <strong>{observacion.titulo}</strong>
              <span>{observacion.descripcion}</span>
            </>
          ),
        },
        {
          key: 'severidad',
          label: 'Sev.',
          width: 'minmax(72px, 0.4fr)',
          render: (observacion) => observacion.severidad,
        },
        {
          key: 'adjuntos',
          label: 'Adjuntos',
          width: 'minmax(110px, 0.7fr)',
          render: (observacion) => observacion.adjuntos?.length
            ? observacion.adjuntos.map((adjunto) => (
              <button
                className="link-button"
                key={adjunto.id}
                type="button"
                onClick={() => abrirAdjunto(adjunto.id)}
              >
                {adjunto.nombreArchivo}
              </button>
            ))
            : 'Sin adjuntos',
        },
      ]}
    />
  );
}
