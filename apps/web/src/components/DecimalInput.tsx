import { useEffect, useState } from 'react';

type DecimalInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  title?: string;
  ariaLabel?: string;
};

function textoDesdeNumero(value: number) {
  return Number.isFinite(value) ? String(value) : '';
}

function numeroDesdeTexto(value: string) {
  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Input decimal controlado para tablas densas. Usa texto para permitir punto o
 * coma decimal del teclado numerico sin que el navegador bloquee la entrada.
 */
export function DecimalInput({ value, onValueChange, disabled, min = 0, max, step = '0.01', placeholder, title, ariaLabel }: DecimalInputProps) {
  const [texto, setTexto] = useState(textoDesdeNumero(value));

  useEffect(() => {
    const siguiente = textoDesdeNumero(value);

    if (numeroDesdeTexto(texto) !== value) {
      setTexto(siguiente);
    }
  }, [value, texto]);

  function actualizarTexto(siguiente: string) {
    if (!/^\d*(?:[.,]\d*)?$/.test(siguiente)) {
      return;
    }

    setTexto(siguiente);

    if (siguiente === '' || siguiente === '.' || siguiente === ',') {
      onValueChange(0);
      return;
    }

    onValueChange(numeroDesdeTexto(siguiente));
  }

  function normalizarAlSalir() {
    setTexto(textoDesdeNumero(numeroDesdeTexto(texto)));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={texto}
      onChange={(event) => actualizarTexto(event.target.value)}
      onBlur={normalizarAlSalir}
      disabled={disabled}
      placeholder={placeholder}
      title={title}
      aria-label={ariaLabel}
    />
  );
}
