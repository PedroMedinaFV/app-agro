import { useEffect, useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';

export function useFiltrosLotes() {
  const [filtro, setFiltro] = useState('');
  const filtroAplicado = useDebouncedValue(filtro);
  const [filtroCampoClave, setFiltroCampoClave] = useState('');
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(15);

  const cambiarFiltro = (siguienteFiltro: string) => {
    setFiltro(siguienteFiltro);
  };

  const cambiarCampo = (siguienteCampoClave: string) => {
    setFiltroCampoClave(siguienteCampoClave);
    setPagina(1);
  };

  const cambiarFilasPorPagina = (siguienteFilasPorPagina: number) => {
    setFilasPorPagina(siguienteFilasPorPagina);
    setPagina(1);
  };

  useEffect(() => {
    setPagina(1);
  }, [filtroAplicado]);

  return {
    filtro,
    filtroAplicado,
    filtroCampoClave,
    pagina,
    filasPorPagina,
    setFiltro: cambiarFiltro,
    setFiltroCampoClave: cambiarCampo,
    setPagina,
    setFilasPorPagina: cambiarFilasPorPagina,
  };
}
