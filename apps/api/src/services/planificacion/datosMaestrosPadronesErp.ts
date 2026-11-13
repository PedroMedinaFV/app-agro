import type { ErpActividad, ErpCampo, ErpEspecie, ErpInsumo, ErpLote, ErpServicio, Prisma } from '@prisma/client';
import { crearErrorValidacion, normalizarCodigo } from './validacionesPadronesApp';

export function identidadDesdeErp(nombre: string, codigo: string | null) {
  return { nombre, codigoInterno: normalizarCodigo(codigo || nombre) };
}

/** Catalogos y relaciones por cliente, cargados una sola vez por operacion/lote. */
export async function crearProyectorDatosMaestros(tx: Prisma.TransactionClient, clienteId: string) {
  const [zonas, campos, especies, unidades, tipos] = await Promise.all([
    tx.zonaApp.findMany({ where: { clienteId, zonaErpId: { not: null } } }),
    tx.campoApp.findMany({ where: { clienteId, campoErpId: { not: null } } }),
    tx.especieApp.findMany({ where: { clienteId, especieErpId: { not: null } } }),
    tx.erpUnidadMedida.findMany({ where: { empresaErpId: 'global' } }),
    tx.erpTipoInsumo.findMany({ where: { empresaErpId: 'global' } }),
  ]);
  const zonaPorErp = new Map(zonas.map((zona) => [zona.zonaErpId, zona.id]));
  const campoPorErp = new Map(campos.map((campo) => [campo.campoErpId, campo.id]));
  const especiePorErp = new Map(especies.map((especie) => [especie.especieErpId, especie.id]));
  const unidadPorId = new Map(unidades.map((unidad) => [unidad.idUnidadMedida, unidad.codigo]));
  const tipoPorId = new Map(tipos.map((tipo) => [tipo.idTipoInsumo, tipo.descripcion]));
  function padre(mapa: ReadonlyMap<string | null, string>, erpId: string, nombre: string) {
    const id = mapa.get(erpId);
    if (!id) throw crearErrorValidacion(`Primero sincroniza o vincula ${nombre} ERP correspondiente al cliente.`, 409);
    return id;
  }
  function unidad(id: number | null, defecto: string) {
    if (id === null) return defecto;
    const codigo = unidadPorId.get(id);
    if (!codigo) throw crearErrorValidacion('La unidad ERP no esta en cache. Sincroniza unidades antes de vincular.', 409);
    return codigo;
  }
  return {
    campos: (fuente: ErpCampo) => {
      const zonaErpId = fuente.idZona == null ? null : `zona:${fuente.idZona}`;
      return { ...identidadDesdeErp(fuente.nombre, fuente.codigo), empresaErpId: fuente.empresaErpId,
        zonaErpId, zonaAppId: zonaErpId ? padre(zonaPorErp, zonaErpId, 'la zona') : null };
    },
    lotes: (fuente: ErpLote) => {
      const superficieTotal = fuente.areaHectareas;
      const superficieProductiva = fuente.hectareasProductivas ?? superficieTotal;
      if (!Number.isFinite(superficieTotal) || !Number.isFinite(superficieProductiva)
        || superficieTotal < 0 || superficieProductiva < 0 || superficieProductiva > superficieTotal) {
        throw crearErrorValidacion('Las superficies del lote ERP son inconsistentes. Corrige el origen antes de vincular.', 409);
      }
      return { ...identidadDesdeErp(fuente.nombre, fuente.codigo), superficieTotal, superficieProductiva,
        campoAppId: padre(campoPorErp, fuente.campoErpId, 'el campo') };
    },
    especies: (fuente: ErpEspecie) => ({ ...identidadDesdeErp(fuente.nombre, fuente.codigo), empresaErpId: 'global' }),
    actividades: (fuente: ErpActividad) => {
      const especieErpId = fuente.idEspecie == null ? null : `especie:${fuente.idEspecie}`;
      return { ...identidadDesdeErp(fuente.descripcion, fuente.codigo), empresaErpId: 'global',
        ...(especieErpId ? { especieErpId, especieAppId: padre(especiePorErp, especieErpId, 'la especie') } : {}) };
    },
    insumos: (fuente: ErpInsumo) => ({
      ...identidadDesdeErp(fuente.nombre, fuente.codigo), empresaErpId: 'global',
      idTipoInsumo: fuente.idTipoInsumo,
      tipo: fuente.idTipoInsumo === null ? null : tipoPorId.get(fuente.idTipoInsumo) || `Tipo ${fuente.idTipoInsumo}`,
      unidad: unidad(fuente.idUnidadMedida, 'Unid'),
    }),
    labores: (fuente: ErpServicio) => ({
      nombre: fuente.descripcion, codigo: normalizarCodigo(fuente.codigo || fuente.descripcion), empresaErpId: 'global',
      idServicio: fuente.idServicio, idTipoServicio: fuente.idTipoServicio,
      descripcionAbreviada: fuente.descripcionAbreviada, idUnidadMedida: fuente.idUnidadMedida,
      unidadSugerida: unidad(fuente.idUnidadMedida, 'Ha'), imputaDosis: fuente.imputaDosis,
      activo: fuente.activo, origen: 'erp', fechaUltimaActualizacionErp: fuente.actualizadoEn,
    }),
  };
}

type Tipo = 'campos' | 'lotes' | 'especies' | 'actividades' | 'insumos' | 'labores';

/** Resolver la cache dentro de la transaccion: nunca confiar en el maestro enviado por una UI. */
export async function resolverDatosMaestrosErp(tx: Prisma.TransactionClient, clienteId: string, tipo: Tipo, erpId: string) {
  const proyectar = await crearProyectorDatosMaestros(tx, clienteId);
  const inexistente = () => crearErrorValidacion('El registro ERP seleccionado no existe en la cache importada.');
  switch (tipo) {
    case 'campos': { const fuente = await tx.erpCampo.findUnique({ where: { erpId } }); if (!fuente) throw inexistente(); return proyectar.campos(fuente); }
    case 'lotes': { const fuente = await tx.erpLote.findUnique({ where: { erpId } }); if (!fuente) throw inexistente(); return proyectar.lotes(fuente); }
    case 'especies': { const fuente = await tx.erpEspecie.findUnique({ where: { erpId } }); if (!fuente) throw inexistente(); return proyectar.especies(fuente); }
    case 'actividades': { const fuente = await tx.erpActividad.findUnique({ where: { erpId } }); if (!fuente) throw inexistente(); return proyectar.actividades(fuente); }
    case 'insumos': { const fuente = await tx.erpInsumo.findUnique({ where: { erpId } }); if (!fuente) throw inexistente(); return proyectar.insumos(fuente); }
    case 'labores': { const fuente = await tx.erpServicio.findUnique({ where: { erpId } }); if (!fuente) throw inexistente(); return proyectar.labores(fuente); }
  }
}
