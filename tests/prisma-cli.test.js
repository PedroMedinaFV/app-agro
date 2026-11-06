const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { ejecutarPrisma } = require('../scripts/prisma-with-root-env');

test('CLI Prisma: respeta entorno incluso vacio y transmite argumentos sin shell', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'agro-prisma-cli-'));
  try {
    const envPath = join(carpeta, '.env');
    writeFileSync(envPath, 'DATABASE_URL="ficticia"\nVACIA=desde-archivo\nNUEVA="valor"\n');
    const entorno = { DATABASE_URL: 'desde-entorno', VACIA: '' };
    const codigo = ejecutarPrisma(['migrate', 'status'], {
      envPath, entorno,
      spawnSync: (ejecutable, args, opciones) => {
        assert.equal(ejecutable, process.execPath);
        assert.match(args[0], /prisma[/\\]build[/\\]index\.js$/);
        assert.deepEqual(args.slice(1), ['migrate', 'status']);
        assert.equal(opciones.shell, false);
        assert.equal(opciones.env.DATABASE_URL, 'desde-entorno');
        assert.equal(opciones.env.VACIA, '');
        assert.equal(opciones.env.NUEVA, 'valor');
        return { status: 0 };
      },
    });
    assert.equal(codigo, 0);
    assert.equal(entorno.NUEVA, undefined);
  } finally {
    unlinkSync(join(carpeta, '.env'));
    rmdirSync(carpeta);
  }
});

test('CLI Prisma: propaga fallo, terminacion e imposibilidad de iniciar sin filtrar detalles', () => {
  for (const [resultado, esperado] of [[{ status: 7 }, 7], [{ status: null, signal: 'SIGTERM' }, 1], [{ error: new Error('dato sensible'), status: null }, 1]]) {
    const mensajes = [];
    assert.equal(ejecutarPrisma(['validate'], {
      entorno: {}, envPath: join(__dirname, 'archivo-inexistente.env'),
      spawnSync: () => resultado, informarError: (mensaje) => mensajes.push(mensaje),
    }), esperado);
    assert.ok(mensajes.every((mensaje) => !mensaje.includes('dato sensible')));
    assert.equal(mensajes.length, resultado.error ? 1 : 0);
  }
});
