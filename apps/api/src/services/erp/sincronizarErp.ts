import { randomUUID } from 'node:crypto';
import { prisma } from '../../prisma';
import { obtenerSnapshotErp } from './clienteErp';

export async function sincronizarSnapshotErp(clienteId?: string) {
  const snapshot = await obtenerSnapshotErp(clienteId);

  for (const zona of snapshot.zonas) {
    await prisma.$executeRaw`
      INSERT INTO "ErpZona" ("id", "empresaErpId", "erpId", "idZona", "codigo", "nombre", "activo")
      VALUES (${randomUUID()}, ${zona.empresaErpId}, ${zona.erpId}, ${zona.idZona}, ${zona.codigo}, ${zona.nombre}, ${zona.activo})
      ON CONFLICT ("erpId") DO UPDATE SET
        "empresaErpId" = EXCLUDED."empresaErpId",
        "idZona" = EXCLUDED."idZona",
        "codigo" = EXCLUDED."codigo",
        "nombre" = EXCLUDED."nombre",
        "activo" = EXCLUDED."activo",
        "importadoEn" = CURRENT_TIMESTAMP
    `;
  }

  for (const campo of snapshot.campos) {
    await prisma.$executeRaw`
      INSERT INTO "ErpCampo" (
        "id", "empresaErpId", "erpId", "idCampo", "idZona", "idSubZona", "codigo", "nombre", "paisCodigo", "sociedad",
        "admiteGanaderia", "domicilio", "codigoSima", "idLocalidad", "activo", "actualizadoEn"
      )
      VALUES (
        ${randomUUID()}, ${campo.empresaErpId}, ${campo.erpId}, ${campo.idCampo}, ${campo.idZona || null}, ${campo.idSubZona || null}, ${campo.codigo}, ${campo.nombre}, ${campo.paisCodigo || null}, ${campo.sociedad || null},
        ${campo.admiteGanaderia ?? null}, ${campo.domicilio || null}, ${campo.codigoSima || null}, ${campo.idLocalidad || null}, ${campo.activo}, ${new Date(campo.actualizadoEn)}
      )
      ON CONFLICT ("erpId") DO UPDATE SET
        "empresaErpId" = EXCLUDED."empresaErpId",
        "idCampo" = EXCLUDED."idCampo",
        "idZona" = EXCLUDED."idZona",
        "idSubZona" = EXCLUDED."idSubZona",
        "codigo" = EXCLUDED."codigo",
        "nombre" = EXCLUDED."nombre",
        "paisCodigo" = EXCLUDED."paisCodigo",
        "sociedad" = EXCLUDED."sociedad",
        "admiteGanaderia" = EXCLUDED."admiteGanaderia",
        "domicilio" = EXCLUDED."domicilio",
        "codigoSima" = EXCLUDED."codigoSima",
        "idLocalidad" = EXCLUDED."idLocalidad",
        "activo" = EXCLUDED."activo",
        "actualizadoEn" = EXCLUDED."actualizadoEn",
        "importadoEn" = CURRENT_TIMESTAMP
    `;
  }

  for (const lote of snapshot.lotes) {
    await prisma.$executeRaw`
      INSERT INTO "ErpLote" (
        "id", "empresaErpId", "erpId", "idLote", "idCampo", "campoErpId", "codigo", "nombre", "cultivoCodigo", "cultivoNombre",
        "areaHectareas", "hectareasProductivas", "admiteGanaderia", "admiteLecheria", "codigoSima", "activo", "actualizadoEn"
      )
      VALUES (
        ${randomUUID()}, ${lote.empresaErpId}, ${lote.erpId}, ${lote.idLote}, ${lote.idCampo}, ${lote.campoErpId}, ${lote.codigo}, ${lote.nombre}, ${lote.cultivoCodigo || null}, ${lote.cultivoNombre || null},
        ${lote.areaHectareas}, ${lote.hectareasProductivas ?? null}, ${lote.admiteGanaderia ?? null}, ${lote.admiteLecheria ?? null}, ${lote.codigoSima ?? null}, ${lote.activo}, ${new Date(lote.actualizadoEn)}
      )
      ON CONFLICT ("erpId") DO UPDATE SET
        "empresaErpId" = EXCLUDED."empresaErpId",
        "idLote" = EXCLUDED."idLote",
        "idCampo" = EXCLUDED."idCampo",
        "campoErpId" = EXCLUDED."campoErpId",
        "codigo" = EXCLUDED."codigo",
        "nombre" = EXCLUDED."nombre",
        "cultivoCodigo" = EXCLUDED."cultivoCodigo",
        "cultivoNombre" = EXCLUDED."cultivoNombre",
        "areaHectareas" = EXCLUDED."areaHectareas",
        "hectareasProductivas" = EXCLUDED."hectareasProductivas",
        "admiteGanaderia" = EXCLUDED."admiteGanaderia",
        "admiteLecheria" = EXCLUDED."admiteLecheria",
        "codigoSima" = EXCLUDED."codigoSima",
        "activo" = EXCLUDED."activo",
        "actualizadoEn" = EXCLUDED."actualizadoEn",
        "importadoEn" = CURRENT_TIMESTAMP
    `;
  }

  for (const actividad of snapshot.actividades) {
    await prisma.$executeRaw`
      INSERT INTO "ErpActividad" ("id", "empresaErpId", "erpId", "idActividad", "codigo", "descripcion", "activo", "habilitadoExportacionCrea", "idEspecie", "idTipoActividad", "actualizadoEn")
      VALUES (${randomUUID()}, ${actividad.empresaErpId}, ${actividad.erpId}, ${actividad.idActividad}, ${actividad.codigo}, ${actividad.descripcion}, ${actividad.activo}, ${actividad.habilitadoExportacionCrea}, ${actividad.idEspecie ?? null}, ${actividad.idTipoActividad ?? null}, ${new Date(actividad.actualizadoEn)})
      ON CONFLICT ("erpId") DO UPDATE SET
        "empresaErpId" = EXCLUDED."empresaErpId",
        "idActividad" = EXCLUDED."idActividad",
        "codigo" = EXCLUDED."codigo",
        "descripcion" = EXCLUDED."descripcion",
        "activo" = EXCLUDED."activo",
        "habilitadoExportacionCrea" = EXCLUDED."habilitadoExportacionCrea",
        "idEspecie" = EXCLUDED."idEspecie",
        "idTipoActividad" = EXCLUDED."idTipoActividad",
        "actualizadoEn" = EXCLUDED."actualizadoEn",
        "importadoEn" = CURRENT_TIMESTAMP
    `;
  }

  for (const especie of snapshot.especies) {
    await prisma.$executeRaw`
      INSERT INTO "ErpEspecie" ("id", "empresaErpId", "erpId", "idEspecie", "codigo", "nombre", "activo", "codigoCot", "codigoAfip", "actualizadoEn")
      VALUES (${randomUUID()}, ${especie.empresaErpId}, ${especie.erpId}, ${especie.idEspecie}, ${especie.codigo}, ${especie.nombre}, ${especie.activo}, ${especie.codigoCot ?? null}, ${especie.codigoAfip ?? null}, ${new Date(especie.actualizadoEn)})
      ON CONFLICT ("erpId") DO UPDATE SET
        "empresaErpId" = EXCLUDED."empresaErpId",
        "idEspecie" = EXCLUDED."idEspecie",
        "codigo" = EXCLUDED."codigo",
        "nombre" = EXCLUDED."nombre",
        "activo" = EXCLUDED."activo",
        "codigoCot" = EXCLUDED."codigoCot",
        "codigoAfip" = EXCLUDED."codigoAfip",
        "actualizadoEn" = EXCLUDED."actualizadoEn",
        "importadoEn" = CURRENT_TIMESTAMP
    `;
  }

  for (const empresa of snapshot.empresas) {
    await prisma.$executeRaw`
      INSERT INTO "ErpEmpresa" ("id", "erpId", "idEmpresa", "codigo", "nombre", "activo", "cuit", "razonSocial", "email", "actualizadoEn")
      VALUES (${randomUUID()}, ${empresa.erpId}, ${empresa.idEmpresa}, ${empresa.codigo}, ${empresa.nombre}, ${empresa.activo}, ${empresa.cuit ?? null}, ${empresa.razonSocial ?? null}, ${empresa.email ?? null}, ${new Date(empresa.actualizadoEn)})
      ON CONFLICT ("erpId") DO UPDATE SET
        "idEmpresa" = EXCLUDED."idEmpresa",
        "codigo" = EXCLUDED."codigo",
        "nombre" = EXCLUDED."nombre",
        "activo" = EXCLUDED."activo",
        "cuit" = EXCLUDED."cuit",
        "razonSocial" = EXCLUDED."razonSocial",
        "email" = EXCLUDED."email",
        "actualizadoEn" = EXCLUDED."actualizadoEn",
        "importadoEn" = CURRENT_TIMESTAMP
    `;
  }

  for (const campania of snapshot.campanias) {
    await prisma.$executeRaw`
      INSERT INTO "ErpCampania" ("id", "empresaErpId", "erpId", "idCampania", "codigo", "nombre", "activo", "esActual", "actualizadoEn")
      VALUES (${randomUUID()}, ${campania.empresaErpId}, ${campania.erpId}, ${campania.idCampania}, ${campania.codigo}, ${campania.nombre}, ${campania.activo}, ${campania.esActual}, ${new Date(campania.actualizadoEn)})
      ON CONFLICT ("erpId") DO UPDATE SET
        "empresaErpId" = EXCLUDED."empresaErpId",
        "idCampania" = EXCLUDED."idCampania",
        "codigo" = EXCLUDED."codigo",
        "nombre" = EXCLUDED."nombre",
        "activo" = EXCLUDED."activo",
        "esActual" = EXCLUDED."esActual",
        "actualizadoEn" = EXCLUDED."actualizadoEn",
        "importadoEn" = CURRENT_TIMESTAMP
    `;
  }

  for (const cultivo of snapshot.cultivos) {
    await prisma.$executeRaw`
      INSERT INTO "ErpCultivo" (
        "id", "empresaErpId", "erpId", "idCultivo", "codigo", "nombre", "idCampo", "campoErpId",
        "idLote", "loteErpId", "idActividad", "actividadErpId", "idEspecie", "especieErpId",
        "idCampania", "campaniaErpId", "hectareas", "hectareasSembradas", "hectareasCosechadas",
        "idPuerto", "distanciaPuerto", "idPersonalResponsable", "esAgriculturaIntensiva",
        "socioEnFuncionAportes", "activo", "actualizadoEn"
      )
      VALUES (
        ${randomUUID()}, ${cultivo.empresaErpId}, ${cultivo.erpId}, ${cultivo.idCultivo}, ${cultivo.codigo}, ${cultivo.nombre}, ${cultivo.idCampo}, ${cultivo.campoErpId},
        ${cultivo.idLote}, ${cultivo.loteErpId}, ${cultivo.idActividad ?? null}, ${cultivo.actividadErpId ?? null}, ${cultivo.idEspecie ?? null}, ${cultivo.especieErpId ?? null},
        ${cultivo.idCampania ?? null}, ${cultivo.campaniaErpId ?? null}, ${cultivo.hectareas}, ${cultivo.hectareasSembradas}, ${cultivo.hectareasCosechadas},
        ${cultivo.idPuerto ?? null}, ${cultivo.distanciaPuerto ?? null}, ${cultivo.idPersonalResponsable ?? null}, ${cultivo.esAgriculturaIntensiva},
        ${cultivo.socioEnFuncionAportes}, ${cultivo.activo}, ${new Date(cultivo.actualizadoEn)}
      )
      ON CONFLICT ("erpId") DO UPDATE SET
        "empresaErpId" = EXCLUDED."empresaErpId",
        "idCultivo" = EXCLUDED."idCultivo",
        "codigo" = EXCLUDED."codigo",
        "nombre" = EXCLUDED."nombre",
        "idCampo" = EXCLUDED."idCampo",
        "campoErpId" = EXCLUDED."campoErpId",
        "idLote" = EXCLUDED."idLote",
        "loteErpId" = EXCLUDED."loteErpId",
        "idActividad" = EXCLUDED."idActividad",
        "actividadErpId" = EXCLUDED."actividadErpId",
        "idEspecie" = EXCLUDED."idEspecie",
        "especieErpId" = EXCLUDED."especieErpId",
        "idCampania" = EXCLUDED."idCampania",
        "campaniaErpId" = EXCLUDED."campaniaErpId",
        "hectareas" = EXCLUDED."hectareas",
        "hectareasSembradas" = EXCLUDED."hectareasSembradas",
        "hectareasCosechadas" = EXCLUDED."hectareasCosechadas",
        "idPuerto" = EXCLUDED."idPuerto",
        "distanciaPuerto" = EXCLUDED."distanciaPuerto",
        "idPersonalResponsable" = EXCLUDED."idPersonalResponsable",
        "esAgriculturaIntensiva" = EXCLUDED."esAgriculturaIntensiva",
        "socioEnFuncionAportes" = EXCLUDED."socioEnFuncionAportes",
        "activo" = EXCLUDED."activo",
        "actualizadoEn" = EXCLUDED."actualizadoEn",
        "importadoEn" = CURRENT_TIMESTAMP
    `;
  }

  for (const insumo of snapshot.insumos) {
    await prisma.$executeRaw`
      INSERT INTO "ErpInsumo" (
        "id", "empresaErpId", "erpId", "idInsumo", "idUnidadMedida", "idTipoInsumo", "idCategoriaInsumo",
        "codigo", "nombre", "activo", "controlaStock", "esInsumoGenerico", "controlaPorLote",
        "precioUnitario", "precioUnitarioVenta", "unidadesBulto", "idMonedaPrecioUnitario",
        "idMonedaPrecioVenta", "idCuentaContable", "idInsumoBanda", "idInsumoEstandar", "actualizadoEn"
      )
      VALUES (
        ${randomUUID()}, ${insumo.empresaErpId}, ${insumo.erpId}, ${insumo.idInsumo}, ${insumo.idUnidadMedida ?? null}, ${insumo.idTipoInsumo ?? null}, ${insumo.idCategoriaInsumo ?? null},
        ${insumo.codigo}, ${insumo.nombre}, ${insumo.activo}, ${insumo.controlaStock}, ${insumo.esInsumoGenerico}, ${insumo.controlaPorLote},
        ${insumo.precioUnitario ?? null}, ${insumo.precioUnitarioVenta ?? null}, ${insumo.unidadesBulto ?? null}, ${insumo.idMonedaPrecioUnitario ?? null},
        ${insumo.idMonedaPrecioVenta ?? null}, ${insumo.idCuentaContable ?? null}, ${insumo.idInsumoBanda ?? null}, ${insumo.idInsumoEstandar ?? null}, ${new Date(insumo.actualizadoEn)}
      )
      ON CONFLICT ("erpId") DO UPDATE SET
        "empresaErpId" = EXCLUDED."empresaErpId",
        "idInsumo" = EXCLUDED."idInsumo",
        "idUnidadMedida" = EXCLUDED."idUnidadMedida",
        "idTipoInsumo" = EXCLUDED."idTipoInsumo",
        "idCategoriaInsumo" = EXCLUDED."idCategoriaInsumo",
        "codigo" = EXCLUDED."codigo",
        "nombre" = EXCLUDED."nombre",
        "activo" = EXCLUDED."activo",
        "controlaStock" = EXCLUDED."controlaStock",
        "esInsumoGenerico" = EXCLUDED."esInsumoGenerico",
        "controlaPorLote" = EXCLUDED."controlaPorLote",
        "precioUnitario" = EXCLUDED."precioUnitario",
        "precioUnitarioVenta" = EXCLUDED."precioUnitarioVenta",
        "unidadesBulto" = EXCLUDED."unidadesBulto",
        "idMonedaPrecioUnitario" = EXCLUDED."idMonedaPrecioUnitario",
        "idMonedaPrecioVenta" = EXCLUDED."idMonedaPrecioVenta",
        "idCuentaContable" = EXCLUDED."idCuentaContable",
        "idInsumoBanda" = EXCLUDED."idInsumoBanda",
        "idInsumoEstandar" = EXCLUDED."idInsumoEstandar",
        "actualizadoEn" = EXCLUDED."actualizadoEn",
        "importadoEn" = CURRENT_TIMESTAMP
    `;
  }

  return {
    campos: snapshot.campos.length,
    zonas: snapshot.zonas.length,
    lotes: snapshot.lotes.length,
    actividades: snapshot.actividades.length,
    especies: snapshot.especies.length,
    empresas: snapshot.empresas.length,
    campanias: snapshot.campanias.length,
    cultivos: snapshot.cultivos.length,
    insumos: snapshot.insumos.length,
    sincronizadoEn: snapshot.sincronizadoEn,
  };
}
