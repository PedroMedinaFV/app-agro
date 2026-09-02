import { Router } from 'express';
import type { Request } from 'express';
import type { ErpSnapshot } from '@agro/tipos';
import { obtenerSnapshotErp } from '../services/erp/clienteErp';
import { obtenerConfiguracionErp } from '../services/erp/configuracionErp';
import { sincronizarSnapshotErp } from '../services/erp/sincronizarErp';
import { requierePermiso } from '../middleware/permisos';
import { obtenerCamposAsignados } from '../services/usuarios/asignacionCampos';

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
    const snapshot = await obtenerSnapshotErp(req.query.clienteId as string | undefined);
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

router.post('/sincronizar', requierePermiso('erp:sincronizar'), async (req, res, next) => {
  try {
    res.json({
      ok: true,
      resultado: await sincronizarSnapshotErp(req.query.clienteId as string | undefined),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
