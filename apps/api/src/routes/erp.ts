import { Router } from 'express';
import type { Request } from 'express';
import type { ErpSnapshot, SincronizarErpRequest } from '@agro/tipos';
import { obtenerSnapshotErp } from '../services/erp/clienteErp';
import { obtenerConfiguracionErp } from '../services/erp/configuracionErp';
import { sincronizarSnapshotErp } from '../services/erp/sincronizarErp';
import { requierePermiso } from '../middleware/permisos';
import { obtenerCamposAsignados } from '../services/usuarios/asignacionCampos';
import { listarEmpresasErpCliente } from '../services/erp/empresasCliente';
import { prisma } from '../prisma';

const router = Router();
type RequestConUsuario = Request & { user?: { sub: string; rol?: string; clienteId?: string } };
const clientesSincronizando = new Set<string>();

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
    servicios: snapshot.servicios,
    unidadesMedida: snapshot.unidadesMedida,
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
    const lotes = await prisma.erpLote.findMany({
      where: {
        empresaErpId: { in: empresaErpIds },
        ...(camposAsignados ? { campoErpId: { in: camposAsignados } } : {}),
      },
      orderBy: [{ nombre: 'asc' }],
    });

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
    });
  } catch (error) {
    next(error);
  }
});

router.post('/sincronizar', requierePermiso('erp:sincronizar'), async (req, res, next) => {
  try {
    const user = (req as RequestConUsuario).user;
    const clienteId = user?.clienteId;

    if (!clienteId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente asociado.' });
    }

    if (clientesSincronizando.has(clienteId)) {
      return res.status(409).json({ error: 'Ya hay una sincronizacion en curso para este cliente.' });
    }

    clientesSincronizando.add(clienteId);

    try {
      const body = req.body as SincronizarErpRequest;
      const resultado = await sincronizarSnapshotErp(clienteId, {
        id: user.sub,
        clienteId,
      }, body.items);

      return res.json({
        ok: true,
        resultado,
      });
    } finally {
      clientesSincronizando.delete(clienteId);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
