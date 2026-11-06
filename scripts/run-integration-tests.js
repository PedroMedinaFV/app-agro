const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const { cargarEntornoTesting, validarSchemaTesting } = require('./lib/integration-environment');

async function main() {
  const raiz = path.resolve(__dirname, '..');
  const conexion = cargarEntornoTesting(raiz);
  const schema = `agro_integration_test_${randomUUID().replaceAll('-', '')}`;
  validarSchemaTesting(schema);
  const url = new URL(conexion);
  url.searchParams.set('schema', schema);
  url.searchParams.set('connection_limit', '4');
  const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');
  const admin = new PrismaClient({ datasourceUrl: conexion });
  const entorno = {
    ...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString(), TEST_DATABASE_URL: url.toString(), TEST_SCHEMA: schema,
    JWT_SECRET: randomBytes(32).toString('hex'), SECRETS_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    ERP_AUTH_MODE: 'mock', ERP_SYNC_LOCK_TTL_MS: '300000', ERP_BASE_URL: '', ERP_AUTH_BASE_URL: '', ERP_API_KEY: '', ERP_BEARER_TOKEN: '',
    ERP_USERNAME: '', ERP_PASSWORD: '', ERP_LOGIN_KEY: '', ERP_LOGIN_PASSWORD: '',
    SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', MICROSOFT_CLIENT_ID: '', API_JSON_LIMIT: '1mb',
  };
  let creado = false;
  let hijo;
  let interrumpido = false;
  const interrumpir = () => { interrumpido = true; hijo?.kill(); };
  process.on('SIGINT', interrumpir);
  process.on('SIGTERM', interrumpir);
  async function ejecutar(args, cwd = raiz, extra = {}) {
    if (interrumpido) throw new Error('Ejecucion interrumpida.');
    await new Promise((resolve, reject) => {
      hijo = spawn(process.execPath, args, { cwd, env: { ...entorno, ...extra }, stdio: 'inherit', shell: false });
      hijo.once('error', reject);
      hijo.once('exit', (codigo) => codigo === 0 && !interrumpido ? resolve() : reject(new Error('Fallo una fase de integracion; revisar su salida.')));
    });
    hijo = undefined;
  }
  try {
    console.log(`[integration] Schema exclusivo: ${schema}`);
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    creado = true;
    // Cada ejecucion tiene schema nuevo y exclusivo. El lock global de Prisma
    // no aporta exclusion aqui y puede quedar retenido por un pooler de sesiones.
    // La excepcion se limita a este hijo; db:deploy operativo mantiene su lock.
    await ejecutar([path.join(raiz, 'apps/api/node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', path.join(raiz, 'apps/api/prisma/schema.prisma')], raiz, { PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1' });
    await ejecutar(['--test', '--test-concurrency=1', path.join(raiz, 'tests/integration/api.integration.test.js')]);
  } finally {
    process.off('SIGINT', interrumpir);
    process.off('SIGTERM', interrumpir);
    try {
      if (creado) {
        validarSchemaTesting(schema);
        await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
        console.log(`[integration] Schema eliminado: ${schema}`);
      }
    } finally { await admin.$disconnect(); }
  }
}

main().catch((error) => {
  // No imprimir una URL de conexion que pueda aparecer en un error de configuracion.
  console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '<conexion omitida>'));
  process.exitCode = 1;
});
