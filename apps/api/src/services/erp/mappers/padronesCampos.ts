import { ErpCampo, ErpPadronCampo, ErpRespuestaPaginada } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearPadronCampo(campo: ErpPadronCampo, empresaErpId = 'empresa:mock'): ErpCampo {
  return {
    empresaErpId,
    erpId: `${empresaErpId}:campo:${campo.idCampo}`,
    idCampo: campo.idCampo,
    idZona: campo.idZona ?? undefined,
    idSubZona: campo.idSubZona ?? undefined,
    codigo: campo.codigo,
    nombre: campo.nombre.trim(),
    activo: campo.activo,
    admiteGanaderia: campo.admiteGanaderia,
    domicilio: campo.domicilio ?? undefined,
    codigoSima: campo.codigoSima ?? undefined,
    idLocalidad: campo.idLocalidad ?? undefined,
    actualizadoEn: normalizarFecha(campo.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaPadronesCampos(respuesta: ErpRespuestaPaginada<ErpPadronCampo>, empresaErpId?: string) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Padrones/Campos fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map((campo) => mapearPadronCampo(campo, empresaErpId));
}
