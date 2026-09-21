import { Button } from '../Button';

type OpcionProtocolo = {
  id: string;
  nombre: string;
};

type AccionesMasivasPlanificacionProps = {
  protocoloId: string;
  destino: string;
  rinde: string;
  protocolos: OpcionProtocolo[];
  destinos: string[];
  resultado?: string;
  puedeEditar: boolean;
  totalLineasFiltradas: number;
  onProtocoloChange: (protocoloId: string) => void;
  onDestinoChange: (destino: string) => void;
  onRindeChange: (rinde: string) => void;
  onAplicarProtocolo: () => void;
  onAplicarDestino: () => void;
  onAplicarRinde: () => void;
};

export function AccionesMasivasPlanificacion({
  protocoloId,
  destino,
  rinde,
  protocolos,
  destinos,
  resultado,
  puedeEditar,
  totalLineasFiltradas,
  onProtocoloChange,
  onDestinoChange,
  onRindeChange,
  onAplicarProtocolo,
  onAplicarDestino,
  onAplicarRinde,
}: AccionesMasivasPlanificacionProps) {
  const sinLineas = totalLineasFiltradas === 0;

  return (
    <section className="planning-bulk-actions" aria-label="Acciones masivas de planificacion">
      <div>
        <p className="eyebrow">Acciones masivas</p>
        <h3>Aplicar sobre lineas filtradas</h3>
      </div>
      <label>
        Protocolo
        <select value={protocoloId} onChange={(event) => onProtocoloChange(event.target.value)}>
          <option value="">Seleccionar protocolo</option>
          {protocolos.map((protocolo) => (
            <option key={protocolo.id} value={protocolo.id}>{protocolo.nombre}</option>
          ))}
        </select>
      </label>
      <Button variant="small" onClick={onAplicarProtocolo} disabled={!puedeEditar || !protocoloId || sinLineas}>
        Aplicar protocolo
      </Button>
      <label>
        Destino
        <select value={destino} onChange={(event) => onDestinoChange(event.target.value)}>
          <option value="">Seleccionar destino</option>
          {destinos.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      <Button variant="small" onClick={onAplicarDestino} disabled={!puedeEditar || !destino || sinLineas}>
        Aplicar destino
      </Button>
      <label>
        Rinde tn/ha
        <input type="text" inputMode="decimal" value={rinde} onChange={(event) => onRindeChange(event.target.value)} placeholder="Ej. 3.20" />
      </label>
      <Button variant="small" onClick={onAplicarRinde} disabled={!puedeEditar || !rinde || sinLineas}>
        Aplicar rinde
      </Button>
      {resultado && <span className="bulk-action-result">{resultado}</span>}
    </section>
  );
}
