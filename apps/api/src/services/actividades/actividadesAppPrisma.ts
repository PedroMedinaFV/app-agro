import type {
  ActividadApp,
  EpocaSiembraActividad,
  GuardarActividadAppRequest,
  GuardarActividadAppResponse,
  TipoCultivoActividad,
  TipoGranoActividad,
} from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import {
  crearErrorValidacion,
  obtenerIdEspecieDesdeErpId,
  prepararActividadApp,
  validarActividadAppBasica,
} from '../planificacion/validacionesPadronesApp';

type ActividadPrisma = Prisma.ActividadAppGetPayload<Record<string, never>>;

function mapearActividad(actividad: ActividadPrisma): ActividadApp {
  return {
    id: actividad.id,
    clienteId: actividad.clienteId,
    empresaErpId: actividad.empresaErpId,
    actividadErpId: actividad.actividadErpId || undefined,
    especieAppId: actividad.especieAppId || undefined,
    especieErpId: actividad.especieErpId || undefined,
    nombre: actividad.nombre,
    codigoInterno: actividad.codigoInterno || undefined,
    tipoGrano: actividad.tipoGrano as ActividadApp['tipoGrano'] || undefined,
    tipoCultivo: actividad.tipoCultivo as ActividadApp['tipoCultivo'] || undefined,
    epocaSiembra: actividad.epocaSiembra as ActividadApp['epocaSiembra'] || undefined,
    estadoVinculacion: actividad.estadoVinculacion as ActividadApp['estadoVinculacion'],
    createdAt: actividad.createdAt.toISOString(),
    updatedAt: actividad.updatedAt.toISOString(),
  };
}

async function validarActividad(actividad: ActividadApp, usuario?: UsuarioAuditoria) {
  validarActividadAppBasica(actividad, usuario);

  const especieApp = actividad.especieAppId
    ? await prisma.especieApp.findUnique({ where: { id: actividad.especieAppId } })
    : null;

  if (actividad.especieAppId && (!especieApp || especieApp.clienteId !== actividad.clienteId)) {
    throw crearErrorValidacion('La especie seleccionada no pertenece al cliente.', 403);
  }

  if (actividad.actividadErpId) {
    const actividadErp = await prisma.erpActividad.findUnique({ where: { erpId: actividad.actividadErpId } });

    if (!actividadErp) {
      throw crearErrorValidacion('La actividad ERP seleccionada no existe en la cache importada.');
    }

    const especieErpIdEsperada = actividad.especieErpId || especieApp?.especieErpId;
    const idEspecieEsperada = especieErpIdEsperada ? obtenerIdEspecieDesdeErpId(especieErpIdEsperada) : undefined;

    if (idEspecieEsperada && actividadErp.idEspecie && idEspecieEsperada !== actividadErp.idEspecie) {
      throw crearErrorValidacion('La actividad ERP no pertenece a la especie seleccionada.');
    }

    const actividadYaVinculada = await prisma.actividadApp.findFirst({
      where: {
        clienteId: actividad.clienteId,
        actividadErpId: actividad.actividadErpId,
        id: { not: actividad.id },
      },
    });

    if (actividadYaVinculada) {
      throw crearErrorValidacion('Esa actividad ERP ya esta vinculada a otra actividad del cliente.');
    }
  }
}

export async function obtenerActividadesAppPersistidas(clienteId: string): Promise<ActividadApp[]> {
  const actividades = await prisma.actividadApp.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return actividades.map(mapearActividad);
}

export async function guardarActividadAppPersistida(
  id: string,
  request: GuardarActividadAppRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarActividadAppResponse> {
  const actividad = prepararActividadApp({ ...request.actividad, id });
  await validarActividad(actividad, usuario);

  return prisma.$transaction(async (tx) => {
    const existente = await tx.actividadApp.findUnique({ where: { id } });
    const existenteMismoCodigo = actividad.codigoInterno
      ? await tx.actividadApp.findFirst({
        where: {
          clienteId: actividad.clienteId,
          codigoInterno: actividad.codigoInterno,
          id: { not: id },
        },
      })
      : null;

    if (existenteMismoCodigo) {
      throw crearErrorValidacion('Ya existe una actividad con ese codigo interno.');
    }

    const guardada = await tx.actividadApp.upsert({
      where: { id },
      update: {
        empresaErpId: actividad.empresaErpId,
        actividadErpId: actividad.actividadErpId ?? null,
        especieAppId: actividad.especieAppId ?? null,
        especieErpId: actividad.especieErpId ?? null,
        nombre: actividad.nombre,
        codigoInterno: actividad.codigoInterno ?? null,
        tipoGrano: actividad.tipoGrano ?? null,
        tipoCultivo: actividad.tipoCultivo ?? null,
        epocaSiembra: actividad.epocaSiembra ?? null,
        estadoVinculacion: actividad.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: actividad.clienteId,
        empresaErpId: actividad.empresaErpId,
        actividadErpId: actividad.actividadErpId ?? null,
        especieAppId: actividad.especieAppId ?? null,
        especieErpId: actividad.especieErpId ?? null,
        nombre: actividad.nombre,
        codigoInterno: actividad.codigoInterno ?? null,
        tipoGrano: actividad.tipoGrano ?? null,
        tipoCultivo: actividad.tipoCultivo ?? null,
        epocaSiembra: actividad.epocaSiembra ?? null,
        estadoVinculacion: actividad.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const actividadMapeada = mapearActividad(guardada);

    await registrarAuditoria(tx, {
      clienteId: actividad.clienteId,
      usuario,
      entidad: 'ActividadApp',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearActividad(existente) : undefined,
      valoresDespues: actividadMapeada,
    });

    return {
      actividad: actividadMapeada,
      auditado: true,
      mensaje: existente ? 'Actividad actualizada con auditoria.' : 'Actividad creada con auditoria.',
    };
  });
}
