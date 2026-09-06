export type VinculacionSugerida<T> = {
  registro: T;
  puntaje: number;
  motivo: string;
};

export function normalizarParaComparar(valor: string) {
  return valor
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function sugerirVinculacion<T>(
  origen: { codigo?: string; nombre: string },
  candidatos: T[],
  obtenerCodigo: (registro: T) => string | undefined,
  obtenerNombre: (registro: T) => string,
): VinculacionSugerida<T>[] {
  const codigoOrigen = normalizarParaComparar(origen.codigo || '');
  const nombreOrigen = normalizarParaComparar(origen.nombre);

  return candidatos
    .map((registro) => {
      const codigoCandidato = normalizarParaComparar(obtenerCodigo(registro) || '');
      const nombreCandidato = normalizarParaComparar(obtenerNombre(registro));
      const puntaje = calcularPuntaje(codigoOrigen, nombreOrigen, codigoCandidato, nombreCandidato);

      return {
        registro,
        puntaje,
        motivo: describirPuntaje(puntaje),
      };
    })
    .sort((a, b) => b.puntaje - a.puntaje || obtenerNombre(a.registro).localeCompare(obtenerNombre(b.registro), 'es'));
}

function calcularPuntaje(codigoOrigen: string, nombreOrigen: string, codigoCandidato: string, nombreCandidato: string) {
  if (codigoOrigen && codigoOrigen === codigoCandidato) {
    return 100;
  }

  if (nombreOrigen && nombreOrigen === nombreCandidato) {
    return 90;
  }

  if (codigoOrigen && codigoOrigen === nombreCandidato) {
    return 75;
  }

  if (nombreOrigen && codigoCandidato && nombreOrigen === codigoCandidato) {
    return 75;
  }

  if (nombreOrigen && (nombreCandidato.includes(nombreOrigen) || nombreOrigen.includes(nombreCandidato))) {
    return 60;
  }

  const palabrasOrigen = new Set(nombreOrigen.split(' ').filter((palabra) => palabra.length > 2));
  const palabrasCandidato = nombreCandidato.split(' ').filter((palabra) => palabra.length > 2);
  const coincidencias = palabrasCandidato.filter((palabra) => palabrasOrigen.has(palabra)).length;

  return coincidencias > 0 ? Math.min(50, coincidencias * 20) : 0;
}

function describirPuntaje(puntaje: number) {
  if (puntaje >= 90) {
    return 'sugerido por coincidencia fuerte';
  }

  if (puntaje >= 60) {
    return 'sugerido por similitud';
  }

  if (puntaje > 0) {
    return 'posible coincidencia';
  }

  return 'sin coincidencia automatica';
}
