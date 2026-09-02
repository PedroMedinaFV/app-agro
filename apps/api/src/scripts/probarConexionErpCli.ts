import { prisma } from '../prisma';
import { obtenerEmpresasSistemaErp, resolverConfiguracionErp } from '../services/erp/clienteErp';

function obtenerClienteIdDesdeArgs() {
  const argumento = process.argv.find((arg) => arg.startsWith('--clienteId='));

  if (argumento) {
    return argumento.split('=')[1] || undefined;
  }

  return process.env.CLIENTE_ID || undefined;
}

async function main() {
  const clienteId = obtenerClienteIdDesdeArgs();
  const configuracion = await resolverConfiguracionErp(clienteId);
  const empresas = await obtenerEmpresasSistemaErp(clienteId);

  console.log(JSON.stringify({
    ok: true,
    modo: configuracion.authMode,
    baseUrlConfigurada: Boolean(configuracion.baseUrl),
    authBaseUrlConfigurada: Boolean(configuracion.authBaseUrl),
    apiKeyConfigurada: Boolean(configuracion.apiKey),
    bearerTokenConfigurado: Boolean(configuracion.bearerToken),
    basicConfigurado: Boolean(configuracion.username && configuracion.password),
    loginConfigurado: Boolean(configuracion.loginKey && configuracion.loginPassword && configuracion.loginApp && configuracion.loginInstallation),
    empresas: empresas.length,
    primerasEmpresas: empresas.slice(0, 5).map((empresa) => ({
      erpId: empresa.erpId,
      codigo: empresa.codigo,
      nombre: empresa.nombre,
      activo: empresa.activo,
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('No se pudo conectar con el ERP.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
