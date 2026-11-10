import { esCopiaAutomaticaErp, padronesErp, type TipoPadronErp } from '@agro/tipos';
import { Prisma } from '@prisma/client';
import { crearErrorValidacion } from './validacionesPadronesApp';
import { registrarAuditoria, type UsuarioAuditoria } from './auditoria';

type Registro = { id: string; clienteId: string; createdBy: string | null; updatedBy: string | null; [campo: string]: unknown };

export async function bloquearPadronesCliente(tx: Prisma.TransactionClient, clienteId: string) {
  await tx.$queryRaw`SELECT 1 AS bloqueado FROM pg_advisory_xact_lock(hashtextextended(${`padrones:${clienteId}`}, 0))`;
}

/** Se ejecuta en la misma transaccion del guardado. Nunca absorbe un registro editado. */
export async function consolidarCopiaErp(
  tx: Prisma.TransactionClient, tipo: TipoPadronErp,
  destino: { id: string; clienteId: string; [campo: string]: unknown }, usuario?: UsuarioAuditoria,
) {
  try {
    await consolidarDentroDeTransaccion(tx, tipo, destino, usuario);
  } catch (error) {
    const fallo = error as { code?: string; meta?: { code?: string } };
    if (fallo?.code === 'P2002' || (fallo?.code === 'P2010' && ['23505', '23503'].includes(fallo.meta?.code || ''))) {
      throw crearErrorValidacion('Las referencias existentes requieren revision antes de consolidar. No se aplicaron cambios.', 409);
    }
    throw error;
  }
}

async function consolidarDentroDeTransaccion(
  tx: Prisma.TransactionClient, tipo: TipoPadronErp,
  destino: { id: string; clienteId: string; [campo: string]: unknown }, usuario?: UsuarioAuditoria,
) {
  const { modelo, campoErp } = padronesErp[tipo];
  const erpId = destino[campoErp];
  if (!erpId) return;
  await bloquearPadronesCliente(tx, destino.clienteId);
  const tabla = Prisma.raw(`"${modelo}"`);
  const columna = Prisma.raw(`"${campoErp}"`);
  const existentes = await tx.$queryRaw<Registro[]>(Prisma.sql`
    SELECT * FROM ${tabla} WHERE "clienteId" = ${destino.clienteId} AND ${columna} = ${erpId} AND "id" <> ${destino.id} FOR UPDATE`);
  if (!existentes.length) return;
  if (existentes.length !== 1 || !esCopiaAutomaticaErp(tipo, existentes[0])) {
    throw crearErrorValidacion('El registro ERP ya tiene una vinculacion confirmada o una copia editada. Actualiza el padron y revisa el conflicto.', 409);
  }
  const [origen] = existentes;
  const destinoActual = await tx.$queryRaw<Registro[]>(Prisma.sql`SELECT * FROM ${tabla} WHERE "id" = ${destino.id} FOR UPDATE`);
  if (destinoActual[0]?.clienteId !== destino.clienteId || destinoActual[0]?.[campoErp] || destinoActual[0]?.estadoVinculacion !== 'provisorio') {
    throw crearErrorValidacion('La consolidacion requiere un registro provisorio existente del mismo cliente.', 409);
  }

  // Relaciones declaradas en Prisma; los IDs escalares sin FK se enumeran aparte.
  const referencias = Prisma.dmmf.datamodel.models.flatMap((model) => model.fields
    .filter((field) => field.kind === 'object' && field.type === modelo && field.relationFromFields?.length)
    .flatMap((field) => field.relationFromFields!.map((columna) => ({ tabla: model.name, columna }))));
  const escalares: Partial<Record<TipoPadronErp, { tabla: string; columna: string }[]>> = {
    zonas: [{ tabla: 'GastoComercialApp', columna: 'zonaAppId' }],
    campos: [{ tabla: 'GastoComercialApp', columna: 'campoAppId' }, { tabla: 'DestinoApp', columna: 'campoAppId' }],
  };
  for (const ref of [...referencias, ...(escalares[tipo] || [])]) {
    const modeloRef = Prisma.dmmf.datamodel.models.find((item) => item.name === ref.tabla);
    if (modeloRef?.fields.some((field) => field.name === 'clienteId')) {
      const ajenas = await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT count(*) AS total FROM ${Prisma.raw(`"${ref.tabla}"`)}
        WHERE ${Prisma.raw(`"${ref.columna}"`)} = ${origen.id} AND "clienteId" <> ${destino.clienteId}`);
      if (ajenas[0].total > 0n) throw crearErrorValidacion('Existen referencias inconsistentes entre clientes; se cancelo la consolidacion.', 409);
    }
    await tx.$executeRaw(Prisma.sql`UPDATE ${Prisma.raw(`"${ref.tabla}"`)} SET ${Prisma.raw(`"${ref.columna}"`)} = ${destino.id}
      WHERE ${Prisma.raw(`"${ref.columna}"`)} = ${origen.id}`);
  }
  await tx.$executeRaw(Prisma.sql`DELETE FROM ${tabla} WHERE "id" = ${origen.id} AND "clienteId" = ${destino.clienteId}`);
  await tx.aliasPadronApp.updateMany({ where: { clienteId: destino.clienteId, tipo, actualId: origen.id }, data: { actualId: destino.id } });
  await tx.aliasPadronApp.create({ data: { clienteId: destino.clienteId, tipo, anteriorId: origen.id, actualId: destino.id } });
  await registrarAuditoria(tx, {
    clienteId: destino.clienteId, usuario, entidad: modelo, entidadId: destino.id, accion: 'consolidar_copia_erp', origen: 'api',
    motivo: 'Vinculacion explicita: conservar registro App y trasladar referencias de copia ERP automatica sin ediciones.',
    valoresAntes: JSON.parse(JSON.stringify(origen)), valoresDespues: { id: destino.id, erpId, copiaAbsorbidaId: origen.id },
  });
}
