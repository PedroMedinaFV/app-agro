import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { PadronErpSincronizable } from '@agro/tipos';
import { prisma } from '../../prisma';
import { obtenerDuracionBloqueoErp } from '../../config/bloqueoErp';
import { conTransaccionErp } from './contextoTransaccional';
import { iniciarSincronizacionErpHistorial } from './historialSincronizacionErp';

export type ReservaErp = {
  clienteId: string; token: string; id: string; itemsEjecutados: PadronErpSincronizable[]; ttl: number;
};

function errorPropiedad() {
  return Object.assign(new Error('La sincronizacion perdio su bloqueo o vencio. Reintenta la operacion.'), { statusCode: 409 });
}

async function intentarPuerta(tx: Prisma.TransactionClient, clienteId: string) {
  const filas = await tx.$queryRaw<Array<{ obtenida: boolean }>>`
    SELECT pg_try_advisory_xact_lock(hashtextextended(current_schema() || ':' || ${'agro-erp:' + clienteId}, 0)) AS "obtenida"
  `;
  return filas[0].obtenida;
}

export function crearBloqueoSincronizacionErp(db: PrismaClient = prisma) {
  return {
    async adquirir(clienteId: string, usuarioId: string | undefined, items?: PadronErpSincronizable[]): Promise<ReservaErp | null> {
      const ttl = obtenerDuracionBloqueoErp();
      return db.$transaction(async (tx) => {
        if (!await intentarPuerta(tx, clienteId)) return null;
        const filas = await tx.$queryRaw<Array<{ token: string; sincronizacionId: string; vigente: boolean }>>`
          SELECT "token", "sincronizacionId", "venceEn" > clock_timestamp() AS "vigente"
          FROM "ErpSincronizacionBloqueo" WHERE "clienteId" = ${clienteId} FOR UPDATE
        `;
        if (filas[0]?.vigente) return null;
        if (filas[0]) {
          await tx.$executeRaw`
            UPDATE "ErpSincronizacion" SET "estado" = 'error', "error" = 'Ejecucion interrumpida: bloqueo vencido recuperado.',
              "finalizadoEn" = clock_timestamp(), "updatedAt" = clock_timestamp()
            WHERE "id" = ${filas[0].sincronizacionId} AND "clienteId" = ${clienteId} AND "estado" = 'en_proceso'
          `;
        }
        const historial = await conTransaccionErp(tx, () => iniciarSincronizacionErpHistorial(clienteId, usuarioId, items));
        const token = randomUUID();
        await tx.$executeRaw`
          INSERT INTO "ErpSincronizacionBloqueo" ("clienteId", "token", "sincronizacionId", "adquiridoEn", "venceEn")
          VALUES (${clienteId}, ${token}, ${historial.id}, clock_timestamp(), clock_timestamp() + ${ttl} * interval '1 millisecond')
          ON CONFLICT ("clienteId") DO UPDATE SET "token" = EXCLUDED."token", "sincronizacionId" = EXCLUDED."sincronizacionId",
            "adquiridoEn" = EXCLUDED."adquiridoEn", "venceEn" = EXCLUDED."venceEn"
        `;
        return { clienteId, token, ...historial, ttl };
      });
    },
    async ejecutar<T>(reserva: ReservaErp, tarea: () => Promise<T>): Promise<T> {
      return db.$transaction(async (tx) => {
        if (!await intentarPuerta(tx, reserva.clienteId)) throw errorPropiedad();
        // La cache Erp* contiene maestros globales compartidos por clientes.
        // No permitir dos refrescos destructivos concurrentes sobre esos maestros.
        const global = await tx.$queryRaw<Array<{ obtenida: boolean }>>`
          SELECT pg_try_advisory_xact_lock(hashtextextended(current_schema() || ':agro-erp-cache-global', 0)) AS "obtenida"
        `;
        if (!global[0].obtenida) throw Object.assign(new Error('Otra sincronizacion esta actualizando padrones ERP compartidos. Reintenta al finalizar.'), { statusCode: 409 });
        const filas = await tx.$queryRaw<Array<{ vigente: boolean }>>`
          SELECT "venceEn" > clock_timestamp() AS "vigente" FROM "ErpSincronizacionBloqueo"
          WHERE "clienteId" = ${reserva.clienteId} AND "token" = ${reserva.token}
            AND "sincronizacionId" = ${reserva.id} FOR UPDATE
        `;
        if (!filas[0]?.vigente) throw errorPropiedad();
        const resultado = await conTransaccionErp(tx, tarea);
        const fin = await tx.$queryRaw<Array<{ vigente: boolean }>>`
          SELECT "venceEn" > clock_timestamp() AS "vigente" FROM "ErpSincronizacionBloqueo"
          WHERE "clienteId" = ${reserva.clienteId} AND "token" = ${reserva.token}
        `;
        if (!fin[0]?.vigente) throw errorPropiedad();
        return resultado;
      }, { timeout: reserva.ttl - 1000, maxWait: 5000 });
    },
    async liberar(reserva: ReservaErp) {
      await db.$executeRaw`
        DELETE FROM "ErpSincronizacionBloqueo" WHERE "clienteId" = ${reserva.clienteId}
          AND "token" = ${reserva.token} AND "sincronizacionId" = ${reserva.id}
      `;
    },
  };
}

export const bloqueoSincronizacionErp = crearBloqueoSincronizacionErp();
