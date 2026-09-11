import { useEffect, useState } from 'react';

type SignedIntegerInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
};

function textoDesdeNumero(value: number) {
  return Number.isFinite(value) ? String(Math.trunc(value)) : '';
}

function enteroDesdeTexto(value: string) {
  if (value === '' || value === '-') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Input entero firmado para offsets de fechas. Usa texto para permitir cargar
 * el signo negativo antes del numero, algo que `type="number"` suele bloquear.
 */
export function SignedIntegerInput({ value, onValueChange, disabled, placeholder, title }: SignedIntegerInputProps) {
  const [texto, setTexto] = useState(textoDesdeNumero(value));

  useEffect(() => {
    const parsed = enteroDesdeTexto(texto);

    if (parsed !== null && parsed !== value) {
      setTexto(textoDesdeNumero(value));
    }
  }, [value, texto]);

  function actualizarTexto(siguiente: string) {
    if (!/^-?\d*$/.test(siguiente)) {
      return;
    }

    setTexto(siguiente);

    const parsed = enteroDesdeTexto(siguiente);

    if (parsed !== null) {
      onValueChange(parsed);
    }
  }

  function normalizarAlSalir() {
    const parsed = enteroDesdeTexto(texto);

    if (parsed === null) {
      setTexto(textoDesdeNumero(value));
      return;
    }

    setTexto(textoDesdeNumero(parsed));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={texto}
      onChange={(event) => actualizarTexto(event.target.value)}
      onBlur={normalizarAlSalir}
      disabled={disabled}
      placeholder={placeholder}
      title={title}
    />
  );
}
