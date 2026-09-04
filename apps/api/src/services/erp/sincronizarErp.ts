import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { ErpEmpresa } from '@agro/tipos';
import { prisma } from '../../prisma';
import { obtenerEmpresasSistemaErp, obtenerSnapshotErp } from './clienteErp';

type ErpEmpresaRow = {
  erpId: string;
  idEmpresa: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  cuit: string | null;
  razonSocial: string | null;
  email: string | null;
  actualizadoEn: Date;
};

function mapearEmpresaRow(row: ErpEmpresaRow): ErpEmpresa {
  return {
    erpId: row.erpId,
    idEmpresa: row.idEmpresa,
    codigo: row.codigo,
    nombre: row.nombre,
    activo: row.activo,
    cuit: row.cuit || undefined,
    razonSocial: row.razonSocial || undefined,
    email: row.email || undefined,
    actualizadoEn: row.actualizadoEn.toISOString(),
  };
}

async function ejecutarEnBloques<T>(
  nombre: string,
  registros: T[],
  crearOperacion: (registro: T) => Prisma.PrismaPromise<number>,
  tamanioBloque = 100,
) {
  console.log(`[erp-sync] Guardando ${nombre}: ${registros.length}`);

  for (let inicio = 0; inicio < registros.length; inicio += tamanioBloque) {
    const bloque = registros.slice(inicio, inicio + tamanioBloque);

    // Se agrupa cada tanda en una transaccion para evitar miles de viajes individuales a Supabase.
    await prisma.$transaction(bloque.map(crearOperacion));

    console.log(`[erp-sync] ${nombre}: ${Math.min(inicio + bloque.length, registros.length)}/${registros.length}`);
  }
}

async function crearEnBloques<T>(
  nombre: string,
  registros: T[],
  insertarBloque: (bloque: T[]) => Promise<unknown>,
  tamanioBloque = 1000,
) {
  console.log(`[erp-sync] Insertando ${nombre}: ${registros.length}`);

  for (let inicio = 0; inicio < registros.length; inicio += tamanioBloque) {
    const bloque = registros.slice(inicio, inicio + tamanioBloque);

    await insertarBloque(bloque);

    console.log(`[erp-sync] ${nombre}: ${Math.min(inicio + bloque.length, registros.length)}/${registros.length}`);
  }
}

export async function listarEmpresasErpImportadas() {
  const rows = await prisma.$queryRaw<ErpEmpresaRow[]>`
    SELECT "erpId", "idEmpresa", "codigo", "nombre", "activo", "cuit", "razonSocial", "email", "actualizadoEn"
    FROM "ErpEmpresa"
    ORDER BY "idEmpresa" ASC
  `;

  return rows.map(mapearEmpresaRow);
}

async function guardarEmpresasErp(empresas: Awaited<ReturnType<typeof obtenerEmpresasSistemaErp>>) {
  await ejecutarEnBloques('empresas', empresas, (empresa) => prisma.$executeRaw`
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
    `);

  return empresas.length;
}

export async function sincronizarEmpresasErp(clienteId?: string) {
  const empresas = await obtenerEmpresasSistemaErp(clienteId);
  const cantidad = await guardarEmpresasErp(empresas);

  return {
    empresas: cantidad,
    importadas: await listarEmpresasErpImportadas(),
    sincronizadoEn: new Date().toISOString(),
  };
}

export async function sincronizarSnapshotErp(clienteId?: string) {
  const snapshot = await obtenerSnapshotErp(clienteId);
  const camposImportables = new Set(snapshot.campos.map((campo) => campo.erpId));
  const lotesConCampo = snapshot.lotes.filter((lote) => camposImportables.has(lote.campoErpId));
  const lotesOmitidosPorCampo = snapshot.lotes.length - lotesConCampo.length;
  const empresaErpIds = Array.from(
    new Set([
      ...snapshot.zonas.map((registro) => registro.empresaErpId),
      ...snapshot.campos.map((registro) => registro.empresaErpId),
      ...snapshot.lotes.map((registro) => registro.empresaErpId),
      ...snapshot.actividades.map((registro) => registro.empresaErpId),
      ...snapshot.especies.map((registro) => registro.empresaErpId),
      ...snapshot.campanias.map((registro) => registro.empresaErpId),
      ...snapshot.cultivos.map((registro) => registro.empresaErpId),
      ...snapshot.insumos.map((registro) => registro.empresaErpId),
      ...snapshot.servicios.map((registro) => registro.empresaErpId),
      ...snapshot.unidadesMedida.map((registro) => registro.empresaErpId),
    ]),
  );

  // Las tablas Erp* funcionan como cache importada: se refrescan por empresa y no guardan ediciones del usuario.
  console.log(`[erp-sync] Refrescando cache ERP para ${empresaErpIds.length} empresas`);
  await prisma.$transaction([
    prisma.erpLote.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
    prisma.erpZona.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
    prisma.erpCampo.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
    prisma.erpActividad.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
    prisma.erpEspecie.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
    prisma.erpCampania.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
    prisma.erpCultivo.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
    prisma.erpInsumo.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
    prisma.erpServicio.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
    prisma.erpUnidadMedida.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }),
  ]);

  await crearEnBloques('zonas', snapshot.zonas, (bloque) =>
    prisma.erpZona.createMany({
      data: bloque.map((zona) => ({
        empresaErpId: zona.empresaErpId,
        erpId: zona.erpId,
        idZona: zona.idZona,
        codigo: zona.codigo,
        nombre: zona.nombre,
        activo: zona.activo,
      })),
    }),
  );

  await crearEnBloques('campos', snapshot.campos, (bloque) =>
    prisma.erpCampo.createMany({
      data: bloque.map((campo) => ({
        empresaErpId: campo.empresaErpId,
        erpId: campo.erpId,
        idCampo: campo.idCampo,
        idZona: campo.idZona || null,
        idSubZona: campo.idSubZona || null,
        codigo: campo.codigo,
        nombre: campo.nombre,
        paisCodigo: campo.paisCodigo || null,
        sociedad: campo.sociedad || null,
        admiteGanaderia: campo.admiteGanaderia ?? null,
        domicilio: campo.domicilio || null,
        codigoSima: campo.codigoSima || null,
        idLocalidad: campo.idLocalidad || null,
        activo: campo.activo,
        actualizadoEn: new Date(campo.actualizadoEn),
      })),
    }),
  );

  await crearEnBloques('lotes', lotesConCampo, (bloque) =>
    prisma.erpLote.createMany({
      data: bloque.map((lote) => ({
        empresaErpId: lote.empresaErpId,
        erpId: lote.erpId,
        idLote: lote.idLote,
        idCampo: lote.idCampo,
        campoErpId: lote.campoErpId,
        codigo: lote.codigo,
        nombre: lote.nombre,
        cultivoCodigo: lote.cultivoCodigo || null,
        cultivoNombre: lote.cultivoNombre || null,
        areaHectareas: lote.areaHectareas,
        hectareasProductivas: lote.hectareasProductivas ?? null,
        admiteGanaderia: lote.admiteGanaderia ?? null,
        admiteLecheria: lote.admiteLecheria ?? null,
        codigoSima: lote.codigoSima ?? null,
        activo: lote.activo,
        actualizadoEn: new Date(lote.actualizadoEn),
      })),
    }),
  );

  await crearEnBloques('actividades', snapshot.actividades, (bloque) =>
    prisma.erpActividad.createMany({
      data: bloque.map((actividad) => ({
        empresaErpId: actividad.empresaErpId,
        erpId: actividad.erpId,
        idActividad: actividad.idActividad,
        codigo: actividad.codigo,
        descripcion: actividad.descripcion,
        activo: actividad.activo,
        habilitadoExportacionCrea: actividad.habilitadoExportacionCrea,
        idEspecie: actividad.idEspecie ?? null,
        idTipoActividad: actividad.idTipoActividad ?? null,
        actualizadoEn: new Date(actividad.actualizadoEn),
      })),
    }),
  );

  await crearEnBloques('especies', snapshot.especies, (bloque) =>
    prisma.erpEspecie.createMany({
      data: bloque.map((especie) => ({
        empresaErpId: especie.empresaErpId,
        erpId: especie.erpId,
        idEspecie: especie.idEspecie,
        codigo: especie.codigo,
        nombre: especie.nombre,
        activo: especie.activo,
        codigoCot: especie.codigoCot ?? null,
        codigoAfip: especie.codigoAfip ?? null,
        actualizadoEn: new Date(especie.actualizadoEn),
      })),
    }),
  );

  await guardarEmpresasErp(snapshot.empresas);

  await crearEnBloques('campanias', snapshot.campanias, (bloque) =>
    prisma.erpCampania.createMany({
      data: bloque.map((campania) => ({
        empresaErpId: campania.empresaErpId,
        erpId: campania.erpId,
        idCampania: campania.idCampania,
        codigo: campania.codigo,
        nombre: campania.nombre,
        activo: campania.activo,
        esActual: campania.esActual,
        actualizadoEn: new Date(campania.actualizadoEn),
      })),
    }),
  );

  await crearEnBloques('cultivos', snapshot.cultivos, (bloque) =>
    prisma.erpCultivo.createMany({
      data: bloque.map((cultivo) => ({
        empresaErpId: cultivo.empresaErpId,
        erpId: cultivo.erpId,
        idCultivo: cultivo.idCultivo,
        codigo: cultivo.codigo,
        nombre: cultivo.nombre,
        idCampo: cultivo.idCampo,
        campoErpId: cultivo.campoErpId,
        idLote: cultivo.idLote,
        loteErpId: cultivo.loteErpId,
        idActividad: cultivo.idActividad ?? null,
        actividadErpId: cultivo.actividadErpId ?? null,
        idEspecie: cultivo.idEspecie ?? null,
        especieErpId: cultivo.especieErpId ?? null,
        idCampania: cultivo.idCampania ?? null,
        campaniaErpId: cultivo.campaniaErpId ?? null,
        hectareas: cultivo.hectareas ?? 0,
        hectareasSembradas: cultivo.hectareasSembradas ?? 0,
        hectareasCosechadas: cultivo.hectareasCosechadas ?? 0,
        idPuerto: cultivo.idPuerto ?? null,
        distanciaPuerto: cultivo.distanciaPuerto ?? null,
        idPersonalResponsable: cultivo.idPersonalResponsable ?? null,
        esAgriculturaIntensiva: cultivo.esAgriculturaIntensiva,
        socioEnFuncionAportes: cultivo.socioEnFuncionAportes,
        activo: cultivo.activo,
        actualizadoEn: new Date(cultivo.actualizadoEn),
      })),
    }),
  );

  await crearEnBloques('insumos', snapshot.insumos, (bloque) =>
    prisma.erpInsumo.createMany({
      data: bloque.map((insumo) => ({
        empresaErpId: insumo.empresaErpId,
        erpId: insumo.erpId,
        idInsumo: insumo.idInsumo,
        idUnidadMedida: insumo.idUnidadMedida ?? null,
        idTipoInsumo: insumo.idTipoInsumo ?? null,
        idCategoriaInsumo: insumo.idCategoriaInsumo ?? null,
        codigo: insumo.codigo,
        nombre: insumo.nombre,
        activo: insumo.activo,
        controlaStock: insumo.controlaStock,
        esInsumoGenerico: insumo.esInsumoGenerico,
        controlaPorLote: insumo.controlaPorLote,
        precioUnitario: insumo.precioUnitario ?? null,
        precioUnitarioVenta: insumo.precioUnitarioVenta ?? null,
        unidadesBulto: insumo.unidadesBulto ?? null,
        idMonedaPrecioUnitario: insumo.idMonedaPrecioUnitario ?? null,
        idMonedaPrecioVenta: insumo.idMonedaPrecioVenta ?? null,
        idCuentaContable: insumo.idCuentaContable ?? null,
        idInsumoBanda: insumo.idInsumoBanda ?? null,
        idInsumoEstandar: insumo.idInsumoEstandar ?? null,
        actualizadoEn: new Date(insumo.actualizadoEn),
      })),
    }),
  );

  await crearEnBloques('servicios', snapshot.servicios, (bloque) =>
    prisma.erpServicio.createMany({
      data: bloque.map((servicio) => ({
        empresaErpId: servicio.empresaErpId,
        erpId: servicio.erpId,
        idServicio: servicio.idServicio,
        idTipoServicio: servicio.idTipoServicio ?? null,
        codigo: servicio.codigo,
        descripcion: servicio.descripcion,
        descripcionAbreviada: servicio.descripcionAbreviada ?? null,
        idUnidadMedida: servicio.idUnidadMedida ?? null,
        idMoneda: servicio.idMoneda ?? null,
        precioUnitario: servicio.precioUnitario ?? null,
        idMonedaPersonal: servicio.idMonedaPersonal ?? null,
        importePersonal: servicio.importePersonal ?? null,
        activo: servicio.activo,
        imputaDosis: servicio.imputaDosis,
        actualizadoEn: new Date(servicio.actualizadoEn),
      })),
    }),
  );

  await crearEnBloques('unidadesMedida', snapshot.unidadesMedida, (bloque) =>
    prisma.erpUnidadMedida.createMany({
      data: bloque.map((unidad) => ({
        empresaErpId: unidad.empresaErpId,
        erpId: unidad.erpId,
        idUnidadMedida: unidad.idUnidadMedida,
        codigo: unidad.codigo,
        codigoSifen: unidad.codigoSifen ?? null,
        descripcion: unidad.descripcion,
        activo: unidad.activo,
        actualizadoEn: new Date(unidad.actualizadoEn),
      })),
    }),
  );

  if (clienteId) {
    await prisma.integracionErp.upsert({
      where: { clienteId },
      create: {
        clienteId,
        baseUrl: process.env.ERP_BASE_URL || null,
        authMode: process.env.ERP_AUTH_MODE || 'mock',
        activo: true,
        ultimoSyncEn: new Date(),
      },
      update: {
        ultimoSyncEn: new Date(),
      },
    });
  }

  return {
    campos: snapshot.campos.length,
    zonas: snapshot.zonas.length,
    lotes: lotesConCampo.length,
    actividades: snapshot.actividades.length,
    especies: snapshot.especies.length,
    empresas: snapshot.empresas.length,
    campanias: snapshot.campanias.length,
    cultivos: snapshot.cultivos.length,
    insumos: snapshot.insumos.length,
    servicios: snapshot.servicios.length,
    unidadesMedida: snapshot.unidadesMedida.length,
    omitidos: {
      lotesSinCampo: lotesOmitidosPorCampo,
    },
    sincronizadoEn: snapshot.sincronizadoEn,
  };
}
