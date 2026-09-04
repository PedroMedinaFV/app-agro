import { Router } from 'express';
import type { Request } from 'express';
import type { ErpSnapshot } from '@agro/tipos';
import { obtenerSnapshotErp } from '../services/erp/clienteErp';
import { obtenerConfiguracionErp } from '../services/erp/configuracionErp';
import { sincronizarSnapshotErp } from '../services/erp/sincronizarErp';
import { requierePermiso } from '../middleware/permisos';
import { obtenerCamposAsignados } from '../services/usuarios/asignacionCampos';
import { listarEmpresasErpCliente } from '../services/erp/empresasCliente';
import { prisma } from '../prisma';

const router = Router();
type RequestConUsuario = Request & { user?: { sub: string; rol?: string; clienteId?: string } };

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
    zonas: snapshot.zonas.filter((zona) => empresasPermitidas.has(zona.empresaErpId)),
    campos: camposPermitidos,
    lotes: lotesPermitidos,
    actividades: snapshot.actividades.filter((actividad) => empresasPermitidas.has(actividad.empresaErpId)),
    especies: snapshot.especies.filter((especie) => empresasPermitidas.has(especie.empresaErpId)),
    empresas: snapshot.empresas.filter((empresa) => empresasPermitidas.has(empresa.erpId)),
    campanias: snapshot.campanias.filter((campania) => empresasPermitidas.has(campania.empresaErpId)),
    cultivos: snapshot.cultivos.filter((cultivo) => lotesPermitidosIds.has(cultivo.loteErpId)),
    insumos: snapshot.insumos.filter((insumo) => empresasPermitidas.has(insumo.empresaErpId)),
    servicios: snapshot.servicios.filter((servicio) => empresasPermitidas.has(servicio.empresaErpId)),
    unidadesMedida: snapshot.unidadesMedida.filter((unidad) => empresasPermitidas.has(unidad.empresaErpId)),
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
    const zonas = await prisma.erpZona.findMany({
      where: {
        empresaErpId: { in: empresaErpIds },
      },
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

    res.json({
      ok: true,
      resultado: await sincronizarSnapshotErp(clienteId),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
