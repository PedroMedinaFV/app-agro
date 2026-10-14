import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

type DecimalInputProps = {
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  onEmptyValueChange?: () => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  title?: string;
  ariaLabel?: string;
  decimals?: number;
  commitOnBlur?: boolean;
  allowNegative?: boolean;
  allowEmpty?: boolean;
};

function redondearDecimal(value: number, decimals: number) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function textoDesdeNumero(value: number | null | undefined, decimals: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? redondearDecimal(value, decimals).toFixed(decimals).replace('.', ',')
    : '';
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
  onEmptyValueChange,
  disabled,
  min = 0,
  max,
  step = '0.01',
  placeholder,
  title,
  ariaLabel,
  decimals = 2,
  commitOnBlur = false,
  allowNegative = false,
  allowEmpty = false,
}: DecimalInputProps) {
  const [texto, setTexto] = useState(textoDesdeNumero(value, decimals));
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (editando) {
      return;
    }

    const siguiente = textoDesdeNumero(value, decimals);

    if (texto !== siguiente) {
      setTexto(siguiente);
    }
  }, [value, texto, decimals, editando]);

  function actualizarTexto(siguiente: string) {
    const textoLocal = siguiente.replace('.', ',');
    const patron = allowNegative ? /^-?\d*(?:,\d*)?$/ : /^\d*(?:,\d*)?$/;

    if (!patron.test(textoLocal)) {
      return;
    }

    setTexto(textoLocal);

    if (allowEmpty && (textoLocal === '' || textoLocal === '-')) {
      onEmptyValueChange?.();
      return;
    }

    if (commitOnBlur) {
      return;
    }

    if (textoLocal === '' || textoLocal === ',') {
      onValueChange(0);
      return;
    }

    onValueChange(numeroDesdeTexto(textoLocal));
  }

  function confirmarValor() {
    if (allowEmpty && (texto === '' || texto === '-')) {
      onEmptyValueChange?.();
      setTexto('');
      return;
    }

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
