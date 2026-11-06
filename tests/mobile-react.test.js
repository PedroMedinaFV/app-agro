const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarAppMobile, React, renderer } = require('./helpers/mobile-react');
const { act } = renderer;

const cuenta = (id) => ({ token: id, usuario: { id, email: `${id}@agro.test`, clienteId: `cliente-${id}`, rol: 'operador_campo' }, permisos: [] });
function snapshot(id) {
  return {
    zonasApp: [], camposApp: [{ id, nombre: `Campo ${id}` }], lotesApp: [], especiesApp: [], actividadesApp: [],
    insumosApp: [], destinosReferencia: [], preciosReferencia: [], conceptosGastosComerciales: [], gastosComercialesReferencia: [],
    estadiosReferencia: [], serviciosApp: [], cultivosErp: [], protocolos: [], planificaciones: [], sincronizadoEn: '',
  };
}
function entorno(cambios = {}) {
  const registros = new Map();
  const eventos = [];
  return {
    registros, eventos,
    api: { loginUsuario: async (email) => cuenta(email.split('@')[0]), obtenerPlanificacionSnapshot: async (token) => snapshot(token) },
    almacenamiento: {
      obtenerColaSesion: async (sesion) => ({
        listar: async () => registros.get(sesion.token) || [],
        guardar: async (registro) => { eventos.push('guardar'); registros.set(sesion.token, [...(registros.get(sesion.token) || []), registro]); },
      }),
      hayPendientesAnteriores: async () => false,
    },
    sincronizacion: { sincronizarPendientes: async () => { eventos.push('sincronizar'); return { ok: true, sincronizados: 0 }; } },
    adjuntos: { prepararAdjuntosLocalesPendientes: async (fotos) => fotos },
    ...cambios,
  };
}
const entrada = (app, placeholder) => app.root.findByProps({ placeholder });
const boton = (app, title) => app.root.findByProps({ title });
const contador = (app) => app.root.findAllByType('Text').find((texto) => texto.props.children[0] === 'Pendientes de sincronizacion: ').props.children[1];
async function ingresar(app, id) {
  await act(async () => entrada(app, 'Correo').props.onChangeText(`${id}@agro.test`));
  await act(async () => boton(app, 'Ingresar').props.onPress());
}
async function conApp(deps, comprobar) {
  const { App, alertas } = cargarAppMobile(deps);
  let app;
  try {
    await act(async () => { app = renderer.create(React.createElement(App)); });
    await comprobar(app, alertas);
  } finally {
    if (app) await act(async () => app.unmount());
  }
}

test('mobile React: cambio de cuenta desmonta formularios y muestra solo datos/pendientes de la nueva sesion', async () => {
  const deps = entorno();
  deps.registros.set('a', [{ id: 'pendiente-a', sincronizado: false }]);
  await conApp(deps, async (app) => {
    await ingresar(app, 'a');
    assert.equal(contador(app), 1);
    await act(async () => entrada(app, 'Titulo').props.onChangeText('Privado A'));
    await act(async () => entrada(app, 'Milimetros').props.onChangeText('25'));
    await act(async () => boton(app, 'Cerrar sesion').props.onPress());
    await ingresar(app, 'b');
    assert.equal(contador(app), 0);
    assert.equal(entrada(app, 'Titulo').props.value, '');
    assert.equal(entrada(app, 'Milimetros').props.value, '');
    assert.ok(!JSON.stringify(app.toJSON()).includes('Campo a'));
    assert.ok(JSON.stringify(app.toJSON()).includes('Campo b'));
    assert.equal(deps.registros.get('a').length, 1);
    await act(async () => boton(app, 'Cerrar sesion').props.onPress());
    await ingresar(app, 'a');
    assert.equal(contador(app), 1);
    assert.ok(JSON.stringify(app.toJSON()).includes('Campo a'));
    assert.equal(deps.registros.get('a').length, 1);
  });
});

test('mobile React: snapshot y selector de foto en vuelo no contaminan la cuenta siguiente', async () => {
  const deps = entorno();
  let terminarSnapshot;
  let terminarFoto;
  deps.api.obtenerPlanificacionSnapshot = (token) => token === 'a' ? new Promise((resolve) => { terminarSnapshot = resolve; }) : Promise.resolve(snapshot(token));
  deps.picker = {
    requestCameraPermissionsAsync: async () => ({ granted: true }),
    launchCameraAsync: () => new Promise((resolve) => { terminarFoto = resolve; }),
  };
  await conApp(deps, async (app) => {
    await ingresar(app, 'a');
    let seleccion;
    await act(async () => { seleccion = boton(app, 'Tomar foto').props.onPress(); });
    await act(async () => boton(app, 'Cerrar sesion').props.onPress());
    await ingresar(app, 'b');
    await act(async () => {
      terminarSnapshot(snapshot('a'));
      terminarFoto({ canceled: false, assets: [{ uri: 'foto-privada-a', fileName: 'privada-a.jpg' }] });
      await seleccion;
    });
    const arbol = JSON.stringify(app.toJSON());
    assert.ok(arbol.includes('Campo b'));
    assert.ok(!arbol.includes('Campo a'));
    assert.ok(!arbol.includes('privada-a'));
  });
});

test('mobile React: fallo de persistencia conserva el formulario y no inicia envio; reintento guarda antes de sincronizar', async () => {
  const deps = entorno();
  let fallar = true;
  const obtener = deps.almacenamiento.obtenerColaSesion;
  deps.almacenamiento.obtenerColaSesion = async (sesion) => {
    const cola = await obtener(sesion);
    return { ...cola, guardar: async (registro) => {
      if (fallar) throw new Error('Disco lleno');
      await cola.guardar(registro);
    } };
  };
  await conApp(deps, async (app, alertas) => {
    await ingresar(app, 'a');
    await act(async () => entrada(app, 'Milimetros').props.onChangeText('25'));
    await act(async () => boton(app, 'Guardar precipitacion').props.onPress());
    assert.equal(entrada(app, 'Milimetros').props.value, '25');
    assert.deepEqual(deps.eventos, []);
    assert.ok(alertas.some((alerta) => alerta.includes('Disco lleno')));
    fallar = false;
    await act(async () => boton(app, 'Guardar precipitacion').props.onPress());
    assert.equal(entrada(app, 'Milimetros').props.value, '');
    assert.deepEqual(deps.eventos, ['guardar', 'sincronizar']);
    assert.equal(deps.registros.get('a')[0].payload.milimetros, 25);
  });
});
