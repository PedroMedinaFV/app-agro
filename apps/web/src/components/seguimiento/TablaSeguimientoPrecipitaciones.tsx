import type { CampoApp, LoteApp, PrecipitacionCampo } from '@agro/tipos';
import { DataTable } from '../DataTable';
import { describirFechaSeguimiento } from '../../utils/seguimiento/helpersSeguimiento';

type TablaSeguimientoPrecipitacionesProps = {
  precipitaciones: PrecipitacionCampo[];
  camposPorId: Map<string, CampoApp>;
  lotesPorId: Map<string, LoteApp>;
};

export function TablaSeguimientoPrecipitaciones({
  precipitaciones,
  camposPorId,
  lotesPorId,
}: TablaSeguimientoPrecipitacionesProps) {
  return (
    <DataTable
      rows={precipitaciones}
      getRowKey={(precipitacion) => precipitacion.id}
      emptyMessage="No hay precipitaciones para los filtros seleccionados."
      columns={[
        {
          key: 'fecha',
          label: 'Fecha',
          width: 'minmax(130px, 0.8fr)',
          render: (precipitacion) => describirFechaSeguimiento(precipitacion.fechaEvento),
        },
        {
          key: 'campo',
          label: 'Campo',
          width: 'minmax(160px, 1fr)',
          render: (precipitacion) => (
            <strong>{camposPorId.get(precipitacion.campoAppId)?.nombre || precipitacion.campoAppId}</strong>
          ),
        },
        {
          key: 'lote',
          label: 'Lote',
          width: 'minmax(130px, 0.8fr)',
          render: (precipitacion) => (
            precipitacion.loteAppId
              ? lotesPorId.get(precipitacion.loteAppId)?.nombre || precipitacion.loteAppId
              : 'Campo completo'
          ),
        },
        {
          key: 'mm',
          label: 'Mm',
          width: 'minmax(70px, 0.4fr)',
          render: (precipitacion) => `${precipitacion.milimetros.toFixed(1)} mm`,
        },
        {
          key: 'observaciones',
          label: 'Observaciones',
          width: 'minmax(190px, 1.4fr)',
          render: (precipitacion) => precipitacion.observaciones || 'Sin observaciones',
        },
      ]}
    />
  );
}
