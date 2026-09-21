type MetricasPlanificacionProps = {
  hectareasPlanificadas: number;
  ingresoNetoTotal: number;
  costoTotal: number;
  margenBrutoTotal: number;
  formatearUsd: (valor: number, decimales?: number) => string;
};

export function MetricasPlanificacion({
  hectareasPlanificadas,
  ingresoNetoTotal,
  costoTotal,
  margenBrutoTotal,
  formatearUsd,
}: MetricasPlanificacionProps) {
  return (
    <section className="metrics planning-metrics">
      <article>
        <span>Hectareas</span>
        <strong>{hectareasPlanificadas.toFixed(2)}</strong>
      </article>
      <article>
        <span>Ingreso neto</span>
        <strong>{formatearUsd(ingresoNetoTotal)}</strong>
      </article>
      <article>
        <span>Costo produccion</span>
        <strong>{formatearUsd(costoTotal)}</strong>
      </article>
      <article>
        <span>Margen bruto</span>
        <strong>{formatearUsd(margenBrutoTotal)}</strong>
      </article>
    </section>
  );
}
