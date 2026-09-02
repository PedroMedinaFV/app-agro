import { randomUUID } from 'node:crypto';
import type { AsignarEmpresasErpClienteInput, EmpresaErpCliente } from '@agro/tipos';
import { prisma } from '../../prisma';

type EmpresaErpClienteRow = {
  id: string;
  clienteId: string;
  empresaErpId: string;
  asignadoPor: string | null;
  createdAt: Date;
};

function mapearRow(row: EmpresaErpClienteRow): EmpresaErpCliente {
  return {
    id: row.id,
    clienteId: row.clienteId,
    empresaErpId: row.empresaErpId,
    asignadoPor: row.asignadoPor || undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

async function asegurarClienteDemo(clienteId: string) {
  if (clienteId !== 'cliente-demo') {
    return;
  }

  await prisma.cliente.upsert({
    where: { id: clienteId },
    update: { nombre: 'Cliente Demo', activo: true },
    create: { id: clienteId, nombre: 'Cliente Demo', activo: true },
  });
}

export async function listarEmpresasErpCliente(clienteId: string) {
  const rows = await prisma.$queryRaw<EmpresaErpClienteRow[]>`
    SELECT * FROM "ClienteEmpresaErp"
    WHERE "clienteId" = ${clienteId}
    ORDER BY "createdAt" ASC
  `;

  return rows.map(mapearRow);
}

export async function reemplazarEmpresasErpCliente(input: AsignarEmpresasErpClienteInput, asignadoPor?: string) {
  await asegurarClienteDemo(input.clienteId);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "ClienteEmpresaErp"
      WHERE "clienteId" = ${input.clienteId}
    `;

    for (const empresaErpId of input.empresasErpIds) {
      await tx.$executeRaw`
        INSERT INTO "ClienteEmpresaErp" ("id", "clienteId", "empresaErpId", "asignadoPor")
        VALUES (${randomUUID()}, ${input.clienteId}, ${empresaErpId}, ${asignadoPor || null})
      `;
    }
  });

  return listarEmpresasErpCliente(input.clienteId);
}
