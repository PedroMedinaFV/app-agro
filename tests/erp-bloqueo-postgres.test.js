const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

test('bloqueo ERP PostgreSQL: dos clientes, recuperacion, fencing y rollback en schema aislado', {
  skip: !process.env.ERP_LOCK_TEST_DATABASE_URL,
  timeout: 60000,
}, async () => {
  const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');
  const { crearBloqueoSincronizacionErp } = require('../apps/api/dist/services/erp/bloqueoSincronizacionErp');
  const { prisma } = require('../apps/api/dist/prisma');
  const schema = `agro_erp_lock_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new PrismaClient({ datasourceUrl: process.env.ERP_LOCK_TEST_DATABASE_URL });
  const url = new URL(process.env.ERP_LOCK_TEST_DATABASE_URL);
  url.searchParams.set('schema', schema);
  url.searchParams.set('connection_limit', '4');
  const db1 = new PrismaClient({ datasourceUrl: url.toString() });
  const db2 = new PrismaClient({ datasourceUrl: url.toString() });
  let creado = false;
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    creado = true;
    await db1.$executeRawUnsafe(`CREATE TABLE "ErpSincronizacion" (
      "id" TEXT PRIMARY KEY, "clienteId" TEXT NOT NULL, "usuarioId" TEXT, "estado" TEXT NOT NULL,
      "itemsSolicitados" JSONB, "itemsEjecutados" JSONB, "iniciadoEn" TIMESTAMP DEFAULT now(),
      "updatedAt" TIMESTAMP DEFAULT now(), "finalizadoEn" TIMESTAMP, "error" TEXT
    )`);
    const migracion = fs.readFileSync(path.join(__dirname, '../apps/api/prisma/migrations/20261106120000_bloqueo_sincronizacion_erp/migration.sql'), 'utf8');
    for (const sql of migracion.split(';').map((s) => s.trim()).filter(Boolean)) await db1.$executeRawUnsafe(sql);
    await db1.$executeRawUnsafe('CREATE TABLE "PruebaBloqueo" ("id" TEXT PRIMARY KEY)');
    const uno = crearBloqueoSincronizacionErp(db1);
    const dos = crearBloqueoSincronizacionErp(db2);
    const reservas = await Promise.all([uno.adquirir('cliente', 'a', ['campos']), dos.adquirir('cliente', 'b', ['campos'])]);
    assert.equal(reservas.filter(Boolean).length, 1);
    const anterior = reservas.find(Boolean);
    await db1.$executeRaw`UPDATE "ErpSincronizacionBloqueo" SET "venceEn" = clock_timestamp() - interval '1 second' WHERE "clienteId" = 'cliente'`;
    const nueva = await dos.adquirir('cliente', 'c', ['campos']);
    assert.ok(nueva);
    await assert.rejects(uno.ejecutar(anterior, async () => { throw new Error('NO ejecutar'); }), /perdio su bloqueo/);
    await uno.liberar(anterior);
    assert.equal(await uno.adquirir('cliente', 'a', ['campos']), null);
    const historial = await db1.$queryRaw`SELECT "estado", "error" FROM "ErpSincronizacion" WHERE "id" = ${anterior.id}`;
    assert.equal(historial[0].estado, 'error');
    assert.match(historial[0].error, /interrumpida/);
    await assert.rejects(dos.ejecutar(nueva, async () => {
      await prisma.$executeRaw`INSERT INTO "PruebaBloqueo" ("id") VALUES ('rollback')`;
      throw new Error('fallo simulado');
    }), /fallo simulado/);
    assert.equal((await db1.$queryRaw`SELECT * FROM "PruebaBloqueo"`).length, 0);
    await assert.rejects(dos.ejecutar({ ...nueva, ttl: 1100 }, async () => {
      await prisma.$executeRaw`INSERT INTO "PruebaBloqueo" ("id") VALUES ('antes-timeout')`;
      await new Promise((resolve) => setTimeout(resolve, 200));
      await prisma.$executeRaw`INSERT INTO "PruebaBloqueo" ("id") VALUES ('despues-timeout')`;
    }), /expired|closed|timeout|Transaction/i);
    assert.equal((await db1.$queryRaw`SELECT * FROM "PruebaBloqueo"`).length, 0);
    let continuar;
    let notificar;
    const iniciada = new Promise((resolve) => { notificar = resolve; });
    const pausa = new Promise((resolve) => { continuar = resolve; });
    const trabajo = dos.ejecutar(nueva, async () => { notificar(); await pausa; });
    await iniciada;
    try {
      assert.equal(await uno.adquirir('cliente', 'a', ['campos']), null);
      const otro = await uno.adquirir('otro-cliente', 'a', ['campos']);
      assert.ok(otro);
      await assert.rejects(uno.ejecutar(otro, async () => { throw new Error('NO ejecutar'); }), /padrones ERP compartidos/);
      await uno.liberar(otro);
    }
    finally { continuar(); await trabajo; }
    await dos.liberar(nueva);
    const libre = await uno.adquirir('cliente', 'a', ['campos']);
    assert.ok(libre);
    await uno.liberar(libre);
  } finally {
    await Promise.all([db1.$disconnect(), db2.$disconnect()]);
    // El identificador solo se genera aqui; nunca se toma un schema del entorno para borrar.
    if (creado && /^agro_erp_lock_test_[a-f0-9]{32}$/.test(schema)) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
    await prisma.$disconnect();
  }
});
