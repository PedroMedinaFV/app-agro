import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { ErpCampo, ErpEmpresa, ErpZona, PadronErpSincronizable } from '@agro/tipos';
import { padronesErpSincronizables } from '@agro/tipos';
import { prisma } from '../../prisma';
import { obtenerEmpresasSistemaErp, obtenerSnapshotErp } from './clienteErp';
import { generarSugerenciasVinculacionErp } from '../notificaciones/vinculacionesSugeridas';
import type { UsuarioAuditoria } from '../planificacion/auditoria';

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

function deduplicarZonasGlobales(zonas: ErpZona[], campos: ErpCampo[]) {
  const zonasPorId = new Map<number, ErpZona>();
  const zonasUsadasPorCampos = new Set(campos.map((campo) => campo.idZona).filter((idZona): idZona is number => typeof idZona === 'number'));

  for (const zona of zonas) {
    if (!zonasUsadasPorCampos.has(zona.idZona) || zonasPorId.has(zona.idZona)) {
      continue;
    }

    // ALBOR devuelve todas las zonas para cualquier x-company; por eso se cachean como padron global por idZona.
    zonasPorId.set(zona.idZona, {
      ...zona,
      empresaErpId: 'global',
      erpId: `zona:${zona.idZona}`,
    });
  }

  return Array.from(zonasPorId.values()).sort((a, b) => a.idZona - b.idZona);
}

function expandirPadronesSolicitados(items?: PadronErpSincronizable[]) {
  const seleccionados = new Set(items?.length ? items : padronesErpSincronizables);

  if (seleccionados.has('cultivos')) {
    seleccionados.add('campanias');
    seleccionados.add('actividades');
    seleccionados.add('especies');
    seleccionados.add('lotes');
  }

  if (seleccionados.has('lotes')) {
    seleccionados.add('campos');
  }

  if (seleccionados.has('campos')) {
    seleccionados.add('lotes');
  }

  if (seleccionados.has('campos')) {
    seleccionados.add('zonas');
  }

  if (seleccionados.has('insumos') || seleccionados.has('servicios')) {
    seleccionados.add('unidadesMedida');
  }

  return seleccionados;
}

function crearResultadoVacio(sincronizadoEn = new Date().toISOString()) {
  return {
    campos: 0,
    zonas: 0,
    lotes: 0,
    actividades: 0,
    especies: 0,
    empresas: 0,
    campanias: 0,
    cultivos: 0,
    insumos: 0,
    servicios: 0,
    unidadesMedida: 0,
    monedas: 0,
    puertos: 0,
    omitidos: {
      lotesSinCampo: 0,
    },
    sugerenciasVinculacion: {
      detectadas: 0,
      creadas: 0,
    },
    sincronizadoEn,
  };
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

export async function sincronizarSnapshotErp(clienteId?: string, usuario?: UsuarioAuditoria, items?: PadronErpSincronizable[]) {
  const padrones = expandirPadronesSolicitados(items);
  const resultadoVacio = crearResultadoVacio();

  if (padrones.has('empresas')) {
    const resultadoEmpresas = await sincronizarEmpresasErp(clienteId);

    resultadoVacio.empresas = resultadoEmpresas.empresas;
    resultadoVacio.sincronizadoEn = resultadoEmpresas.sincronizadoEn;

    if (padrones.size === 1) {
      return resultadoVacio;
    }
  }

  const snapshot = await obtenerSnapshotErp(clienteId, Array.from(padrones));
  const zonasSincronizadas = deduplicarZonasGlobales(snapshot.zonas, snapshot.campos);
  const camposImportables = new Set(snapshot.campos.map((campo) => campo.erpId));
  const lotesConCampo = snapshot.lotes.filter((lote) => camposImportables.has(lote.campoErpId));
  const lotesOmitidosPorCampo = snapshot.lotes.length - lotesConCampo.length;
  const empresaErpIds = Array.from(
    new Set([
      ...snapshot.campos.map((registro) => registro.empresaErpId),
      ...snapshot.lotes.map((registro) => registro.empresaErpId),
      ...snapshot.cultivos.map((registro) => registro.empresaErpId),
    ]),
  ).filter((empresaErpId) => empresaErpId !== 'global');

  // Las tablas Erp* funcionan como cache importada: se refrescan por empresa y no guardan ediciones del usuario.
  console.log(`[erp-sync] Refrescando cache ERP para ${empresaErpIds.length} empresas`);
  const borrados: Prisma.PrismaPromise<unknown>[] = [];

  if (padrones.has('lotes')) borrados.push(prisma.erpLote.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }));
  if (padrones.has('zonas')) {
    borrados.push(prisma.erpZona.deleteMany({
      where: {
        OR: [
          { erpId: { in: zonasSincronizadas.map((zona) => zona.erpId) } },
          { empresaErpId: { in: empresaErpIds } },
        ],
      },
    }));
  }
  if (padrones.has('campos')) borrados.push(prisma.erpCampo.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }));
  if (padrones.has('actividades')) borrados.push(prisma.erpActividad.deleteMany({ where: { OR: [{ empresaErpId: 'global' }, { empresaErpId: { in: empresaErpIds } }] } }));
  if (padrones.has('especies')) borrados.push(prisma.erpEspecie.deleteMany({ where: { OR: [{ empresaErpId: 'global' }, { empresaErpId: { in: empresaErpIds } }] } }));
  if (padrones.has('campanias')) borrados.push(prisma.erpCampania.deleteMany({ where: { OR: [{ empresaErpId: 'global' }, { empresaErpId: { in: empresaErpIds } }] } }));
  if (padrones.has('cultivos')) borrados.push(prisma.erpCultivo.deleteMany({ where: { empresaErpId: { in: empresaErpIds } } }));
  if (padrones.has('insumos')) borrados.push(prisma.erpInsumo.deleteMany({ where: { OR: [{ empresaErpId: 'global' }, { empresaErpId: { in: empresaErpIds } }] } }));
  if (padrones.has('servicios')) borrados.push(prisma.erpServicio.deleteMany({ where: { OR: [{ empresaErpId: 'global' }, { empresaErpId: { in: empresaErpIds } }] } }));
  if (padrones.has('unidadesMedida')) borrados.push(prisma.erpUnidadMedida.deleteMany({ where: { OR: [{ empresaErpId: 'global' }, { empresaErpId: { in: empresaErpIds } }] } }));
  if (padrones.has('monedas')) borrados.push(prisma.erpMoneda.deleteMany({ where: { OR: [{ empresaErpId: 'global' }, { empresaErpId: { in: empresaErpIds } }] } }));
  if (padrones.has('puertos')) borrados.push(prisma.erpPuerto.deleteMany({ where: { OR: [{ empresaErpId: 'global' }, { empresaErpId: { in: empresaErpIds } }] } }));

  await prisma.$transaction(borrados);

  if (padrones.has('zonas')) await crearEnBloques('zonas', zonasSincronizadas, (bloque) =>
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

  if (padrones.has('campos')) await crearEnBloques('campos', snapshot.campos, (bloque) =>
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

  if (padrones.has('lotes')) await crearEnBloques('lotes', lotesConCampo, (bloque) =>
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

  if (padrones.has('actividades')) await crearEnBloques('actividades', snapshot.actividades, (bloque) =>
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

  if (padrones.has('especies')) await crearEnBloques('especies', snapshot.especies, (bloque) =>
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

  if (padrones.has('campanias')) await crearEnBloques('campanias', snapshot.campanias, (bloque) =>
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

  if (padrones.has('cultivos')) await crearEnBloques('cultivos', snapshot.cultivos, (bloque) =>
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

  if (padrones.has('insumos')) await crearEnBloques('insumos', snapshot.insumos, (bloque) =>
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

  if (padrones.has('servicios')) await crearEnBloques('servicios', snapshot.servicios, (bloque) =>
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

  if (padrones.has('unidadesMedida')) await crearEnBloques('unidadesMedida', snapshot.unidadesMedida, (bloque) =>
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

  if (padrones.has('monedas')) await crearEnBloques('monedas', snapshot.monedas, (bloque) =>
    prisma.erpMoneda.createMany({
      data: bloque.map((moneda) => ({
        empresaErpId: moneda.empresaErpId,
        erpId: moneda.erpId,
        idMoneda: moneda.idMoneda,
        codigo: moneda.codigo,
        nombre: moneda.nombre,
        simbolo: moneda.simbolo ?? null,
        activo: moneda.activo,
        actualizadoEn: new Date(moneda.actualizadoEn),
      })),
    }),
  );

  if (padrones.has('puertos')) await crearEnBloques('puertos', snapshot.puertos, (bloque) =>
    prisma.erpPuerto.createMany({
      data: bloque.map((puerto) => ({
        empresaErpId: puerto.empresaErpId,
        erpId: puerto.erpId,
        idPuerto: puerto.idPuerto,
        codigo: puerto.codigo,
        nombre: puerto.nombre,
        activo: puerto.activo,
        actualizadoEn: new Date(puerto.actualizadoEn),
      })),
    }),
  );

  let sugerenciasVinculacion = { detectadas: 0, creadas: 0 };

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

    sugerenciasVinculacion = await generarSugerenciasVinculacionErp(clienteId, usuario);
  }

  return {
    campos: padrones.has('campos') ? snapshot.campos.length : 0,
    zonas: padrones.has('zonas') ? zonasSincronizadas.length : 0,
    lotes: padrones.has('lotes') ? lotesConCampo.length : 0,
    actividades: padrones.has('actividades') ? snapshot.actividades.length : 0,
    especies: padrones.has('especies') ? snapshot.especies.length : 0,
    empresas: resultadoVacio.empresas,
    campanias: padrones.has('campanias') ? snapshot.campanias.length : 0,
    cultivos: padrones.has('cultivos') ? snapshot.cultivos.length : 0,
    insumos: padrones.has('insumos') ? snapshot.insumos.length : 0,
    servicios: padrones.has('servicios') ? snapshot.servicios.length : 0,
    unidadesMedida: padrones.has('unidadesMedida') ? snapshot.unidadesMedida.length : 0,
    monedas: padrones.has('monedas') ? snapshot.monedas.length : 0,
    puertos: padrones.has('puertos') ? snapshot.puertos.length : 0,
    omitidos: {
      lotesSinCampo: lotesOmitidosPorCampo,
    },
    sugerenciasVinculacion,
    sincronizadoEn: snapshot.sincronizadoEn,
  };
}
