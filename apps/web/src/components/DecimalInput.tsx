import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

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
  decimals?: number;
  commitOnBlur?: boolean;
};

function redondearDecimal(value: number, decimals: number) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function textoDesdeNumero(value: number, decimals: number) {
  return Number.isFinite(value) ? redondearDecimal(value, decimals).toFixed(decimals) : '';
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
export function DecimalInput({
  value,
  onValueChange,
  disabled,
  min = 0,
  max,
  step = '0.01',
  placeholder,
  title,
  ariaLabel,
  decimals = 2,
  commitOnBlur = false,
}: DecimalInputProps) {
  const [texto, setTexto] = useState(textoDesdeNumero(value, decimals));
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (commitOnBlur && editando) {
      return;
    }

    const siguiente = textoDesdeNumero(value, decimals);

    if (numeroDesdeTexto(texto) !== value) {
      setTexto(siguiente);
    }
  }, [value, texto, decimals, commitOnBlur, editando]);

  function actualizarTexto(siguiente: string) {
    if (!/^\d*(?:[.,]\d*)?$/.test(siguiente)) {
      return;
    }

    setTexto(siguiente);

    if (commitOnBlur) {
      return;
    }

    if (siguiente === '' || siguiente === '.' || siguiente === ',') {
      onValueChange(0);
      return;
    }

    onValueChange(numeroDesdeTexto(siguiente));
  }

  function confirmarValor() {
    const valorRedondeado = redondearDecimal(numeroDesdeTexto(texto), decimals);

    setTexto(textoDesdeNumero(valorRedondeado, decimals));
    onValueChange(valorRedondeado);
  }

  function normalizarAlSalir() {
    setEditando(false);
    confirmarValor();
  }

  function confirmarConEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return;
    }

    confirmarValor();
    event.currentTarget.blur();
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
      onFocus={() => setEditando(true)}
      onBlur={normalizarAlSalir}
      onKeyDown={confirmarConEnter}
      disabled={disabled}
      placeholder={placeholder}
      title={title}
      aria-label={ariaLabel}
    />
  );
}
