const test = require('node:test');
const assert = require('node:assert/strict');
const { obtenerPermisosRol, tienePermiso } = require('../packages/tipos/dist/auth');

test('admin conserva permisos criticos de configuracion, cierre y auditoria', () => {
  const permisos = obtenerPermisosRol('admin');

  assert.ok(permisos.includes('erp:configurar'));
  assert.ok(permisos.includes('usuarios:gestionar'));
  assert.ok(permisos.includes('planificacion:cerrar'));
  assert.ok(permisos.includes('auditoria:leer'));
});

test('operador_campo puede cargar registros operativos pero no configurar planificacion', () => {
  assert.equal(tienePermiso('operador_campo', 'registros:sincronizar'), true);
  assert.equal(tienePermiso('operador_campo', 'observaciones:crear'), true);
  assert.equal(tienePermiso('operador_campo', 'precipitaciones:crear'), true);
  assert.equal(tienePermiso('operador_campo', 'planificacion:configurar'), false);
  assert.equal(tienePermiso('operador_campo', 'auditoria:leer'), false);
});

test('rol desconocido cae a permisos de operador_campo', () => {
  assert.deepEqual(obtenerPermisosRol('rol-inexistente'), obtenerPermisosRol('operador_campo'));
});
