import type { RecorridaCampo } from '@agro/tipos';

type SelectorRecorridaProps = {
  recorridas: RecorridaCampo[];
  value: string;
  disabled?: boolean;
  label?: string;
  emptyLabel?: string;
  onChange: (recorridaId: string) => void;
};

export function SelectorRecorrida({
  recorridas,
  value,
  disabled,
  label = 'Recorrida',
  emptyLabel = 'Sin recorrida',
  onChange,
}: SelectorRecorridaProps) {
  return (
    <label>
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {recorridas.map((recorrida) => (
          <option key={recorrida.id} value={recorrida.id}>
            {recorrida.titulo}
          </option>
        ))}
      </select>
    </label>
  );
}
