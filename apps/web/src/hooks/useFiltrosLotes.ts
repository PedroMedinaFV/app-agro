import { useState } from 'react';

export function useFiltrosLotes() {
  const [filtro, setFiltro] = useState('');
  const [filtroCampoClave, setFiltroCampoClave] = useState('');
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState(15);

  const cambiarFiltro = (siguienteFiltro: string) => {
    setFiltro(siguienteFiltro);
    setPagina(1);
  };

  const cambiarCampo = (siguienteCampoClave: string) => {
    setFiltroCampoClave(siguienteCampoClave);
    setPagina(1);
  };

  const cambiarFilasPorPagina = (siguienteFilasPorPagina: number) => {
    setFilasPorPagina(siguienteFilasPorPagina);
    setPagina(1);
  };

  return {
    filtro,
    filtroCampoClave,
    pagina,
    filasPorPagina,
    setFiltro: cambiarFiltro,
    setFiltroCampoClave: cambiarCampo,
    setPagina,
    setFilasPorPagina: cambiarFilasPorPagina,
  };
}
