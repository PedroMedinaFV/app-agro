import { normalizarCodigo } from '../planificacion/validacionesPadronesApp';

/** El ERP gobierna los datos maestros de una zona vinculada; el ID App permanece estable. */
export function datosZonaDesdeErp(zona: { nombre: string; codigo: string | null }) {
  return {
    nombre: zona.nombre,
    codigoInterno: normalizarCodigo(zona.codigo || zona.nombre),
  };
}
