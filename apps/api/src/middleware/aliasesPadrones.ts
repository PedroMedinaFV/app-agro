import type { Request, Response, NextFunction } from 'express';
import type { UsuarioToken } from '../services/seguridad/sesionJwt';
import { prisma } from '../prisma';

const campos: Record<string, string> = {
  zonaAppId: 'zonas', campoAppId: 'campos', loteAppId: 'lotes', especieAppId: 'especies',
  actividadAppId: 'actividades', insumoAppId: 'insumos', servicioAppId: 'labores',
};
const objetos: Record<string, string> = { zona: 'zonas', campo: 'campos', lote: 'lotes', especie: 'especies', actividad: 'actividades', insumo: 'insumos', servicio: 'labores' };
const rutas: Record<string, string> = { 'zonas-app': 'zonas', 'campos-app': 'campos', 'lotes-app': 'lotes', 'especies-app': 'especies', 'actividades-app': 'actividades', 'insumos-app': 'insumos', 'servicios-app': 'labores', lotes: 'lotes' };

/** Normaliza IDs operativos antiguos sin modificar snapshots historicos ni IDs moviles. */
export async function resolverAliasesPadrones(req: Request, _res: Response, next: NextFunction) {
  try {
    const clienteId = (req as Request & { user?: UsuarioToken }).user?.clienteId;
    if (!clienteId) return next();
    const referencias: { tipo: string; id: string; reemplazar: (id: string) => void }[] = [];
    function recorrer(valor: unknown, objeto?: string) {
      if (!valor || typeof valor !== 'object') return;
      if (Array.isArray(valor)) { for (const item of valor) recorrer(item); return; }
      const registro = valor as Record<string, unknown>;
      for (const [clave, dato] of Object.entries(registro)) {
        // Los snapshots son evidencia del momento original, no referencias editables.
        if (clave.toLowerCase().includes('snapshot')) continue;
        const tipo = Object.prototype.hasOwnProperty.call(campos, clave) ? campos[clave]
          : clave === 'id' && objeto && Object.prototype.hasOwnProperty.call(objetos, objeto) ? objetos[objeto] : undefined;
        if (tipo && typeof dato === 'string') referencias.push({ tipo, id: dato, reemplazar: (id) => { registro[clave] = id; } });
        else recorrer(dato, clave);
      }
    }
    recorrer(req.body);
    recorrer(req.query);
    const segmentos = `${req.baseUrl}${req.path}`.split('/');
    for (let i = 1; i < segmentos.length - 1; i++) {
      const tipo = Object.prototype.hasOwnProperty.call(rutas, segmentos[i]) ? rutas[segmentos[i]] : undefined;
      const id = decodeURIComponent(segmentos[i + 1]);
      if (tipo && id) referencias.push({ tipo, id, reemplazar: (nuevo) => {
        const [ruta, consulta] = req.url.split('?');
        req.url = ruta.split('/').map((segmento) => decodeURIComponent(segmento) === id ? encodeURIComponent(nuevo) : segmento).join('/') + (consulta ? `?${consulta}` : '');
      } });
    }
    if (!referencias.length) return next();
    const pares = new Map(referencias.map(({ tipo, id }) => [JSON.stringify([tipo, id]), { tipo, anteriorId: id }]));
    const aliases = await prisma.aliasPadronApp.findMany({ where: { clienteId, OR: [...pares.values()] } });
    for (const ref of referencias) {
      const alias = aliases.find((item) => item.tipo === ref.tipo && item.anteriorId === ref.id);
      if (alias) ref.reemplazar(alias.actualId);
    }
    next();
  } catch (error) { next(error); }
}
