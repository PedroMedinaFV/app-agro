const password = 'Testing-integracion-2026';
const clientes = { a: 'test-cliente-a', b: 'test-cliente-b' };
const usuarios = {
  adminA: { id: 'test-admin-a', email: 'admin-a@agro.test', rol: 'admin', clienteId: clientes.a },
  adminB: { id: 'test-admin-b', email: 'admin-b@agro.test', rol: 'admin', clienteId: clientes.b },
  operadorA: { id: 'test-operador-a', email: 'operador-a@agro.test', rol: 'operador_campo', clienteId: clientes.a },
  operadorB: { id: 'test-operador-b', email: 'operador-b@agro.test', rol: 'operador_campo', clienteId: clientes.b },
  sinCampos: { id: 'test-sin-campos', email: 'sin-campos@agro.test', rol: 'operador_campo', clienteId: clientes.a },
};
const campos = {
  a: { id: 'test-campo-a', clienteId: clientes.a, empresaErpId: 'test-empresa-a', campoErpId: 'test-erp-campo-a', nombre: 'Campo A' },
  aNoAsignado: { id: 'test-campo-a-no-asignado', clienteId: clientes.a, empresaErpId: 'test-empresa-a', campoErpId: 'test-erp-campo-a2', nombre: 'Campo A sin asignar' },
  b: { id: 'test-campo-b', clienteId: clientes.b, empresaErpId: 'test-empresa-b', campoErpId: 'test-erp-campo-b', nombre: 'Campo B' },
};
const lotes = { a: 'test-lote-a', aNoAsignado: 'test-lote-a2', b: 'test-lote-b' };

async function crearFixtures(prisma) {
  const bcrypt = require('../../apps/api/node_modules/bcryptjs');
  await prisma.cliente.createMany({ data: Object.values(clientes).map((id) => ({ id, nombre: id })) });
  const hash = await bcrypt.hash(password, 10);
  await prisma.usuario.createMany({ data: Object.values(usuarios).map((usuario) => ({ ...usuario, password: hash })) });
  await prisma.erpEmpresa.createMany({ data: ['a', 'b'].map((letra, i) => ({
    erpId: `test-empresa-${letra}`, idEmpresa: i + 1, codigo: letra, nombre: `Empresa ${letra}`, activo: true, actualizadoEn: new Date(),
  })) });
  await prisma.clienteEmpresaErp.createMany({ data: Object.entries(clientes).map(([letra, clienteId]) => ({ clienteId, empresaErpId: `test-empresa-${letra}` })) });
  for (const [i, [clave, campo]] of Object.entries(campos).entries()) {
    await prisma.erpCampo.create({ data: {
      empresaErpId: campo.empresaErpId, erpId: campo.campoErpId, idCampo: i + 1,
      codigo: campo.id, nombre: campo.nombre, actualizadoEn: new Date(),
    } });
    await prisma.campoApp.create({ data: campo });
    await prisma.loteApp.create({ data: {
      id: lotes[clave], clienteId: campo.clienteId, campoAppId: campo.id,
      nombre: `Lote ${clave}`, superficieTotal: 100, superficieProductiva: 90,
    } });
  }
  await prisma.usuarioCampoErp.createMany({ data: [
    { clienteId: clientes.a, usuarioId: usuarios.operadorA.id, campoErpId: campos.a.campoErpId },
    { clienteId: clientes.b, usuarioId: usuarios.operadorB.id, campoErpId: campos.b.campoErpId },
  ] });
  await prisma.actividadApp.createMany({ data: Object.entries(clientes).map(([letra, clienteId]) => ({
    id: `test-actividad-${letra}`, clienteId, empresaErpId: `test-empresa-${letra}`, nombre: `Actividad ${letra}`,
  })) });
}

module.exports = { crearFixtures, password, clientes, usuarios, campos, lotes };
