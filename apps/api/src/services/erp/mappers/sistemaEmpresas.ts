import { ErpEmpresa, ErpPadronEmpresa, ErpRespuestaPaginada } from '@agro/tipos';

function normalizarFecha(fecha: string | null) {
  return fecha ? new Date(fecha).toISOString() : new Date(0).toISOString();
}

export function mapearSistemaEmpresa(empresa: ErpPadronEmpresa): ErpEmpresa {
  return {
    erpId: `empresa:${empresa.idEmpresa}`,
    idEmpresa: empresa.idEmpresa,
    codigo: empresa.codigo,
    nombre: empresa.nombre.trim(),
    activo: empresa.activo,
    cuit: empresa.cuit ?? undefined,
    razonSocial: empresa.razonSocial?.trim() || undefined,
    email: empresa.email ?? undefined,
    actualizadoEn: normalizarFecha(empresa.fechaUltimaActualizacion),
  };
}

export function mapearRespuestaSistemaEmpresas(respuesta: ErpRespuestaPaginada<ErpPadronEmpresa>) {
  if (!respuesta.succeeded) {
    throw new Error(`ERP Sistema/Empresas fallo: ${respuesta.message || respuesta.errors.join(', ')}`);
  }

  return respuesta.data.map(mapearSistemaEmpresa);
}
