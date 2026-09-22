import { useRef } from 'react';

type FechaInputProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function formatearFechaArgentina(value: string) {
  const [anio, mes, dia] = value.split('-');

  return anio && mes && dia ? `${dia}/${mes}/${anio}` : '';
}

export function FechaInput({ value, disabled, onChange }: FechaInputProps) {
  const inputFechaRef = useRef<HTMLInputElement>(null);

  function abrirSelectorFecha() {
    const input = inputFechaRef.current;

    if (!input || disabled) {
      return;
    }

    const inputConPicker = input as HTMLInputElement & { showPicker?: () => void };

    if (inputConPicker.showPicker) {
      inputConPicker.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  return (
    <div className="fecha-input">
      <input
        type="text"
        value={formatearFechaArgentina(value)}
        disabled={disabled}
        readOnly
        onClick={abrirSelectorFecha}
        aria-label="Fecha en formato dia mes anio"
      />
      <button type="button" className="fecha-input-button" disabled={disabled} onClick={abrirSelectorFecha} aria-label="Seleccionar fecha">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M3 10h18" />
        </svg>
      </button>
      <input
        ref={inputFechaRef}
        className="fecha-input-native"
        type="date"
        lang="es-AR"
        value={value}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
