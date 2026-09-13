import { Request, Router } from 'express';
import type { CerrarPlanificacionRequest, CopiarProtocoloRequest, GuardarPlanificacionRequest, GuardarProtocoloRequest } from '@agro/tipos';
import { requierePermiso } from '../middleware/permisos';
import { cerrarPlanificacionPersistida, guardarPlanificacionPersistida, obtenerPlanificacionesPersistidas } from '../services/planificacion/planificacionesPrisma';
import { copiarProtocoloPersistido, guardarProtocoloPersistido, obtenerProtocolosPersistidos } from '../services/planificacion/protocolosPrisma';
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

router.get('/snapshot', requierePermiso('planificacion:leer'), async (req, res, next) => {
  try {
    const request = req as RequestConUsuario;
    const clienteId = request.user?.clienteId || (req.query.clienteId as string | undefined) || 'cliente-demo';
    const planificacionesPersistidas = await obtenerPlanificacionesPersistidas(clienteId);
    const preciosPersistidos = await obtenerPreciosReferenciaPersistidos(clienteId);
    const destinosPersistidos = await obtenerDestinosReferenciaPersistidos(clienteId);
    const gastosPersistidos = await obtenerGastosComercialesPersistidos(clienteId);
    const conceptosPersistidos = await obtenerConceptosGastosComercialesPersistidos(clienteId);
    const protocolosPersistidos = await obtenerProtocolosPersistidos(clienteId);
    const estadiosPersistidos = await asegurarEstadiosReferenciaSemilla(clienteId);
    const usuarioAutorizado = request.user?.sub ? {
      sub: request.user.sub,
      rol: request.user.rol,
      clienteId: request.user.clienteId,
    } : undefined;
    const camposAsignados = usuarioAutorizado ? await obtenerCamposAsignados(usuarioAutorizado) : null;

    const padronesPersistidos = await obtenerPadronesPlanificacionPersistidos(clienteId, camposAsignados);
    const loteErpIds = padronesPersistidos.lotesApp
      .map((lote) => lote.loteErpId)
      .filter((loteErpId): loteErpId is string => Boolean(loteErpId));
    const cultivosErp = loteErpIds.length
      ? await prisma.erpCultivo.findMany({
        where: {
          loteErpId: { in: loteErpIds },
          activo: true,
        },
        orderBy: [{ idCampania: 'desc' }, { nombre: 'asc' }],
      })
      : [];

    res.json({
      zonasApp: padronesPersistidos.zonasApp,
      camposApp: padronesPersistidos.camposApp,
      lotesApp: padronesPersistidos.lotesApp,
      especiesApp: padronesPersistidos.especiesApp,
      actividadesApp: padronesPersistidos.actividadesApp,
      insumosApp: padronesPersistidos.insumosApp,
      planificaciones: planificacionesPersistidas,
      protocolos: protocolosPersistidos.protocolos,
      preciosReferencia: preciosPersistidos,
      destinosReferencia: destinosPersistidos,
      conceptosGastosComerciales: conceptosPersistidos,
      gastosComercialesReferencia: gastosPersistidos,
      estadiosReferencia: estadiosPersistidos,
      serviciosApp: padronesPersistidos.serviciosApp,
      cultivosErp: cultivosErp.map((cultivo) => ({
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
      })),
      sincronizadoEn: new Date().toISOString(),
    });
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
    const clienteId = request.user?.clienteId || (req.query.clienteId as string | undefined) || 'cliente-demo';
    await asegurarEstadiosReferenciaSemilla(clienteId);
    const persistidos = await obtenerProtocolosPersistidos(clienteId);

    res.json(persistidos);
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
