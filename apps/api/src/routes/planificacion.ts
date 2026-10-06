import { Request, Router } from 'express';
import type { CerrarPlanificacionRequest, CopiarProtocoloRequest, ErpCultivo, GuardarPlanificacionRequest, GuardarProtocoloRequest, PlanificacionAgricola } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import {
  cerrarPlanificacionPersistida,
  obtenerPlanificacionPersistida,
  guardarPlanificacionPersistida,
  obtenerPlanificacionesPersistidas,
  obtenerPlanificacionesResumenPersistidas,
} from '../services/planificacion/planificacionesPrisma';
import { copiarProtocoloPersistido, guardarProtocoloPersistido, obtenerProtocolosPersistidos, obtenerProtocolosResumenPersistidos } from '../services/planificacion/protocolosPrisma';
import { obtenerDestinosReferenciaPersistidos, obtenerPreciosReferenciaPersistidos } from '../services/preciosReferencia/preciosReferenciaPrisma';
import { obtenerGastosComercialesPersistidos } from '../services/gastosComerciales/gastosComercialesPrisma';
import { obtenerConceptosGastosComercialesPersistidos } from '../services/gastosComerciales/conceptosGastosComerciales';
import { obtenerCamposAsignados } from '../services/usuarios/asignacionCampos';
import { obtenerPadronesPlanificacionPersistidos } from '../services/planificacion/padronesPlanificacionPrisma';
import { asegurarEstadiosReferenciaSemilla } from '../services/planificacion/estadiosReferenciaPrisma';
import { prisma } from '../prisma';

const router = Router();
type RequestConUsuario = Request & {
  user?: { sub?: string; email?: string; clienteId?: string; rol?: string };
};

function obtenerClienteId(req: Request, request: RequestConUsuario) {
  const clienteId = request.user?.clienteId || (req.query.clienteId as string | undefined);

  if (!clienteId) {
    const error = new Error('La sesion no tiene cliente asignado.') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  return clienteId;
}

async function obtenerSnapshotPlanificacion(
  clienteId: string,
  usuarioAutorizado: { sub?: string; rol?: string; clienteId?: string } | undefined,
  planificaciones: PlanificacionAgricola[],
  opciones: { detalleEditor?: boolean; incluirCultivos?: boolean } = {},
) {
  const detalleEditor = opciones.detalleEditor ?? false;
  const incluirCultivos = opciones.incluirCultivos ?? !detalleEditor;
  const referenciasPromise = Promise.all([
    obtenerPreciosReferenciaPersistidos(clienteId),
    obtenerDestinosReferenciaPersistidos(clienteId),
    obtenerGastosComercialesPersistidos(clienteId),
    detalleEditor ? Promise.resolve([]) : obtenerConceptosGastosComercialesPersistidos(clienteId),
    detalleEditor ? obtenerProtocolosResumenPersistidos(clienteId) : obtenerProtocolosPersistidos(clienteId),
    detalleEditor ? Promise.resolve([]) : asegurarEstadiosReferenciaSemilla(clienteId),
  ]);
  const camposAsignadosPromise = usuarioAutorizado?.sub ? obtenerCamposAsignados({
    sub: usuarioAutorizado.sub,
    rol: usuarioAutorizado.rol,
    clienteId: usuarioAutorizado.clienteId,
  }) : Promise.resolve(null);
  const loteErpIds = Array.from(new Set(planificaciones
    .flatMap((planificacion) => planificacion.lineas.map((linea) => linea.loteErpId))
    .filter((loteErpId): loteErpId is string => Boolean(loteErpId))));
  const campaniaAnteriorPromise = detalleEditor && incluirCultivos ? obtenerCampaniaAnteriorErpId(planificaciones[0]?.campaniaErpId) : Promise.resolve(undefined);
  const padronesPromise = camposAsignadosPromise.then((camposAsignados) => obtenerPadronesPlanificacionPersistidos(clienteId, camposAsignados, {
    incluirCostos: !detalleEditor,
  }));
  const cultivosPromise = campaniaAnteriorPromise.then((campaniaAnteriorErpId) => (
    incluirCultivos && loteErpIds.length
      ? prisma.erpCultivo.findMany({
        where: {
          loteErpId: { in: loteErpIds },
          ...(campaniaAnteriorErpId ? { campaniaErpId: campaniaAnteriorErpId } : {}),
          activo: true,
        },
        orderBy: [{ idCampania: 'desc' }, { nombre: 'asc' }],
      })
      : Promise.resolve([])
  ));
  const [
    [
      preciosPersistidos,
      destinosPersistidos,
      gastosPersistidos,
      conceptosPersistidos,
      protocolosPersistidos,
      estadiosPersistidos,
    ],
    padronesPersistidos,
    cultivosErp,
  ] = await Promise.all([
    referenciasPromise,
    padronesPromise,
    cultivosPromise,
  ]);

  return {
    zonasApp: padronesPersistidos.zonasApp,
    camposApp: padronesPersistidos.camposApp,
    lotesApp: padronesPersistidos.lotesApp,
    especiesApp: padronesPersistidos.especiesApp,
    actividadesApp: padronesPersistidos.actividadesApp,
    insumosApp: padronesPersistidos.insumosApp,
    planificaciones,
    protocolos: Array.isArray(protocolosPersistidos) ? protocolosPersistidos : protocolosPersistidos.protocolos,
    preciosReferencia: preciosPersistidos,
    destinosReferencia: destinosPersistidos,
    conceptosGastosComerciales: conceptosPersistidos,
    gastosComercialesReferencia: gastosPersistidos,
    estadiosReferencia: estadiosPersistidos,
    serviciosApp: padronesPersistidos.serviciosApp,
    cultivosErp: cultivosErp.map(mapearCultivoErp),
    sincronizadoEn: new Date().toISOString(),
  };
}

function mapearCultivoErp(cultivo: {
  empresaErpId: string;
  erpId: string;
  idCultivo: number;
  codigo: string;
  nombre: string;
  idCampo: number;
  campoErpId: string;
  idLote: number;
  loteErpId: string;
  idActividad: number | null;
  actividadErpId: string | null;
  idEspecie: number | null;
  especieErpId: string | null;
  idCampania: number | null;
  campaniaErpId: string | null;
  hectareas: number;
  hectareasSembradas: number;
  hectareasCosechadas: number;
  idPuerto: number | null;
  distanciaPuerto: number | null;
  idPersonalResponsable: number | null;
  esAgriculturaIntensiva: boolean;
  socioEnFuncionAportes: boolean;
  activo: boolean;
  actualizadoEn: Date;
}): ErpCultivo {
  return {
    empresaErpId: cultivo.empresaErpId,
    erpId: cultivo.erpId,
    idCultivo: cultivo.idCultivo,
    codigo: cultivo.codigo,
    nombre: cultivo.nombre,
    idCampo: cultivo.idCampo,
    campoErpId: cultivo.campoErpId,
    idLote: cultivo.idLote,
    loteErpId: cultivo.loteErpId,
    idActividad: cultivo.idActividad || undefined,
    actividadErpId: cultivo.actividadErpId || undefined,
    idEspecie: cultivo.idEspecie || undefined,
    especieErpId: cultivo.especieErpId || undefined,
    idCampania: cultivo.idCampania || undefined,
    campaniaErpId: cultivo.campaniaErpId || undefined,
    hectareas: cultivo.hectareas,
    hectareasSembradas: cultivo.hectareasSembradas,
    hectareasCosechadas: cultivo.hectareasCosechadas,
    idPuerto: cultivo.idPuerto || undefined,
    distanciaPuerto: cultivo.distanciaPuerto || undefined,
    idPersonalResponsable: cultivo.idPersonalResponsable || undefined,
    esAgriculturaIntensiva: cultivo.esAgriculturaIntensiva,
    socioEnFuncionAportes: cultivo.socioEnFuncionAportes,
    activo: cultivo.activo,
    actualizadoEn: cultivo.actualizadoEn.toISOString(),
  };
}

function obtenerCodigoCampaniaAnterior(codigo?: string | null) {
  const partes = codigo?.match(/^(\d{2})\/(\d{2})$/);

  if (!partes) {
    return undefined;
  }

  const inicio = Number(partes[1]);
  const fin = Number(partes[2]);

  if (!Number.isFinite(inicio) || !Number.isFinite(fin)) {
    return undefined;
  }

  return `${String(inicio - 1).padStart(2, '0')}/${String(fin - 1).padStart(2, '0')}`;
}

async function obtenerCampaniaAnteriorErpId(campaniaErpId?: string) {
  if (!campaniaErpId) {
    return undefined;
  }

  const campania = await prisma.erpCampania.findUnique({
    where: { erpId: campaniaErpId },
    select: { codigo: true },
  });
  const codigoAnterior = obtenerCodigoCampaniaAnterior(campania?.codigo);

  if (!codigoAnterior) {
    return undefined;
  }

  const campaniaAnterior = await prisma.erpCampania.findFirst({
    where: {
      codigo: codigoAnterior,
      activo: true,
    },
    select: { erpId: true },
  });

  return campaniaAnterior?.erpId;
}

router.get('/resumen', requierePermiso('planificacion:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = obtenerClienteId(req, request);
    const [planificaciones, camposProvisorios] = await Promise.all([
      obtenerPlanificacionesResumenPersistidas(clienteId),
      prisma.campoApp.count({
        where: {
          clienteId,
          estadoVinculacion: 'provisorio',
        },
      }),
    ]);

    res.json({
      planificaciones,
      camposProvisorios,
      sincronizadoEn: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/snapshot', requierePermiso('planificacion:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = obtenerClienteId(req, request);
    const planificacionesPersistidas = await obtenerPlanificacionesPersistidas(clienteId);
    const usuarioAutorizado = request.user?.sub ? {
      sub: request.user.sub,
      rol: request.user.rol,
      clienteId: request.user.clienteId,
    } : undefined;

    res.json(await obtenerSnapshotPlanificacion(clienteId, usuarioAutorizado, planificacionesPersistidas));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requierePermiso('planificacion:editar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await guardarPlanificacionPersistida(req.params.id, req.body as GuardarPlanificacionRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cerrar', requierePermiso('planificacion:cerrar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await cerrarPlanificacionPersistida(req.params.id, req.body as CerrarPlanificacionRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

router.get('/protocolos/snapshot', requierePermiso('planificacion:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = obtenerClienteId(req, request);
    await asegurarEstadiosReferenciaSemilla(clienteId);
    const persistidos = await obtenerProtocolosPersistidos(clienteId);

    res.json(persistidos);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/snapshot', requierePermiso('planificacion:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = obtenerClienteId(req, request);
    const planificacion = await obtenerPlanificacionPersistida(clienteId, req.params.id);

    if (!planificacion) {
      return res.status(404).json({ error: 'No existe la planificacion solicitada.' });
    }

    const usuarioAutorizado = request.user?.sub ? {
      sub: request.user.sub,
      rol: request.user.rol,
      clienteId: request.user.clienteId,
    } : undefined;

    res.json(await obtenerSnapshotPlanificacion(clienteId, usuarioAutorizado, [planificacion], { detalleEditor: true }));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/cultivos-antecesores', requierePermiso('planificacion:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = obtenerClienteId(req, request);
    const planificacion = await obtenerPlanificacionPersistida(clienteId, req.params.id);

    if (!planificacion) {
      return res.status(404).json({ error: 'No existe la planificacion solicitada.' });
    }

    const loteErpIds = Array.from(new Set(planificacion.lineas
      .map((linea) => linea.loteErpId)
      .filter((loteErpId): loteErpId is string => Boolean(loteErpId))));
    const campaniaAnteriorErpId = await obtenerCampaniaAnteriorErpId(planificacion.campaniaErpId);
    const cultivos = loteErpIds.length
      ? await prisma.erpCultivo.findMany({
        where: {
          loteErpId: { in: loteErpIds },
          ...(campaniaAnteriorErpId ? { campaniaErpId: campaniaAnteriorErpId } : {}),
          activo: true,
        },
        orderBy: [{ idCampania: 'desc' }, { nombre: 'asc' }],
      })
      : [];

    res.json({
      cultivos: cultivos.map(mapearCultivoErp),
      sincronizadoEn: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/protocolos', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const body = req.body as GuardarProtocoloRequest;

    res.status(201).json(await guardarProtocoloPersistido(body.protocolo.id, body, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

router.put('/protocolos/:id', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.json(await guardarProtocoloPersistido(req.params.id, req.body as GuardarProtocoloRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/protocolos/:id/copiar', requierePermiso('planificacion:configurar'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;

    res.status(201).json(await copiarProtocoloPersistido(req.params.id, req.body as CopiarProtocoloRequest, {
      id: request.user?.sub,
      clienteId: request.user?.clienteId,
      email: request.user?.email,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
