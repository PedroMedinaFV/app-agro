const test = require('node:test');
const assert = require('node:assert/strict');
const {
  prepararDestinoReferencia,
  prepararPrecioReferencia,
  validarDestinoReferencia,
  validarPrecioReferencia,
} = require('../apps/api/dist/services/preciosReferencia/validacionesPreciosReferencia');
const {
  prepararGastoComercial,
  validarGastoComercial,
  validarItemGastoComercial,
} = require('../apps/api/dist/services/gastosComerciales/validacionesGastosComerciales');
const {
  prepararConceptoGastoComercial,
  validarConceptoGastoComercial,
} = require('../apps/api/dist/services/gastosComerciales/validacionesConceptosGastos');

function capturarError(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }

  throw new Error('Se esperaba que la funcion lanzara un error.');
}

function crearPrecio(overrides = {}) {
  return {
    id: 'precio-1',
    clienteId: 'cliente-original',
    empresaErpId: 'empresa-1',
    especieAppId: 'especie-1',
    destinoVenta: '  Rosario   Norte  ',
    valor: 250,
    moneda: 'USD',
    unidad: 'Tn',
    fuente: 'manual',
    activo: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearDestino(overrides = {}) {
  return {
    id: 'destino-1',
    clienteId: 'cliente-1',
    empresaErpId: 'empresa-1',
    destinoVenta: '  Bahía   Blanca  ',
    destinoVentaNormalizado: '',
    descripcion: '  Puerto   cerealero  ',
    activo: true,
    origen: 'app',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearGasto(overrides = {}) {
  return {
    id: 'gasto-1',
    clienteId: 'cliente-1',
    campaniaErpId: '  2026-27  ',
    empresaErpId: 'empresa-1',
    actividadAppId: 'actividad-1',
    destinoVenta: '  Rosario   Norte  ',
    descripcion: '  Gastos   Rosario  ',
    items: [
      {
        conceptoGastoComercialId: '  concepto-1  ',
        conceptoNombre: '  Flete   corto  ',
        valorPorTonelada: 12,
        unidadCalculo: 'Tn',
        moneda: ' usd ',
        observaciones: '  tarifa   estimada  ',
      },
    ],
    activo: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearConcepto(overrides = {}) {
  return {
    id: 'concepto-1',
    clienteId: 'cliente-1',
    codigo: '',
    nombre: '  Flete   camión  ',
    nombreNormalizado: '',
    unidadCalculo: 'Tn',
    descripcion: '  Traslado   a puerto  ',
    activo: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

test('prepararPrecioReferencia limpia destino y fuerza cliente del usuario autenticado', () => {
  const preparado = prepararPrecioReferencia('precio-final', crearPrecio(), { clienteId: 'cliente-auth' });

  assert.equal(preparado.id, 'precio-final');
  assert.equal(preparado.clienteId, 'cliente-auth');
  assert.equal(preparado.destinoVenta, 'Rosario Norte');
});

test('validarPrecioReferencia exige especie, destino, valor no negativo, moneda y unidad', () => {
  assert.doesNotThrow(() => validarPrecioReferencia(crearPrecio()));
  assert.throws(() => validarPrecioReferencia(crearPrecio({ especieAppId: undefined, especieErpId: undefined })), /especieAppId o especieErpId/);
  assert.throws(() => validarPrecioReferencia(crearPrecio({ destinoVenta: '   ' })), /destino de venta/);
  assert.throws(() => validarPrecioReferencia(crearPrecio({ valor: -1 })), /no puede ser negativo/);
  assert.throws(() => validarPrecioReferencia(crearPrecio({ moneda: '' })), /moneda y unidad/);
});

test('prepararDestinoReferencia normaliza nombre, clave y descripcion', () => {
  const preparado = prepararDestinoReferencia(crearDestino());

  assert.equal(preparado.destinoVenta, 'Bahía Blanca');
  assert.equal(preparado.destinoVentaNormalizado, 'BAHIA BLANCA');
  assert.equal(preparado.descripcion, 'Puerto cerealero');
});

test('validarDestinoReferencia bloquea ERP, puerto y modificaciones de otro cliente', () => {
  assert.doesNotThrow(() => validarDestinoReferencia(crearDestino(), { clienteId: 'cliente-1' }));

  const errorErp = capturarError(() => validarDestinoReferencia(crearDestino({ origen: 'erp' })));
  assert.match(errorErp.message, /ERP no se pueden editar/);
  assert.equal(errorErp.statusCode, 403);

  const errorPuerto = capturarError(() => validarDestinoReferencia(crearDestino({ id: 'puerto-33' })));
  assert.match(errorPuerto.message, /ERP no se pueden editar/);
  assert.equal(errorPuerto.statusCode, 403);

  const errorCliente = capturarError(() => validarDestinoReferencia(crearDestino(), { clienteId: 'cliente-2' }));
  assert.match(errorCliente.message, /otro cliente/);
  assert.equal(errorCliente.statusCode, 403);
});

test('prepararGastoComercial limpia cabecera e items y normaliza moneda', () => {
  const preparado = prepararGastoComercial(crearGasto());

  assert.equal(preparado.campaniaErpId, '2026-27');
  assert.equal(preparado.destinoVenta, 'Rosario Norte');
  assert.equal(preparado.descripcion, 'Gastos Rosario');
  assert.equal(preparado.items[0].conceptoGastoComercialId, 'concepto-1');
  assert.equal(preparado.items[0].conceptoNombre, 'Flete corto');
  assert.equal(preparado.items[0].moneda, 'USD');
  assert.equal(preparado.items[0].observaciones, 'tarifa estimada');
});

test('validarGastoComercial exige cabecera completa e items validos', () => {
  assert.doesNotThrow(() => validarGastoComercial(crearGasto()));
  assert.throws(() => validarGastoComercial(crearGasto({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarGastoComercial(crearGasto({ empresaErpId: '' })), /empresaErpId/);
  assert.throws(() => validarGastoComercial(crearGasto({ campaniaErpId: '' })), /campaniaErpId/);
  assert.throws(() => validarGastoComercial(crearGasto({ actividadAppId: '' })), /actividadAppId/);
  assert.throws(() => validarGastoComercial(crearGasto({ descripcion: '   ' })), /descripcion/);
  assert.throws(() => validarGastoComercial(crearGasto({ items: [] })), /al menos un item/);
});

test('validarItemGastoComercial rechaza concepto incompleto, valor negativo, unidad y moneda invalidos', () => {
  const item = crearGasto().items[0];

  assert.throws(() => validarItemGastoComercial({ ...item, conceptoGastoComercialId: '' }, 0), /seleccionar concepto/);
  assert.throws(() => validarItemGastoComercial({ ...item, conceptoNombre: '' }, 0), /nombre del concepto/);
  assert.throws(() => validarItemGastoComercial({ ...item, valorPorTonelada: -1 }, 0), /valor negativo/);
  assert.throws(() => validarItemGastoComercial({ ...item, unidadCalculo: 'Kg' }, 0), /unidad Tn o Ha/);
  assert.throws(() => validarItemGastoComercial({ ...item, moneda: '' }, 0), /moneda/);
});

test('prepararConceptoGastoComercial genera codigo normalizado desde nombre', () => {
  const preparado = prepararConceptoGastoComercial(crearConcepto());

  assert.equal(preparado.codigo, 'FLETE CAMION');
  assert.equal(preparado.nombre, 'Flete camión');
  assert.equal(preparado.nombreNormalizado, 'FLETE CAMION');
  assert.equal(preparado.descripcion, 'Traslado a puerto');
});

test('validarConceptoGastoComercial exige cliente, nombre, codigo, unidad y alcance por cliente', () => {
  assert.doesNotThrow(() => validarConceptoGastoComercial(crearConcepto({ codigo: 'FLETE CAMION' }), { clienteId: 'cliente-1' }));
  assert.throws(() => validarConceptoGastoComercial(crearConcepto({ clienteId: '' })), /clienteId/);
  assert.throws(() => validarConceptoGastoComercial(crearConcepto({ nombre: '' })), /nombre/);
  assert.throws(() => validarConceptoGastoComercial(crearConcepto({ codigo: '' })), /codigo/);
  assert.throws(() => validarConceptoGastoComercial(crearConcepto({ codigo: 'FLETE', unidadCalculo: 'Kg' })), /Tn o Ha/);

  const errorCliente = capturarError(
    () => validarConceptoGastoComercial(crearConcepto({ codigo: 'FLETE' }), { clienteId: 'cliente-2' }),
  );
  assert.match(errorCliente.message, /otro cliente/);
  assert.equal(errorCliente.statusCode, 403);
});
