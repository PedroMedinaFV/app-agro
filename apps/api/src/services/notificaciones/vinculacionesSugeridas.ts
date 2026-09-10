import type { Prisma } from '@prisma/client';
import type { ResolverNotificacionVinculacionResponse } from '@agro/tipos';
import { prisma } from '../../prisma';
import { guardarActividadAppPersistida } from '../actividades/actividadesAppPrisma';
import { guardarCampoAppPersistido } from '../campos/camposAppPrisma';
import { guardarEspecieAppPersistida } from '../especies/especiesAppPrisma';
import { guardarInsumoAppPersistido } from '../insumos/insumosAppPrisma';
import { guardarServicioAppPersistido } from '../servicios/serviciosAppPrisma';
import { guardarLoteAppPersistido } from '../lotes/lotesAppPrisma';
import { registrarAuditoria, UsuarioAuditoria } from '../planificacion/auditoria';
import { guardarZonaAppPersistida } from '../zonas/zonasAppPrisma';

type TipoEntidad = 'zonas' | 'campos' | 'lotes' | 'especies' | 'actividades' | 'insumos' | 'labores';

type CandidatoErp = {
  erpId: string;
  empresaErpId: string;
  codigo?: string | null;
  nombre: string;
  snapshot: Record<string, unknown>;
};

type SugerenciaDetectada = {
  entidadTipo: TipoEntidad;
  entidadPlanificacionId: string;
  entidadNombre: string;
  entidadCodigo?: string | null;
  candidato: CandidatoErp;
  puntaje: number;
  motivo: string;
};

function limpiarTextoVisible(valor: string) {
  return valor.trim().replace(/\s+/g, ' ');
}

function normalizarParaComparar(valor: string) {
  return limpiarTextoVisible(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function calcularPuntaje(codigoOrigen: string, nombreOrigen: string, codigoCandidato: string, nombreCandidato: string) {
  if (codigoOrigen && codigoOrigen === codigoCandidato) return 100;
  if (nombreOrigen && nombreOrigen === nombreCandidato) return 90;
  if (codigoOrigen && codigoOrigen === nombreCandidato) return 75;
  if (nombreOrigen && codigoCandidato && nombreOrigen === codigoCandidato) return 75;
  if (nombreOrigen && (nombreCandidato.includes(nombreOrigen) || nombreOrigen.includes(nombreCandidato))) return 60;

  const palabrasOrigen = new Set(nombreOrigen.split(' ').filter((palabra) => palabra.length > 2));
  const palabrasCandidato = nombreCandidato.split(' ').filter((palabra) => palabra.length > 2);
  const coincidencias = palabrasCandidato.filter((palabra) => palabrasOrigen.has(palabra)).length;

  return coincidencias > 0 ? Math.min(50, coincidencias * 20) : 0;
}

function describirPuntaje(puntaje: number) {
  if (puntaje >= 90) return 'coincidencia fuerte por codigo o nombre';
  if (puntaje >= 60) return 'coincidencia media por similitud';
  return 'coincidencia baja';
}

function buscarMejorCandidato(
  entidad: { codigo?: string | null; nombre: string },
  candidatos: CandidatoErp[],
) {
  const codigoOrigen = normalizarParaComparar(entidad.codigo || '');
  const nombreOrigen = normalizarParaComparar(entidad.nombre);

  return candidatos
    .map((candidato) => {
      const puntaje = calcularPuntaje(
        codigoOrigen,
        nombreOrigen,
        normalizarParaComparar(candidato.codigo || ''),
        normalizarParaComparar(candidato.nombre),
      );

      return { candidato, puntaje, motivo: describirPuntaje(puntaje) };
    })
    .filter((resultado) => resultado.puntaje >= 60)
    .sort((a, b) => b.puntaje - a.puntaje || a.candidato.nombre.localeCompare(b.candidato.nombre, 'es'))[0];
}

function obtenerIdDesdeErpId(erpId: string | null | undefined, prefijo: 'zona' | 'especie') {
  const match = erpId?.match(new RegExp(`${prefijo}:(\\d+)$`));

  return match ? Number(match[1]) : undefined;
}

function toJsonValue(valor: unknown) {
  return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
}

function crearErrorValidacion(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;

  return error;
}

function zonaErpIdDesdeIdZona(idZona: number | null | undefined) {
  return idZona ? `zona:${idZona}` : undefined;
}

function especieErpIdDesdeIdEspecie(idEspecie: number | null | undefined) {
  return idEspecie ? `especie:${idEspecie}` : undefined;
}

async function guardarSugerencia(clienteId: string, sugerencia: SugerenciaDetectada, usuario?: UsuarioAuditoria) {
  const existente = await prisma.vinculacionErpSugerida.findUnique({
    where: {
      clienteId_entidadTipo_entidadPlanificacionId_entidadErpId: {
        clienteId,
        entidadTipo: sugerencia.entidadTipo,
        entidadPlanificacionId: sugerencia.entidadPlanificacionId,
        entidadErpId: sugerencia.candidato.erpId,
      },
    },
  });

  if (existente && existente.estado !== 'pendiente') {
    return { creada: false };
  }

  const criterioCoincidencia = {
    entidadCodigo: sugerencia.entidadCodigo,
    entidadNombre: sugerencia.entidadNombre,
    candidatoCodigo: sugerencia.candidato.codigo,
    candidatoNombre: sugerencia.candidato.nombre,
    motivo: sugerencia.motivo,
  };

  const guardada = await prisma.vinculacionErpSugerida.upsert({
    where: {
      clienteId_entidadTipo_entidadPlanificacionId_entidadErpId: {
        clienteId,
        entidadTipo: sugerencia.entidadTipo,
        entidadPlanificacionId: sugerencia.entidadPlanificacionId,
        entidadErpId: sugerencia.candidato.erpId,
      },
    },
    create: {
      clienteId,
      empresaErpId: sugerencia.candidato.empresaErpId,
      entidadTipo: sugerencia.entidadTipo,
      entidadPlanificacionId: sugerencia.entidadPlanificacionId,
      entidadErpId: sugerencia.candidato.erpId,
      entidadErpSnapshot: toJsonValue(sugerencia.candidato.snapshot),
      puntajeCoincidencia: sugerencia.puntaje,
      criterioCoincidencia: toJsonValue(criterioCoincidencia),
      estado: 'pendiente',
    },
    update: {
      empresaErpId: sugerencia.candidato.empresaErpId,
      entidadErpSnapshot: toJsonValue(sugerencia.candidato.snapshot),
      puntajeCoincidencia: sugerencia.puntaje,
      criterioCoincidencia: toJsonValue(criterioCoincidencia),
      estado: 'pendiente',
    },
  });

  const notificacionExistente = await prisma.notificacionUsuario.findFirst({
    where: {
      clienteId,
      tipo: 'vinculacion_erp_sugerida',
      vinculacionSugeridaId: guardada.id,
      estado: 'pendiente',
    },
  });

  if (!notificacionExistente) {
    await prisma.notificacionUsuario.create({
      data: {
        clienteId,
        usuarioId: null,
        tipo: 'vinculacion_erp_sugerida',
        titulo: 'Vinculacion ERP sugerida',
        mensaje: `${sugerencia.entidadTipo}: ${sugerencia.entidadNombre} podria vincularse con ${sugerencia.candidato.codigo || 'sin codigo'} - ${sugerencia.candidato.nombre}.`,
        prioridad: sugerencia.puntaje >= 90 ? 'alta' : 'normal',
        estado: 'pendiente',
        vinculacionSugeridaId: guardada.id,
      },
    });
  }

  if (!existente) {
    await prisma.$transaction(async (tx) => {
      await registrarAuditoria(tx, {
        clienteId,
        usuario,
        entidad: 'VinculacionErpSugerida',
        entidadId: guardada.id,
        accion: 'crear',
        origen: 'api',
        motivo: 'Sugerencia generada luego de sincronizacion ERP.',
        valoresDespues: {
          entidadTipo: sugerencia.entidadTipo,
          entidadPlanificacionId: sugerencia.entidadPlanificacionId,
          entidadErpId: sugerencia.candidato.erpId,
          puntajeCoincidencia: sugerencia.puntaje,
        },
      });
    });
  }

  return { creada: !existente };
}

export async function generarSugerenciasVinculacionErp(clienteId: string, usuario?: UsuarioAuditoria) {
  const [
    zonas,
    campos,
    lotes,
    especies,
    actividades,
    insumos,
    labores,
    zonasErp,
    camposErp,
    lotesErp,
    especiesErp,
    actividadesErp,
    insumosErp,
    serviciosErp,
  ] = await Promise.all([
    prisma.zonaApp.findMany({ where: { clienteId, estadoVinculacion: 'provisorio', zonaErpId: null } }),
    prisma.campoApp.findMany({ where: { clienteId, estadoVinculacion: 'provisorio', campoErpId: null }, include: { zonaApp: true } }),
    prisma.loteApp.findMany({ where: { clienteId, estadoVinculacion: 'provisorio', loteErpId: null }, include: { campo: true } }),
    prisma.especieApp.findMany({ where: { clienteId, estadoVinculacion: 'provisorio', especieErpId: null } }),
    prisma.actividadApp.findMany({ where: { clienteId, estadoVinculacion: 'provisorio', actividadErpId: null }, include: { especieApp: true } }),
    prisma.insumoApp.findMany({ where: { clienteId, estadoVinculacion: 'provisorio', insumoErpId: null } }),
    prisma.servicioApp.findMany({ where: { clienteId, estadoVinculacion: 'provisorio', servicioErpId: null } }),
    prisma.erpZona.findMany({ where: { empresaErpId: 'global' } }),
    prisma.erpCampo.findMany(),
    prisma.erpLote.findMany(),
    prisma.erpEspecie.findMany({ where: { empresaErpId: 'global' } }),
    prisma.erpActividad.findMany({ where: { empresaErpId: 'global' } }),
    prisma.erpInsumo.findMany({ where: { empresaErpId: 'global' } }),
    prisma.erpServicio.findMany({ where: { empresaErpId: 'global' } }),
  ]);

  const usados = {
    zonas: new Set((await prisma.zonaApp.findMany({ where: { clienteId, zonaErpId: { not: null } }, select: { zonaErpId: true } })).map((item) => item.zonaErpId).filter(Boolean) as string[]),
    campos: new Set((await prisma.campoApp.findMany({ where: { clienteId, campoErpId: { not: null } }, select: { campoErpId: true } })).map((item) => item.campoErpId).filter(Boolean) as string[]),
    lotes: new Set((await prisma.loteApp.findMany({ where: { clienteId, loteErpId: { not: null } }, select: { loteErpId: true } })).map((item) => item.loteErpId).filter(Boolean) as string[]),
    especies: new Set((await prisma.especieApp.findMany({ where: { clienteId, especieErpId: { not: null } }, select: { especieErpId: true } })).map((item) => item.especieErpId).filter(Boolean) as string[]),
    actividades: new Set((await prisma.actividadApp.findMany({ where: { clienteId, actividadErpId: { not: null } }, select: { actividadErpId: true } })).map((item) => item.actividadErpId).filter(Boolean) as string[]),
    insumos: new Set((await prisma.insumoApp.findMany({ where: { clienteId, insumoErpId: { not: null } }, select: { insumoErpId: true } })).map((item) => item.insumoErpId).filter(Boolean) as string[]),
    labores: new Set((await prisma.servicioApp.findMany({ where: { clienteId, servicioErpId: { not: null } }, select: { servicioErpId: true } })).map((item) => item.servicioErpId).filter(Boolean) as string[]),
  };

  const sugerencias: SugerenciaDetectada[] = [];

  for (const zona of zonas) {
    const mejor = buscarMejorCandidato({ codigo: zona.codigoInterno, nombre: zona.nombre }, zonasErp.filter((item) => !usados.zonas.has(item.erpId)).map((item) => ({
      erpId: item.erpId,
      empresaErpId: item.empresaErpId,
      codigo: item.codigo,
      nombre: item.nombre,
      snapshot: item,
    })));
    if (mejor) sugerencias.push({ entidadTipo: 'zonas', entidadPlanificacionId: zona.id, entidadNombre: zona.nombre, entidadCodigo: zona.codigoInterno, ...mejor });
  }

  for (const campo of campos) {
    const idZonaEsperada = obtenerIdDesdeErpId(campo.zonaErpId || campo.zonaApp?.zonaErpId, 'zona');
    const mejor = buscarMejorCandidato({ codigo: campo.codigoInterno, nombre: campo.nombre }, camposErp
      .filter((item) => !usados.campos.has(item.erpId))
      .filter((item) => item.empresaErpId === campo.empresaErpId)
      .filter((item) => !idZonaEsperada || item.idZona === idZonaEsperada)
      .map((item) => ({ erpId: item.erpId, empresaErpId: item.empresaErpId, codigo: item.codigo, nombre: item.nombre, snapshot: item })));
    if (mejor) sugerencias.push({ entidadTipo: 'campos', entidadPlanificacionId: campo.id, entidadNombre: campo.nombre, entidadCodigo: campo.codigoInterno, ...mejor });
  }

  for (const lote of lotes) {
    const mejor = buscarMejorCandidato({ codigo: lote.codigoInterno, nombre: lote.nombre }, lotesErp
      .filter((item) => !usados.lotes.has(item.erpId))
      .filter((item) => !lote.campo.campoErpId || item.campoErpId === lote.campo.campoErpId)
      .map((item) => ({ erpId: item.erpId, empresaErpId: item.empresaErpId, codigo: item.codigo, nombre: item.nombre, snapshot: item })));
    if (mejor) sugerencias.push({ entidadTipo: 'lotes', entidadPlanificacionId: lote.id, entidadNombre: lote.nombre, entidadCodigo: lote.codigoInterno, ...mejor });
  }

  for (const especie of especies) {
    const mejor = buscarMejorCandidato({ codigo: especie.codigoInterno, nombre: especie.nombre }, especiesErp.filter((item) => !usados.especies.has(item.erpId)).map((item) => ({
      erpId: item.erpId,
      empresaErpId: item.empresaErpId,
      codigo: item.codigo,
      nombre: item.nombre,
      snapshot: item,
    })));
    if (mejor) sugerencias.push({ entidadTipo: 'especies', entidadPlanificacionId: especie.id, entidadNombre: especie.nombre, entidadCodigo: especie.codigoInterno, ...mejor });
  }

  for (const actividad of actividades) {
    const idEspecieEsperada = obtenerIdDesdeErpId(actividad.especieErpId || actividad.especieApp?.especieErpId, 'especie');
    const mejor = buscarMejorCandidato({ codigo: actividad.codigoInterno, nombre: actividad.nombre }, actividadesErp
      .filter((item) => !usados.actividades.has(item.erpId))
      .filter((item) => !idEspecieEsperada || item.idEspecie === idEspecieEsperada)
      .map((item) => ({ erpId: item.erpId, empresaErpId: item.empresaErpId, codigo: item.codigo, nombre: item.descripcion, snapshot: item })));
    if (mejor) sugerencias.push({ entidadTipo: 'actividades', entidadPlanificacionId: actividad.id, entidadNombre: actividad.nombre, entidadCodigo: actividad.codigoInterno, ...mejor });
  }

  for (const insumo of insumos) {
    const mejor = buscarMejorCandidato({ codigo: insumo.codigoInterno, nombre: insumo.nombre }, insumosErp.filter((item) => !usados.insumos.has(item.erpId)).map((item) => ({
      erpId: item.erpId,
      empresaErpId: item.empresaErpId,
      codigo: item.codigo,
      nombre: item.nombre,
      snapshot: item,
    })));
    if (mejor) sugerencias.push({ entidadTipo: 'insumos', entidadPlanificacionId: insumo.id, entidadNombre: insumo.nombre, entidadCodigo: insumo.codigoInterno, ...mejor });
  }

  for (const labor of labores) {
    const mejor = buscarMejorCandidato({ codigo: labor.codigo, nombre: labor.nombre }, serviciosErp.filter((item) => !usados.labores.has(item.erpId)).map((item) => ({
      erpId: item.erpId,
      empresaErpId: item.empresaErpId,
      codigo: item.codigo,
      nombre: item.descripcion,
      snapshot: item,
    })));
    if (mejor) sugerencias.push({ entidadTipo: 'labores', entidadPlanificacionId: labor.id, entidadNombre: labor.nombre, entidadCodigo: labor.codigo, ...mejor });
  }

  let creadas = 0;

  for (const sugerencia of sugerencias) {
    const resultado = await guardarSugerencia(clienteId, sugerencia, usuario);
    if (resultado.creada) creadas += 1;
  }

  return {
    detectadas: sugerencias.length,
    creadas,
  };
}

export async function listarNotificacionesPendientes(clienteId: string) {
  const notificaciones = await prisma.notificacionUsuario.findMany({
    where: {
      clienteId,
      estado: 'pendiente',
    },
    include: {
      vinculacionSugerida: true,
    },
    orderBy: [{ prioridad: 'asc' }, { createdAt: 'desc' }],
  });

  return notificaciones.map((notificacion) => ({
    id: notificacion.id,
    clienteId: notificacion.clienteId,
    tipo: notificacion.tipo,
    titulo: notificacion.titulo,
    mensaje: notificacion.mensaje,
    prioridad: notificacion.prioridad,
    estado: notificacion.estado,
    vinculacionSugerida: notificacion.vinculacionSugerida ? {
      id: notificacion.vinculacionSugerida.id,
      entidadTipo: notificacion.vinculacionSugerida.entidadTipo,
      entidadPlanificacionId: notificacion.vinculacionSugerida.entidadPlanificacionId,
      entidadErpId: notificacion.vinculacionSugerida.entidadErpId,
      empresaErpId: notificacion.vinculacionSugerida.empresaErpId,
      puntajeCoincidencia: notificacion.vinculacionSugerida.puntajeCoincidencia,
      criterioCoincidencia: notificacion.vinculacionSugerida.criterioCoincidencia,
      estado: notificacion.vinculacionSugerida.estado,
      createdAt: notificacion.vinculacionSugerida.createdAt.toISOString(),
      updatedAt: notificacion.vinculacionSugerida.updatedAt.toISOString(),
    } : undefined,
    createdAt: notificacion.createdAt.toISOString(),
    updatedAt: notificacion.updatedAt.toISOString(),
  }));
}

async function aplicarVinculacionSugerida(sugerencia: Awaited<ReturnType<typeof obtenerSugerenciaDesdeNotificacion>>, usuario?: UsuarioAuditoria) {
  if (!sugerencia) {
    throw crearErrorValidacion('La sugerencia de vinculacion no existe.', 404);
  }

  const motivo = `Vinculacion aceptada desde notificacion ${sugerencia.notificacionId}.`;

  if (sugerencia.entidadTipo === 'zonas') {
    const zona = await prisma.zonaApp.findUnique({ where: { id: sugerencia.entidadPlanificacionId } });
    if (!zona) throw crearErrorValidacion('La zona provisoria ya no existe.', 404);

    await guardarZonaAppPersistida(zona.id, {
      zona: {
        id: zona.id,
        clienteId: zona.clienteId,
        empresaErpId: zona.empresaErpId,
        zonaErpId: sugerencia.entidadErpId,
        nombre: zona.nombre,
        codigoInterno: zona.codigoInterno || undefined,
        estadoVinculacion: 'vinculado_erp',
        createdAt: zona.createdAt.toISOString(),
        updatedAt: zona.updatedAt.toISOString(),
      },
      origen: 'api',
      motivo,
    }, usuario);

    return;
  }

  if (sugerencia.entidadTipo === 'campos') {
    const [campo, campoErp] = await Promise.all([
      prisma.campoApp.findUnique({ where: { id: sugerencia.entidadPlanificacionId } }),
      prisma.erpCampo.findUnique({ where: { erpId: sugerencia.entidadErpId } }),
    ]);
    if (!campo) throw crearErrorValidacion('El campo provisorio ya no existe.', 404);
    if (!campoErp) throw crearErrorValidacion('El campo ERP sugerido ya no existe en cache.', 404);

    await guardarCampoAppPersistido(campo.id, {
      campo: {
        id: campo.id,
        clienteId: campo.clienteId,
        empresaErpId: campoErp.empresaErpId,
        campoErpId: campoErp.erpId,
        nombre: campo.nombre,
        codigoInterno: campo.codigoInterno || undefined,
        zonaAppId: campo.zonaAppId || undefined,
        zonaErpId: zonaErpIdDesdeIdZona(campoErp.idZona) || campo.zonaErpId || undefined,
        estadoVinculacion: 'vinculado_erp',
        createdAt: campo.createdAt.toISOString(),
        updatedAt: campo.updatedAt.toISOString(),
      },
      origen: 'api',
      motivo,
    }, usuario);

    return;
  }

  if (sugerencia.entidadTipo === 'lotes') {
    const lote = await prisma.loteApp.findUnique({ where: { id: sugerencia.entidadPlanificacionId } });
    if (!lote) throw crearErrorValidacion('El lote provisorio ya no existe.', 404);

    await guardarLoteAppPersistido(lote.id, {
      lote: {
        id: lote.id,
        clienteId: lote.clienteId,
        campoAppId: lote.campoAppId,
        loteErpId: sugerencia.entidadErpId,
        nombre: lote.nombre,
        codigoInterno: lote.codigoInterno || undefined,
        superficieTotal: lote.superficieTotal,
        superficieProductiva: lote.superficieProductiva,
        estadoVinculacion: 'vinculado_erp',
        createdAt: lote.createdAt.toISOString(),
        updatedAt: lote.updatedAt.toISOString(),
      },
      origen: 'api',
      motivo,
    }, usuario);

    return;
  }

  if (sugerencia.entidadTipo === 'especies') {
    const especie = await prisma.especieApp.findUnique({ where: { id: sugerencia.entidadPlanificacionId } });
    if (!especie) throw crearErrorValidacion('La especie provisoria ya no existe.', 404);

    await guardarEspecieAppPersistida(especie.id, {
      especie: {
        id: especie.id,
        clienteId: especie.clienteId,
        empresaErpId: especie.empresaErpId,
        especieErpId: sugerencia.entidadErpId,
        nombre: especie.nombre,
        codigoInterno: especie.codigoInterno || undefined,
        estadoVinculacion: 'vinculado_erp',
        createdAt: especie.createdAt.toISOString(),
        updatedAt: especie.updatedAt.toISOString(),
      },
      origen: 'api',
      motivo,
    }, usuario);

    return;
  }

  if (sugerencia.entidadTipo === 'actividades') {
    const [actividad, actividadErp] = await Promise.all([
      prisma.actividadApp.findUnique({ where: { id: sugerencia.entidadPlanificacionId } }),
      prisma.erpActividad.findUnique({ where: { erpId: sugerencia.entidadErpId } }),
    ]);
    if (!actividad) throw crearErrorValidacion('La actividad provisoria ya no existe.', 404);
    if (!actividadErp) throw crearErrorValidacion('La actividad ERP sugerida ya no existe en cache.', 404);

    await guardarActividadAppPersistida(actividad.id, {
      actividad: {
        id: actividad.id,
        clienteId: actividad.clienteId,
        empresaErpId: actividad.empresaErpId,
        actividadErpId: actividadErp.erpId,
        especieAppId: actividad.especieAppId || undefined,
        especieErpId: especieErpIdDesdeIdEspecie(actividadErp.idEspecie) || actividad.especieErpId || undefined,
        nombre: actividad.nombre,
        codigoInterno: actividad.codigoInterno || undefined,
        estadoVinculacion: 'vinculado_erp',
        createdAt: actividad.createdAt.toISOString(),
        updatedAt: actividad.updatedAt.toISOString(),
      },
      origen: 'api',
      motivo,
    }, usuario);

    return;
  }

  if (sugerencia.entidadTipo === 'insumos') {
    const [insumo, insumoErp] = await Promise.all([
      prisma.insumoApp.findUnique({ where: { id: sugerencia.entidadPlanificacionId } }),
      prisma.erpInsumo.findUnique({ where: { erpId: sugerencia.entidadErpId } }),
    ]);
    if (!insumo) throw crearErrorValidacion('El insumo provisorio ya no existe.', 404);
    if (!insumoErp) throw crearErrorValidacion('El insumo ERP sugerido ya no existe en cache.', 404);

    await guardarInsumoAppPersistido(insumo.id, {
      insumo: {
        id: insumo.id,
        clienteId: insumo.clienteId,
        empresaErpId: insumoErp.empresaErpId,
        insumoErpId: insumoErp.erpId,
        nombre: insumo.nombre,
        codigoInterno: insumo.codigoInterno || undefined,
        tipo: insumo.tipo || undefined,
        unidad: insumo.unidad,
        precioUnitarioEstimado: insumo.precioUnitarioEstimado ?? undefined,
        moneda: insumo.moneda || undefined,
        estadoVinculacion: 'vinculado_erp',
        createdAt: insumo.createdAt.toISOString(),
        updatedAt: insumo.updatedAt.toISOString(),
      },
      origen: 'api',
      motivo,
    }, usuario);

    return;
  }

  if (sugerencia.entidadTipo === 'labores') {
    const [labor, servicioErp] = await Promise.all([
      prisma.servicioApp.findUnique({ where: { id: sugerencia.entidadPlanificacionId } }),
      prisma.erpServicio.findUnique({ where: { erpId: sugerencia.entidadErpId } }),
    ]);
    if (!labor) throw crearErrorValidacion('La labor provisoria ya no existe.', 404);
    if (!servicioErp) throw crearErrorValidacion('El servicio ERP sugerido ya no existe en cache.', 404);

    await guardarServicioAppPersistido(labor.id, {
      servicio: {
        id: labor.id,
        clienteId: labor.clienteId,
        empresaErpId: servicioErp.empresaErpId,
        servicioErpId: servicioErp.erpId,
        idServicio: servicioErp.idServicio,
        idTipoServicio: servicioErp.idTipoServicio ?? undefined,
        codigo: labor.codigo,
        nombre: labor.nombre,
        descripcionAbreviada: labor.descripcionAbreviada || undefined,
        idUnidadMedida: servicioErp.idUnidadMedida ?? labor.idUnidadMedida ?? undefined,
        idMoneda: servicioErp.idMoneda ?? labor.idMoneda ?? undefined,
        unidadSugerida: labor.unidadSugerida,
        costoUnitarioSugerido: labor.costoUnitarioSugerido ?? undefined,
        imputaDosis: servicioErp.imputaDosis ?? labor.imputaDosis ?? undefined,
        estadoVinculacion: 'vinculado_erp',
        activo: labor.activo,
        origen: 'erp',
        fechaUltimaActualizacionErp: servicioErp.actualizadoEn.toISOString(),
        createdAt: labor.createdAt.toISOString(),
        updatedAt: labor.updatedAt.toISOString(),
      },
      origen: 'api',
      motivo,
    }, usuario);

    return;
  }

  throw crearErrorValidacion('El tipo de sugerencia no es soportado.');
}

async function obtenerSugerenciaDesdeNotificacion(clienteId: string, notificacionId: string) {
  const notificacion = await prisma.notificacionUsuario.findFirst({
    where: {
      id: notificacionId,
      clienteId,
      tipo: 'vinculacion_erp_sugerida',
      estado: 'pendiente',
    },
    include: {
      vinculacionSugerida: true,
    },
  });

  if (!notificacion?.vinculacionSugerida) {
    return null;
  }

  return {
    ...notificacion.vinculacionSugerida,
    notificacionId: notificacion.id,
  };
}

export async function resolverNotificacionVinculacionErp(
  clienteId: string,
  notificacionId: string,
  decision: 'aceptar' | 'descartar',
  usuario?: UsuarioAuditoria,
  motivo?: string,
): Promise<ResolverNotificacionVinculacionResponse> {
  const sugerencia = await obtenerSugerenciaDesdeNotificacion(clienteId, notificacionId);

  if (!sugerencia) {
    throw crearErrorValidacion('La notificacion de vinculacion no existe o ya fue resuelta.', 404);
  }

  if (decision === 'aceptar') {
    await aplicarVinculacionSugerida(sugerencia, usuario);
  }

  const estadoSugerencia = decision === 'aceptar' ? 'aceptada' : 'descartada';

  await prisma.$transaction(async (tx) => {
    await tx.vinculacionErpSugerida.update({
      where: { id: sugerencia.id },
      data: {
        estado: estadoSugerencia,
        revisadaPor: usuario?.id,
        revisadaAt: new Date(),
        motivoResolucion: motivo || (decision === 'aceptar' ? 'Aceptada desde notificacion.' : 'Descartada desde notificacion.'),
      },
    });

    await tx.notificacionUsuario.update({
      where: { id: notificacionId },
      data: {
        estado: 'resuelta',
        resueltaAt: new Date(),
        leidaAt: new Date(),
      },
    });

    await registrarAuditoria(tx, {
      clienteId,
      usuario,
      entidad: 'VinculacionErpSugerida',
      entidadId: sugerencia.id,
      accion: decision === 'aceptar' ? 'aceptar' : 'descartar',
      origen: 'web',
      motivo,
      valoresAntes: {
        estado: sugerencia.estado,
        entidadTipo: sugerencia.entidadTipo,
        entidadPlanificacionId: sugerencia.entidadPlanificacionId,
        entidadErpId: sugerencia.entidadErpId,
      },
      valoresDespues: {
        estado: estadoSugerencia,
        notificacionId,
      },
    });
  });

  return {
    notificacionId,
    sugerenciaId: sugerencia.id,
    estadoNotificacion: 'resuelta',
    estadoSugerencia,
    auditado: true,
    mensaje: decision === 'aceptar'
      ? 'Sugerencia aceptada, vinculacion aplicada y notificacion resuelta.'
      : 'Sugerencia descartada y notificacion resuelta.',
  };
}
