const test = require('node:test');
const assert = require('node:assert/strict');
const {
  camposAsignadosPorDefecto,
  limpiarTextoVisible,
  normalizarEmail,
  normalizarRol,
  rolTieneTodosLosCampos,
  validarPasswordTemporal,
  validarUsuarioRequest,
} = require('../apps/api/dist/services/usuarios/validacionesUsuarios');

function crearUsuarioRequest(overrides = {}) {
  return {
    email: '  ADMIN@Campo.COM  ',
    nombre: '  Pedro   Medina  ',
    rol: 'admin',
    passwordTemporal: '  temporal123  ',
    ...overrides,
  };
}

test('limpiarTextoVisible recorta y colapsa espacios visibles', () => {
  assert.equal(limpiarTextoVisible('  Pedro   Medina  '), 'Pedro Medina');
});

test('normalizarEmail recorta, colapsa espacios y pasa a minusculas', () => {
  assert.equal(normalizarEmail('  USER@Campo.COM  '), 'user@campo.com');
});

test('normalizarRol conserva roles validos y cae seguro a operador_campo', () => {
  assert.equal(normalizarRol('admin'), 'admin');
  assert.equal(normalizarRol('planificador'), 'planificador');
  assert.equal(normalizarRol('responsable_compras'), 'responsable_compras');
  assert.equal(normalizarRol('operador_campo'), 'operador_campo');
  assert.equal(normalizarRol('super_admin'), 'operador_campo');
});

test('rolTieneTodosLosCampos habilita acceso total solo a roles administrativos', () => {
  assert.equal(rolTieneTodosLosCampos('admin'), true);
  assert.equal(rolTieneTodosLosCampos('planificador'), true);
  assert.equal(rolTieneTodosLosCampos('responsable_compras'), true);
  assert.equal(rolTieneTodosLosCampos('operador_campo'), false);
  assert.equal(rolTieneTodosLosCampos(undefined), false);
});

test('camposAsignadosPorDefecto devuelve null para roles globales y lista vacia para operador', () => {
  assert.equal(camposAsignadosPorDefecto({ rol: 'admin' }), null);
  assert.equal(camposAsignadosPorDefecto({ rol: 'planificador' }), null);
  assert.deepEqual(camposAsignadosPorDefecto({ rol: 'operador_campo' }), []);
  assert.deepEqual(camposAsignadosPorDefecto({ rol: 'rol_desconocido' }), []);
});

test('validarPasswordTemporal recorta password y exige minimo ocho caracteres', () => {
  assert.equal(validarPasswordTemporal(undefined), undefined);
  assert.equal(validarPasswordTemporal('   '), undefined);
  assert.equal(validarPasswordTemporal('  temporal123  '), 'temporal123');
  assert.throws(() => validarPasswordTemporal(' corto '), /al menos 8 caracteres/);
});

test('validarUsuarioRequest normaliza email, nombre, rol y password temporal', () => {
  assert.deepEqual(validarUsuarioRequest(crearUsuarioRequest()), {
    email: 'admin@campo.com',
    nombre: 'Pedro Medina',
    rol: 'admin',
    passwordTemporal: 'temporal123',
  });
});

test('validarUsuarioRequest rechaza email invalido y aplica fallback seguro de rol', () => {
  assert.throws(() => validarUsuarioRequest(crearUsuarioRequest({ email: 'sin-arroba' })), /email valido/);

  const resultado = validarUsuarioRequest(crearUsuarioRequest({
    rol: 'dueno',
    nombre: undefined,
    passwordTemporal: undefined,
  }));

  assert.equal(resultado.rol, 'operador_campo');
  assert.equal(resultado.nombre, null);
  assert.equal(resultado.passwordTemporal, undefined);
});
