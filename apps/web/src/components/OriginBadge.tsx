type OriginBadgeProps = {
  origen: string;
};

export function OriginBadge({ origen }: OriginBadgeProps) {
  const esErp = origen.toLowerCase() === 'erp';

  return (
    <span className={`origin-badge ${esErp ? 'erp' : 'app'}`}>
      {esErp ? 'ERP' : 'Agro App'}
    </span>
  );
}
