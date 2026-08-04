export type RegistroParaSincronizar = {
  id: string;
  tipo: string;
  payload: unknown;
  sincronizado?: boolean;
};

export function procesarSincronizacion(registros: RegistroParaSincronizar[]) {
  const actualizados = registros.map((registro) => ({
    ...registro,
    sincronizado: true,
  }));

  return {
    sincronizados: actualizados.filter((registro) => registro.sincronizado).length,
    pendientes: actualizados.filter((registro) => !registro.sincronizado).length,
    registros: actualizados,
  };
}
