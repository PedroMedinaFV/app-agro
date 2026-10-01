type MetricasSeguimientoProps = {
  observaciones: number;
  adjuntos: number;
  precipitaciones: number;
  totalMm: number;
};

export function MetricasSeguimiento({ observaciones, adjuntos, precipitaciones, totalMm }: MetricasSeguimientoProps) {
  return (
    <section className="metrics operative-metrics">
      <article><span>Observaciones</span><strong>{observaciones}</strong></article>
      <article><span>Adjuntos</span><strong>{adjuntos}</strong></article>
      <article><span>Precipitaciones</span><strong>{precipitaciones}</strong></article>
      <article><span>Milimetros</span><strong>{totalMm.toFixed(1)}</strong></article>
    </section>
  );
}
