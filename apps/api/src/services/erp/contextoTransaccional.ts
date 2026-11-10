import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma, PrismaClient } from '@prisma/client';

const contexto = new AsyncLocalStorage<Prisma.TransactionClient>();

export function conTransaccionCompartida<T>(tx: Prisma.TransactionClient, tarea: () => Promise<T>) {
  return contexto.run(tx, tarea);
}

// Alias conservado para los coordinadores ERP existentes.
export const conTransaccionErp = conTransaccionCompartida;

// Dentro de una transaccion compartida, los servicios llamados indirectamente deben usar
// la transaccion protegida. Una transaccion cerrada nunca vuelve al cliente global.
export function clienteConContextoErp(base: PrismaClient): PrismaClient {
  return new Proxy(base, {
    get(target, propiedad) {
      const tx = contexto.getStore();
      if (tx && propiedad === '$transaction') {
        return async (operaciones: unknown) => {
          if (!Array.isArray(operaciones)) return (operaciones as (cliente: Prisma.TransactionClient) => Promise<unknown>)(tx);
          const resultados = [];
          for (const operacion of operaciones) resultados.push(await operacion);
          return resultados;
        };
      }
      const cliente = tx || target;
      const valor = Reflect.get(cliente, propiedad, cliente);
      return typeof valor === 'function' ? valor.bind(cliente) : valor;
    },
  });
}
