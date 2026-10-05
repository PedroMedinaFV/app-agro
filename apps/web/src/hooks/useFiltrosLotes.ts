import { useState } from 'react';

export function useFiltrosLotes() {
  const [filtro, setFiltro] = useState('');
  const [filtroCampoClave, setFiltroCampoClave] = useState('');

  return {
    filtro,
    filtroCampoClave,
    setFiltro,
    setFiltroCampoClave,
  };
}
