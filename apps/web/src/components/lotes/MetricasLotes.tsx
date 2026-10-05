type MetricasLotesProps = {
  totalErp: number;
  totalPropios: number;
  totalProvisorios: number;
  totalVinculados: number;
};

export function MetricasLotes({ totalErp, totalPropios, totalProvisorios, totalVinculados }: MetricasLotesProps) {
  return (
    <section className="metrics">
      <article>
        <span>ERP sincronizados</span>
        <strong>{totalErp}</strong>
      </article>
      <article>
        <span>Propios Agro App</span>
        <strong>{totalPropios}</strong>
      </article>
      <article>
        <span>Provisorios</span>
        <strong>{totalProvisorios}</strong>
      </article>
      <article>
        <span>Vinculados</span>
        <strong>{totalVinculados}</strong>
      </article>
    </section>
  );
}
