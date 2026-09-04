import { ErpEspecie, ErpPadronEspecie, ErpRespuestaPaginada } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearAgriculturaEspecie(especie: ErpPadronEspecie, empresaErpId = 'empresa:mock'): ErpEspecie {
  return {
    empresaErpId: 'global',
    erpId: `especie:${especie.idEspecie}`,
    idEspecie: especie.idEspecie,
    codigo: especie.codigo,
    nombre: especie.nombre.trim(),
    activo: especie.activo,
    codigoCot: especie.codigoCot ?? undefined,
    codigoAfip: especie.codigoAfip ?? undefined,
    actualizadoEn: normalizarFecha(especie.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaAgriculturaEspecies(respuesta: ErpRespuestaPaginada<ErpPadronEspecie>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Agricultura/Especies fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((especie) => mapearAgriculturaEspecie(especie, empresaErpId));
}
