import { esCopiaAutomaticaErp } from '@agro/tipos';
import { consolidarCopiaErp } from '../planificacion/consolidarCopiaErp';
import type { GuardarZonaAppRequest, GuardarZonaAppResponse, ZonaApp } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import {
  crearErrorValidacion,
  prepararZonaApp,
  validarZonaAppBasica,
} from '../planificacion/validacionesPadronesApp';

type ZonaPrisma = Prisma.ZonaAppGetPayload<Record<string, never>>;

function mapearZona(zona: ZonaPrisma): ZonaApp {
  return {
    id: zona.id,
    vinculoAutomatico: esCopiaAutomaticaErp('zonas', zona),
    clienteId: zona.clienteId,
    empresaErpId: zona.empresaErpId,
    zonaErpId: zona.zonaErpId || undefined,
    nombre: zona.nombre,
    codigoInterno: zona.codigoInterno || undefined,
    estadoVinculacion: zona.estadoVinculacion as ZonaApp['estadoVinculacion'],
    createdAt: zona.createdAt.toISOString(),
    updatedAt: zona.updatedAt.toISOString(),
  };
}

async function validarZona(zona: ZonaApp, usuario?: UsuarioAuditoria) {
  validarZonaAppBasica(zona, usuario);

  if (zona.zonaErpId) {
    const zonaErp = await prisma.erpZona.findUnique({ where: { erpId: zona.zonaErpId } });

    if (!zonaErp) {
      throw crearErrorValidacion('La zona ERP seleccionada no existe en la cache importada.');
    }

  }
}

export async function obtenerZonasAppPersistidas(clienteId: string): Promise<ZonaApp[]> {
  const zonas = await prisma.zonaApp.findMany({
    where: { clienteId },
    orderBy: [{ nombre: 'asc' }],
  });

  return zonas.map(mapearZona);
}

export async function guardarZonaAppPersistida(
  id: string,
  request: GuardarZonaAppRequest,
  usuario?: UsuarioAuditoria,
): Promise<GuardarZonaAppResponse> {
  const zona = prepararZonaApp({ ...request.zona, id });
  await validarZona(zona, usuario);

  return prisma.$transaction(async (tx) => {
    await consolidarCopiaErp(tx, 'zonas', zona, usuario);
    const existente = await tx.zonaApp.findUnique({ where: { id } });
    if (existente && existente.clienteId !== zona.clienteId) throw crearErrorValidacion('El registro pertenece a otro cliente.', 403);
    const existenteMismoCodigo = zona.codigoInterno
      ? await tx.zonaApp.findFirst({
        where: {
          clienteId: zona.clienteId,
          codigoInterno: zona.codigoInterno,
          id: { not: id },
        },
      })
      : null;

    if (existenteMismoCodigo) {
      throw crearErrorValidacion('Ya existe una zona con ese codigo interno.');
    }

    const guardada = await tx.zonaApp.upsert({
      where: { id },
      update: {
        empresaErpId: zona.empresaErpId,
        zonaErpId: zona.zonaErpId ?? null,
        nombre: zona.nombre,
        codigoInterno: zona.codigoInterno ?? null,
        estadoVinculacion: zona.estadoVinculacion,
        updatedBy: usuario?.id,
      },
      create: {
        id,
        clienteId: zona.clienteId,
        empresaErpId: zona.empresaErpId,
        zonaErpId: zona.zonaErpId ?? null,
        nombre: zona.nombre,
        codigoInterno: zona.codigoInterno ?? null,
        estadoVinculacion: zona.estadoVinculacion,
        createdBy: usuario?.id,
        updatedBy: usuario?.id,
      },
    });
    const zonaMapeada = mapearZona(guardada);

    await registrarAuditoria(tx, {
      clienteId: zona.clienteId,
      usuario,
      entidad: 'ZonaApp',
      entidadId: id,
      accion: existente ? 'actualizar' : 'crear',
      origen: request.origen,
      motivo: request.motivo,
      valoresAntes: existente ? mapearZona(existente) : undefined,
      valoresDespues: zonaMapeada,
    });

    return {
      zona: zonaMapeada,
      auditado: true,
      mensaje: existente ? 'Zona actualizada con auditoria.' : 'Zona creada con auditoria.',
    };
  }, { timeout: 60000, maxWait: 10000 });
}
