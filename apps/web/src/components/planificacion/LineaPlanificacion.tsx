import { memo } from 'react';
import type {
  DestinoApp,
  ErpCultivo,
  GastosComercialesReferencia,
  LoteApp,
  PlanificacionAgricolaLinea,
  ProtocoloProductivoResumen,
} from '@agro/tipos';
import { DecimalInput } from '../DecimalInput';
import { IconButton } from '../IconButton';
import { formatearFecha, formatearNumero } from '../../utils/formatters';
import { formatearCultivosAntecesores } from '../../utils/planificacion/helpersPlanificacion';

type LineaPlanificacionProps = {
  linea: PlanificacionAgricolaLinea;
  lote?: LoteApp;
  lotesDelCampo: LoteApp[];
  protocolo?: ProtocoloProductivoResumen;
  protocolosCompatibles: ProtocoloProductivoResumen[];
  destinosDisponibles: DestinoApp[];
  gastoReferencia?: GastosComercialesReferencia;
  cultivosAntecesores: ErpCultivo[];
  actividadNombrePorErpId: Map<string, string>;
  lineaDuplicada: boolean;
  hectareasExcedidas: boolean;
  puedeEditar: boolean;
  cantidadLineas: number;
  formatearUsd: (valor: number, decimales?: number) => string;
  onCambiarLote: (lineaId: string, loteAppId: string) => void;
  onCambiarProtocolo: (lineaId: string, protocoloId?: string) => void;
  onCambiarDestino: (lineaId: string, destinoVenta: string) => void;
  onActualizarLinea: (lineaId: string, cambios: Partial<PlanificacionAgricolaLinea>) => void;
  onCopiarLinea: (lineaId: string) => void;
  onEliminarLinea: (lineaId: string) => void;
};

export const LineaPlanificacion = memo(function LineaPlanificacion({
  linea,
  lote,
  lotesDelCampo,
  protocolo,
  protocolosCompatibles,
  destinosDisponibles,
  gastoReferencia,
  cultivosAntecesores,
  actividadNombrePorErpId,
  lineaDuplicada,
  hectareasExcedidas,
  puedeEditar,
  cantidadLineas,
  formatearUsd,
  onCambiarLote,
  onCambiarProtocolo,
  onCambiarDestino,
  onActualizarLinea,
  onCopiarLinea,
  onEliminarLinea,
}: LineaPlanificacionProps) {
  const loteSnapshot = linea.padronesSnapshot?.lote;
  const protocoloSnapshot = linea.protocoloSnapshot;
  const gastosSnapshot = linea.gastosComercialesSnapshot;
  const precioSnapshot = linea.precioVentaSnapshot;
  const destinoSnapshot = linea.destinoVentaSnapshot;
  const loteProductivo = lote?.superficieProductiva ?? loteSnapshot?.superficieProductiva;
  const loteTotal = lote?.superficieTotal ?? loteSnapshot?.superficieTotal;
  const protocoloNombre = protocolo?.nombre || protocoloSnapshot?.nombre;
  const protocoloCostoPorHa = protocolo?.costoEstimadoPorHa ?? protocoloSnapshot?.costoEstimadoPorHa;
  const protocoloActualizado = protocolo?.updatedAt ? formatearFecha(protocolo.updatedAt) : undefined;
  const destinoVenta = destinoSnapshot?.destinoVenta || linea.destinoVenta;
  const precioOrigen = precioSnapshot?.origen || (linea.precioVentaManual ? 'manual' : 'referencia');
  const gastosItems = gastoReferencia?.items || gastosSnapshot?.items || [];
  const gastosResumen = gastosItems
    .map((item) => `${formatearUsd(item.valorPorTonelada)} / ${item.unidadCalculo || 'Tn'}`)
    .join(' + ');
  const produccionEstimada = linea.hectareasPlanificadas * linea.rindeEstimado;
  const ingresoNetoPorHa = linea.hectareasPlanificadas > 0 ? linea.ingresoNetoEstimado / linea.hectareasPlanificadas : 0;
  const gastosComercialesPorTn = produccionEstimada > 0 ? linea.gastosComercialesEstimados / produccionEstimada : 0;

  return (
    <div className={`planning-row ${lineaDuplicada ? 'duplicated' : ''} ${hectareasExcedidas ? 'planning-row-error' : ''}`} key={linea.id}>
      <div className="planning-row-main">
        <div className="planning-cell-wide">
          <span className="cell-label">Lote</span>
          <select value={linea.loteAppId} onChange={(event) => onCambiarLote(linea.id, event.target.value)} disabled={!puedeEditar}>
            {!lotesDelCampo.some((item) => item.id === linea.loteAppId) && (
              <option value={linea.loteAppId}>{loteSnapshot?.nombre || lote?.nombre || 'Lote congelado'}</option>
            )}
            {lotesDelCampo.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <span>prod. {loteProductivo ?? '-'} ha / total {loteTotal ?? '-'} ha</span>
        </div>

        <div className="planning-cell-wide planning-cell-antecesor">
          <span className="cell-label">Antecesor</span>
          <span>{formatearCultivosAntecesores(cultivosAntecesores, actividadNombrePorErpId)}</span>
        </div>

        <div className="planning-cell-wide">
          <span className="cell-label">Protocolo</span>
          <select value={linea.protocoloId || ''} onChange={(event) => onCambiarProtocolo(linea.id, event.target.value || undefined)} disabled={!puedeEditar}>
            <option value="">Sin protocolo</option>
            {linea.protocoloId && !protocolosCompatibles.some((item) => item.id === linea.protocoloId) && (
              <option value={linea.protocoloId}>{protocoloNombre || 'Protocolo congelado'}</option>
            )}
            {protocolosCompatibles.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>
          <span>
            {protocoloCostoPorHa !== undefined
              ? `${formatearUsd(protocoloCostoPorHa)} / ha${protocoloActualizado ? ` - act. ${protocoloActualizado}` : ' - congelado'}`
              : 'Selecciona protocolo para definir actividad'}
          </span>
          {lineaDuplicada && <span className="cell-error">Actividad duplicada para este lote</span>}
        </div>

        <div className="planning-cell-wide">
          <span className="cell-label">Destino</span>
          <select value={destinoVenta} onChange={(event) => onCambiarDestino(linea.id, event.target.value)} disabled={!puedeEditar}>
            {destinosDisponibles.map((destino) => (
              <option key={destino.id} value={destino.destinoVenta}>{destino.destinoVenta}</option>
            ))}
            {!destinosDisponibles.some((destino) => destino.destinoVenta === destinoVenta) && (
              <option value={destinoVenta}>{destinoVenta || 'Sin destino'}</option>
            )}
          </select>
          <span>{destinoSnapshot?.origen === 'manual' || linea.destinoVentaManual ? 'Manual' : 'Sugerido'}</span>
        </div>
      </div>

      <div className="planning-row-inputs">
        <div className="planning-cell-number">
          <span className="cell-label">Hectareas</span>
          <DecimalInput value={linea.hectareasPlanificadas} onValueChange={(value) => onActualizarLinea(linea.id, { hectareasPlanificadas: value })} disabled={!puedeEditar} commitOnBlur />
          <span>max. {loteTotal ?? '-'} ha</span>
          {hectareasExcedidas && <span className="cell-error">Supera la superficie total del lote</span>}
        </div>

        <div className="planning-cell-number">
          <span className="cell-label">Rinde</span>
          <DecimalInput value={linea.rindeEstimado} onValueChange={(value) => onActualizarLinea(linea.id, { rindeEstimado: value })} disabled={!puedeEditar} commitOnBlur />
          <span>tn/ha - prod. {produccionEstimada.toFixed(2)} tn</span>
        </div>

        <div className="planning-cell-number">
          <span className="cell-label">P. venta</span>
          <DecimalInput value={linea.precioVentaEstimado} onValueChange={(value) => onActualizarLinea(linea.id, { precioVentaEstimado: value, precioVentaManual: true })} disabled={!puedeEditar} commitOnBlur />
          <span>
            {precioOrigen === 'manual'
              ? 'Manual'
              : `Referencia${precioSnapshot?.moneda ? ` ${precioSnapshot.moneda}` : ''}`}
          </span>
        </div>

        <div className="planning-cell-number">
          <span className="cell-label">Gtos com</span>
          <DecimalInput value={linea.gastosComercialesEstimados} onValueChange={(value) => onActualizarLinea(linea.id, { gastosComercialesEstimados: value, gastosComercialesReferenciaId: undefined })} disabled={!puedeEditar} commitOnBlur />
          <span>{gastosItems.length > 0 ? `${gastosResumen} - ${gastosItems.length} items` : `${formatearUsd(gastosComercialesPorTn, 2)} / tn equiv.`}</span>
        </div>
      </div>

      <div className="planning-row-summary">
        <div className="planning-cell-summary">
          <span className="cell-label">Ingreso neto</span>
          <strong>{formatearUsd(linea.ingresoNetoEstimado)}</strong>
          <span>{formatearNumero(ingresoNetoPorHa, 2)} USD/ha</span>
        </div>

        <div className="planning-cell-summary">
          <span className="cell-label">Margen bruto</span>
          <strong>{formatearUsd(linea.margenBrutoEstimado)}</strong>
          <span>{formatearNumero((linea.ingresoNetoEstimado - linea.costoProduccionEstimado) / linea.hectareasPlanificadas, 2)} USD/ha </span>
        </div>

        <div className="row-actions planning-cell-actions">
          <IconButton
            icon="copy"
            label="Copiar linea"
            onClick={() => onCopiarLinea(linea.id)}
            disabled={!puedeEditar}
          />
          <IconButton
            icon="close"
            className="danger-icon"
            label="Quitar linea"
            onClick={() => onEliminarLinea(linea.id)}
            disabled={!puedeEditar || cantidadLineas === 1}
          />
        </div>
      </div>
    </div>
  );
});
