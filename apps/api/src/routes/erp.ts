import { Router } from 'express';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import type { ErpSnapshot, SincronizarErpRequest } from '@agro/tipos';
import { obtenerSnapshotErp } from '../services/erp/clienteErp';
import { obtenerConfiguracionErp } from '../services/erp/configuracionErp';
import { sincronizarSnapshotErp } from '../services/erp/sincronizarErp';
import { requierePermiso } from '../middleware/permisos';
import { obtenerCamposAsignados } from '../services/usuarios/asignacionCampos';
import { listarEmpresasErpCliente } from '../services/erp/empresasCliente';
import {
  fallarSincronizacionErpHistorial,
  finalizarSincronizacionErpHistorial,
  iniciarSincronizacionErpHistorial,
  listarHistorialSincronizacionesErp,
} from '../services/erp/historialSincronizacionErp';
import { prisma } from '../prisma';
import { asegurarPadronesPlanificacionDesdeErp } from '../services/planificacion/padronesPlanificacionPrisma';

const router = Router();
type RequestConUsuario = Request & { user?: { sub: string; rol?: string; clienteId?: string } };
const clientesSincronizando = new Set<string>();

function limitarEnteroQuery(valor: unknown, defecto: number, minimo: number, maximo: number) {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  const numero = Number(crudo);

  if (!Number.isFinite(numero)) {
    return defecto;
  }

  return Math.min(Math.max(Math.trunc(numero), minimo), maximo);
}

function obtenerTextoQuery(valor: unknown) {
  const crudo = Array.isArray(valor) ? valor[0] : valor;

  return typeof crudo === 'string' && crudo.trim() ? crudo.trim() : undefined;
}

type ResolverSincronizarErpDeps = {
  iniciarHistorial: typeof iniciarSincronizacionErpHistorial;
  sincronizarSnapshot: typeof sincronizarSnapshotErp;
  asegurarPadrones: typeof asegurarPadronesPlanificacionDesdeErp;
  finalizarHistorial: typeof finalizarSincronizacionErpHistorial;
  fallarHistorial: typeof fallarSincronizacionErpHistorial;
  clientesEnProceso: Set<string>;
};

const depsSincronizarErp: ResolverSincronizarErpDeps = {
  iniciarHistorial: iniciarSincronizacionErpHistorial,
  sincronizarSnapshot: sincronizarSnapshotErp,
  asegurarPadrones: asegurarPadronesPlanificacionDesdeErp,
  finalizarHistorial: finalizarSincronizacionErpHistorial,
  fallarHistorial: fallarSincronizacionErpHistorial,
  clientesEnProceso: clientesSincronizando,
};

function filtrarSnapshotPorCampos(snapshot: ErpSnapshot, camposErpIds: string[] | null): ErpSnapshot {
  if (!camposErpIds) {
    return snapshot;
  }

  const lotesPermitidos = snapshot.lotes.filter((lote) => camposErpIds.includes(lote.campoErpId));
  const camposPermitidos = snapshot.campos.filter((campo) => camposErpIds.includes(campo.erpId));
  const empresasPermitidas = new Set(camposPermitidos.map((campo) => campo.empresaErpId));
  const lotesPermitidosIds = new Set(lotesPermitidos.map((lote) => lote.erpId));

  return {
    ...snapshot,
    zonas: snapshot.zonas.filter((zona) => zona.empresaErpId === 'global' || empresasPermitidas.has(zona.empresaErpId)),
    campos: camposPermitidos,
    lotes: lotesPermitidos,
    actividades: snapshot.actividades,
    especies: snapshot.especies,
    empresas: snapshot.empresas.filter((empresa) => empresasPermitidas.has(empresa.erpId)),
    campanias: snapshot.campanias,
    cultivos: snapshot.cultivos.filter((cultivo) => lotesPermitidosIds.has(cultivo.loteErpId)),
    insumos: snapshot.insumos,
    tiposInsumo: snapshot.tiposInsumo,
    servicios: snapshot.servicios,
    tiposServicio: snapshot.tiposServicio,
    unidadesMedida: snapshot.unidadesMedida,
    monedas: snapshot.monedas,
    puertos: snapshot.puertos,
  };
}

router.get('/snapshot', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const snapshot = await obtenerSnapshotErp(clienteId);
    const camposAsignados = user ? await obtenerCamposAsignados(user) : null;

    res.json(filtrarSnapshotPorCampos(snapshot, camposAsignados));
  } catch (error) {
    next(error);
  }
});

router.get('/configuracion', (req, res) => {
  const configuracion = obtenerConfiguracionErp();

  res.json({
    baseUrlConfigurada: Boolean(configuracion.baseUrl),
    authMode: configuracion.authMode,
    apiKeyConfigurada: Boolean(configuracion.apiKey),
    bearerTokenConfigurado: Boolean(configuracion.bearerToken),
    basicConfigurado: Boolean(configuracion.username && configuracion.password),
    loginConfigurado: Boolean(configuracion.loginKey && configuracion.loginPassword && configuracion.loginApp && configuracion.loginInstallation),
    timeoutMs: configuracion.timeoutMs,
  });
});

router.get('/campos-importados', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const empresasSeleccionadas = await listarEmpresasErpCliente(clienteId);
    const empresaErpIds = empresasSeleccionadas.map((empresa) => empresa.empresaErpId);
    const camposAsignados = user ? await obtenerCamposAsignados(user) : null;
    const campos = await prisma.erpCampo.findMany({
      where: {
        empresaErpId: { in: empresaErpIds },
        ...(camposAsignados ? { erpId: { in: camposAsignados } } : {}),
      },
      orderBy: [{ nombre: 'asc' }],
    });

    res.json({
      campos: campos.map((campo) => ({
        empresaErpId: campo.empresaErpId,
        erpId: campo.erpId,
        idCampo: campo.idCampo,
        idZona: campo.idZona ?? undefined,
        idSubZona: campo.idSubZona ?? undefined,
        codigo: campo.codigo,
        nombre: campo.nombre,
        paisCodigo: campo.paisCodigo ?? undefined,
        sociedad: campo.sociedad ?? undefined,
        activo: campo.activo,
        admiteGanaderia: campo.admiteGanaderia ?? undefined,
        domicilio: campo.domicilio ?? undefined,
        codigoSima: campo.codigoSima ?? undefined,
        idLocalidad: campo.idLocalidad ?? undefined,
        actualizadoEn: campo.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/zonas-importadas', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const empresasSeleccionadas = await listarEmpresasErpCliente(clienteId);
    const empresaErpIds = empresasSeleccionadas.map((empresa) => empresa.empresaErpId);
    const campos = await prisma.erpCampo.findMany({
      where: {
        empresaErpId: { in: empresaErpIds },
      },
      select: { idZona: true },
    });
    const zonasUsadasIds = Array.from(
      new Set(campos.map((campo) => campo.idZona).filter((idZona): idZona is number => typeof idZona === 'number')),
    );
    const zonas = await prisma.erpZona.findMany({
      where: {
        OR: [
          { idZona: { in: zonasUsadasIds } },
          { empresaErpId: { in: empresaErpIds } },
        ],
      },
      distinct: ['idZona'],
      orderBy: [{ nombre: 'asc' }],
    });

    res.json({
      zonas: zonas.map((zona) => ({
        empresaErpId: zona.empresaErpId,
        erpId: zona.erpId,
        idZona: zona.idZona,
        codigo: zona.codigo,
        nombre: zona.nombre,
        activo: zona.activo,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/especies-importadas', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const especies = await prisma.erpEspecie.findMany({
      where: { empresaErpId: 'global' },
      orderBy: [{ nombre: 'asc' }],
    });

    res.json({
      especies: especies.map((especie) => ({
        empresaErpId: especie.empresaErpId,
        erpId: especie.erpId,
        idEspecie: especie.idEspecie,
        codigo: especie.codigo,
        nombre: especie.nombre,
        activo: especie.activo,
        codigoCot: especie.codigoCot ?? undefined,
        codigoAfip: especie.codigoAfip ?? undefined,
        actualizadoEn: especie.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/actividades-importadas', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const actividades = await prisma.erpActividad.findMany({
      where: { empresaErpId: 'global' },
      orderBy: [{ descripcion: 'asc' }],
    });

    res.json({
      actividades: actividades.map((actividad) => ({
        empresaErpId: actividad.empresaErpId,
        erpId: actividad.erpId,
        idActividad: actividad.idActividad,
        codigo: actividad.codigo,
        descripcion: actividad.descripcion,
        activo: actividad.activo,
        habilitadoExportacionCrea: actividad.habilitadoExportacionCrea,
        idEspecie: actividad.idEspecie ?? undefined,
        idTipoActividad: actividad.idTipoActividad ?? undefined,
        actualizadoEn: actividad.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/campanias-importadas', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const campanias = await prisma.erpCampania.findMany({
      where: { empresaErpId: 'global' },
      orderBy: [{ codigo: 'desc' }],
    });

    res.json({
      campanias: campanias.map((campania) => ({
        empresaErpId: campania.empresaErpId,
        erpId: campania.erpId,
        idCampania: campania.idCampania,
        codigo: campania.codigo,
        nombre: campania.nombre,
        activo: campania.activo,
        esActual: campania.esActual,
        actualizadoEn: campania.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/insumos-importados', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const insumos = await prisma.erpInsumo.findMany({
      where: { empresaErpId: 'global' },
      orderBy: [{ nombre: 'asc' }],
    });

    res.json({
      insumos: insumos.map((insumo) => ({
        empresaErpId: insumo.empresaErpId,
        erpId: insumo.erpId,
        idInsumo: insumo.idInsumo,
        idUnidadMedida: insumo.idUnidadMedida ?? undefined,
        idTipoInsumo: insumo.idTipoInsumo ?? undefined,
        idCategoriaInsumo: insumo.idCategoriaInsumo ?? undefined,
        codigo: insumo.codigo,
        nombre: insumo.nombre,
        activo: insumo.activo,
        controlaStock: insumo.controlaStock,
        esInsumoGenerico: insumo.esInsumoGenerico,
        controlaPorLote: insumo.controlaPorLote,
        precioUnitario: insumo.precioUnitario ?? undefined,
        precioUnitarioVenta: insumo.precioUnitarioVenta ?? undefined,
        unidadesBulto: insumo.unidadesBulto ?? undefined,
        idMonedaPrecioUnitario: insumo.idMonedaPrecioUnitario ?? undefined,
        idMonedaPrecioVenta: insumo.idMonedaPrecioVenta ?? undefined,
        idCuentaContable: insumo.idCuentaContable ?? undefined,
        idInsumoBanda: insumo.idInsumoBanda ?? undefined,
        idInsumoEstandar: insumo.idInsumoEstandar ?? undefined,
        actualizadoEn: insumo.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tipos-insumo-importados', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const tiposInsumo = await prisma.erpTipoInsumo.findMany({
      where: { empresaErpId: 'global' },
      orderBy: [{ descripcion: 'asc' }],
    });

    res.json({
      tiposInsumo: tiposInsumo.map((tipo) => ({
        empresaErpId: tipo.empresaErpId,
        erpId: tipo.erpId,
        idTipoInsumo: tipo.idTipoInsumo,
        codigo: tipo.codigo,
        codigoCot: tipo.codigoCot ?? undefined,
        codigoSima: tipo.codigoSima ?? undefined,
        descripcion: tipo.descripcion,
        activo: tipo.activo,
        usaPadronEstandar: tipo.usaPadronEstandar,
        idCuentaContable: tipo.idCuentaContable ?? undefined,
        actualizadoEn: tipo.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/servicios-importados', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const servicios = await prisma.erpServicio.findMany({
      where: { empresaErpId: 'global' },
      orderBy: [{ descripcion: 'asc' }],
    });

    res.json({
      servicios: servicios.map((servicio) => ({
        empresaErpId: servicio.empresaErpId,
        erpId: servicio.erpId,
        idServicio: servicio.idServicio,
        idTipoServicio: servicio.idTipoServicio ?? undefined,
        codigo: servicio.codigo,
        descripcion: servicio.descripcion,
        descripcionAbreviada: servicio.descripcionAbreviada ?? undefined,
        idUnidadMedida: servicio.idUnidadMedida ?? undefined,
        idMoneda: servicio.idMoneda ?? undefined,
        precioUnitario: servicio.precioUnitario ?? undefined,
        idMonedaPersonal: servicio.idMonedaPersonal ?? undefined,
        importePersonal: servicio.importePersonal ?? undefined,
        activo: servicio.activo,
        imputaDosis: servicio.imputaDosis,
        actualizadoEn: servicio.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tipos-servicio-importados', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const tiposServicio = await prisma.erpTipoServicio.findMany({
      where: { empresaErpId: 'global' },
      orderBy: [{ descripcion: 'asc' }],
    });

    res.json({
      tiposServicio: tiposServicio.map((tipo) => ({
        empresaErpId: tipo.empresaErpId,
        erpId: tipo.erpId,
        idTipoServicio: tipo.idTipoServicio,
        codigo: tipo.codigo,
        descripcion: tipo.descripcion,
        exigeInsumo: tipo.exigeInsumo,
        disponibleOt: tipo.disponibleOt,
        disponibleCompras: tipo.disponibleCompras,
        disponibleVentas: tipo.disponibleVentas,
        categoria: tipo.categoria ?? undefined,
        idCuentaContable: tipo.idCuentaContable ?? undefined,
        actualizadoEn: tipo.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/monedas-importadas', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const monedas = await prisma.erpMoneda.findMany({
      where: { empresaErpId: 'global' },
      orderBy: [{ nombre: 'asc' }],
    });

    res.json({
      monedas: monedas.map((moneda) => ({
        empresaErpId: moneda.empresaErpId,
        erpId: moneda.erpId,
        idMoneda: moneda.idMoneda,
        codigo: moneda.codigo,
        nombre: moneda.nombre,
        simbolo: moneda.simbolo ?? undefined,
        activo: moneda.activo,
        actualizadoEn: moneda.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/puertos-importados', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const puertos = await prisma.erpPuerto.findMany({
      where: { empresaErpId: 'global' },
      orderBy: [{ nombre: 'asc' }],
    });

    res.json({
      puertos: puertos.map((puerto) => ({
        empresaErpId: puerto.empresaErpId,
        erpId: puerto.erpId,
        idPuerto: puerto.idPuerto,
        codigo: puerto.codigo,
        nombre: puerto.nombre,
        activo: puerto.activo,
        actualizadoEn: puerto.actualizadoEn.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/lotes-importados', async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    const empresasSeleccionadas = await listarEmpresasErpCliente(clienteId);
    const empresaErpIds = empresasSeleccionadas.map((empresa) => empresa.empresaErpId);
    const camposAsignados = user ? await obtenerCamposAsignados(user) : null;
    const usaPaginacion = req.query.limit !== undefined || req.query.limite !== undefined || req.query.offset !== undefined || req.query.desplazamiento !== undefined;
    const limit = limitarEnteroQuery(req.query.limit ?? req.query.limite, 200, 1, 500);
    const offset = limitarEnteroQuery(req.query.offset ?? req.query.desplazamiento, 0, 0, Number.MAX_SAFE_INTEGER);
    const q = obtenerTextoQuery(req.query.q ?? req.query.busqueda);
    const campoErpId = obtenerTextoQuery(req.query.campoErpId);
    const where: Prisma.ErpLoteWhereInput = {
      empresaErpId: { in: empresaErpIds },
      ...(camposAsignados ? { campoErpId: { in: camposAsignados } } : {}),
      ...(campoErpId ? { campoErpId } : {}),
      ...(q ? {
        OR: [
          { codigo: { contains: q, mode: 'insensitive' } },
          { nombre: { contains: q, mode: 'insensitive' } },
          { cultivoNombre: { contains: q, mode: 'insensitive' } },
          { campo: { nombre: { contains: q, mode: 'insensitive' } } },
        ],
      } : {}),
    };
    const orderBy = [{ nombre: 'asc' as const }, { codigo: 'asc' as const }];
    const [total, lotes] = usaPaginacion
      ? await prisma.$transaction([
        prisma.erpLote.count({ where }),
        prisma.erpLote.findMany({ where, orderBy, skip: offset, take: limit }),
      ])
      : [
        undefined,
        await prisma.erpLote.findMany({
          where,
          orderBy,
        }),
      ];

    res.json({
      lotes: lotes.map((lote) => ({
        empresaErpId: lote.empresaErpId,
        erpId: lote.erpId,
        idLote: lote.idLote,
        idCampo: lote.idCampo,
        campoErpId: lote.campoErpId,
        codigo: lote.codigo,
        nombre: lote.nombre,
        cultivoCodigo: lote.cultivoCodigo ?? undefined,
        cultivoNombre: lote.cultivoNombre ?? undefined,
        areaHectareas: lote.areaHectareas,
        hectareasProductivas: lote.hectareasProductivas ?? undefined,
        admiteGanaderia: lote.admiteGanaderia ?? undefined,
        admiteLecheria: lote.admiteLecheria ?? undefined,
        codigoSima: lote.codigoSima ?? undefined,
        activo: lote.activo,
        actualizadoEn: lote.actualizadoEn.toISOString(),
      })),
      ...(usaPaginacion ? {
        total,
        limit,
        offset,
        hasMore: offset + lotes.length < (total ?? 0),
      } : {}),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sincronizaciones', requierePermiso('erp:sincronizar'), async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    res.json(await listarHistorialSincronizacionesErp(clienteId));
  } catch (error) {
    next(error);
  }
});

export async function resolverSincronizarErp(
  user: RequestConUsuario['user'],
  body: SincronizarErpRequest,
  deps: ResolverSincronizarErpDeps = depsSincronizarErp,
): Promise<{ status: number; body: { error: string } | { ok: true; resultado: Awaited<ReturnType<typeof sincronizarSnapshotErp>> } }> {
  const clienteId = user?.clienteId;

  if (!clienteId) {
    return { status: 400, body: { error: 'El usuario no tiene cliente asociado.' } };
  }

  if (deps.clientesEnProceso.has(clienteId)) {
    return { status: 409, body: { error: 'Ya hay una sincronizacion en curso para este cliente.' } };
  }

  deps.clientesEnProceso.add(clienteId);

  let historial: Awaited<ReturnType<typeof iniciarSincronizacionErpHistorial>> | null = null;

  try {
    historial = await deps.iniciarHistorial(clienteId, user?.sub, body.items);
    const resultado = await deps.sincronizarSnapshot(clienteId, {
      id: user?.sub,
      clienteId,
    }, body.items);
    await deps.asegurarPadrones(clienteId, null);
    await deps.finalizarHistorial(historial.id, clienteId, historial.itemsEjecutados, resultado);

    return {
      status: 200,
      body: {
        ok: true,
        resultado,
      },
    };
  } catch (error) {
    if (historial) {
      await deps.fallarHistorial(historial.id, error);
    }

    throw error;
  } finally {
    deps.clientesEnProceso.delete(clienteId);
  }
}

router.post('/sincronizar', requierePermiso('erp:sincronizar'), async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const respuesta = await resolverSincronizarErp(user, req.body as SincronizarErpRequest);

    return res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    next(error);
  }
});

export default router;
