import { esCopiaAutomaticaErp, padronesErp, type TipoPadronErp } from '@agro/tipos';
import { Prisma } from '@prisma/client';

type Sugerencia = { entidadTipo: string; entidadPlanificacionId: string; entidadErpId: string };
type Fila = { id: string; clienteId: string; createdBy: string | null; updatedBy: string | null; [campo: string]: unknown };

export async function sugerenciaSigueVigente(tx: Prisma.TransactionClient, clienteId: string, sugerencia: Sugerencia) {
  if (!Object.prototype.hasOwnProperty.call(padronesErp, sugerencia.entidadTipo)) return false;
  const tipo = sugerencia.entidadTipo as TipoPadronErp;
  const { modelo, campoErp } = padronesErp[tipo];
  const tabla = Prisma.raw(`"${modelo}"`);
  const origenes = await tx.$queryRaw<Fila[]>(Prisma.sql`SELECT * FROM ${tabla} WHERE "id" = ${sugerencia.entidadPlanificacionId} AND "clienteId" = ${clienteId}`);
  const [origen] = origenes;
  if (!origen || origen.estadoVinculacion !== 'provisorio' || origen[campoErp]) return false;
  const erpModelo = `Erp${modelo.replace('App', '')}`;
  const candidatos = await tx.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT * FROM ${Prisma.raw(`"${erpModelo}"`)} WHERE "erpId" = ${sugerencia.entidadErpId}`);
  const [candidato] = candidatos;
  if (!candidato || !candidato.activo) return false;
  if (tipo === 'campos') {
    if (origen.empresaErpId !== candidato.empresaErpId) return false;
    const zona = typeof origen.zonaAppId === 'string' ? await tx.zonaApp.findUnique({ where: { id: origen.zonaAppId } }) : null;
    const zonaErpId = origen.zonaErpId || zona?.zonaErpId;
    if (zonaErpId && zonaErpId !== `zona:${candidato.idZona}`) return false;
  }
  if (tipo === 'lotes') {
    const campo = await tx.campoApp.findUnique({ where: { id: String(origen.campoAppId) } });
    if (!campo || campo.clienteId !== clienteId || campo.empresaErpId !== candidato.empresaErpId) return false;
    if (campo.campoErpId && campo.campoErpId !== candidato.campoErpId) return false;
  }
  if (tipo === 'actividades') {
    const especie = typeof origen.especieAppId === 'string' ? await tx.especieApp.findUnique({ where: { id: origen.especieAppId } }) : null;
    const especieErpId = origen.especieErpId || especie?.especieErpId;
    if (especieErpId && especieErpId !== `especie:${candidato.idEspecie}`) return false;
  }
  const ocupantes = await tx.$queryRaw<Fila[]>(Prisma.sql`SELECT * FROM ${tabla} WHERE "clienteId" = ${clienteId} AND ${Prisma.raw(`"${campoErp}"`)} = ${sugerencia.entidadErpId}`);
  return ocupantes.every((item) => esCopiaAutomaticaErp(tipo, item));
}

export async function cerrarSugerenciasObsoletas(tx: Prisma.TransactionClient, clienteId: string) {
  const pendientes = await tx.vinculacionErpSugerida.findMany({ where: { clienteId, estado: 'pendiente' } });
  for (const sugerencia of pendientes) {
    if (await sugerenciaSigueVigente(tx, clienteId, sugerencia)) continue;
    await tx.vinculacionErpSugerida.update({ where: { id: sugerencia.id }, data: {
      estado: 'descartada', revisadaAt: new Date(), motivoResolucion: 'Obsoleta: origen, candidato o disponibilidad cambiaron.',
    } });
    await tx.notificacionUsuario.updateMany({ where: { clienteId, vinculacionSugeridaId: sugerencia.id, estado: 'pendiente' }, data: { estado: 'resuelta', resueltaAt: new Date() } });
  }
}
