const test = require('node:test');
const assert = require('node:assert/strict');
const { crearColaOffline, clavePropietario } = require('../apps/mobile/.cache/offline-tests/cola');
const { sincronizarCola } = require('../apps/mobile/.cache/offline-tests/sincronizador');

const ana = { clienteId: 'cliente-1', usuarioId: 'ana' };
const beto = { clienteId: 'cliente-1', usuarioId: 'beto' };
const otroCliente = { clienteId: 'cliente-2', usuarioId: 'ana' };
const foto = (nombre) => ({ uri: `file://${nombre}`, nombreArchivo: nombre, mimeType: 'image/jpeg', tamanioBytes: 123 });
const remoto = (adjunto) => ({ storageBucket: 'observaciones', storagePath: adjunto.nombreArchivo, nombreArchivo: adjunto.nombreArchivo, mimeType: adjunto.mimeType, tamanioBytes: 123, estado: 'disponible' });
const registro = (id, cambios = {}) => ({ id, tipo: 'observacion', payload: { titulo: id, campoAppId: 'campo-1' }, creadoEn: '2026-11-06T10:00:00Z', ...cambios });
function memoria() {
  const datos = new Map();
  return {
    datos,
    getItem: async (key) => datos.get(key) ?? null,
    setItem: async (key, valor) => { datos.set(key, valor); },
  };
}
function deps(cambios = {}) {
  return {
    estaActiva: () => true,
    subirAdjunto: async (adjunto) => remoto(adjunto),
    enviar: async (item) => ({ resultado: { registros: [{ id: item.id, sincronizado: true }] } }),
    ...cambios,
  };
}

test('offline aisla cliente y usuario incluso con mismo identificador y conserva al volver a iniciar sesion', async () => {
  const storage = memoria();
  for (const propietario of [ana, beto, otroCliente]) {
    await crearColaOffline(storage, propietario).guardar(registro('mismo-id', { payload: { autor: propietario.usuarioId, cliente: propietario.clienteId } }));
  }
  await crearColaOffline(storage, beto).marcarSincronizado('mismo-id');
  const colaReabierta = crearColaOffline(storage, ana);
  assert.equal((await colaReabierta.listar())[0].sincronizado, false);
  assert.equal((await crearColaOffline(storage, otroCliente).listar())[0].sincronizado, false);
  const enviados = [];
  await sincronizarCola(colaReabierta, deps({ enviar: async (item) => {
    enviados.push(item);
    return { resultado: { registros: [{ id: item.id, sincronizado: true }] } };
  } }));
  assert.equal(enviados.length, 1);
  assert.deepEqual(enviados[0].payload, { autor: 'ana', cliente: 'cliente-1' });
});

test('offline serializa guardados, marcas y limpieza entre instancias sin perder registros', async () => {
  const storage = memoria();
  const cola = crearColaOffline(storage, ana);
  await Promise.all(Array.from({ length: 40 }, (_, i) => crearColaOffline(storage, ana).guardar(registro(`id-${i}`))));
  assert.equal((await cola.listar()).length, 40);
  await Promise.all([cola.marcarSincronizado('id-0'), cola.guardar(registro('nuevo')), cola.limpiarSincronizados()]);
  const restantes = await cola.listar();
  assert.equal(restantes.length, 40);
  assert.ok(restantes.some((item) => item.id === 'nuevo'));
  assert.ok(!restantes.some((item) => item.id === 'id-0'));
});

test('offline no reutiliza la cola legacy sin propietario ni la elimina', async () => {
  const storage = memoria();
  const legacy = JSON.stringify([registro('antiguo')]);
  storage.datos.set('agro-app-registros-local', legacy);
  assert.deepEqual(await crearColaOffline(storage, ana).listar(), []);
  await crearColaOffline(storage, ana).guardar(registro('nuevo'));
  assert.equal(storage.datos.get('agro-app-registros-local'), legacy);
});

test('offline rechaza propietario ausente, claves ambiguas e IDs duplicados', async () => {
  const storage = memoria();
  assert.throws(() => crearColaOffline(storage, { clienteId: '', usuarioId: 'ana' }));
  assert.notEqual(clavePropietario({ clienteId: 'a:b', usuarioId: 'c' }), clavePropietario({ clienteId: 'a', usuarioId: 'b:c' }));
  const cola = crearColaOffline(storage, ana);
  await cola.guardar(registro('id'));
  await assert.rejects(cola.guardar(registro('id')), /Ya existe/);
  assert.equal((await cola.listar()).length, 1);
  await assert.rejects(cola.marcarSincronizado('ajeno'), /no pertenece/);
});

test('offline conserva JSON corrupto o registros con propietario ajeno sin sobrescribirlos', async () => {
  const storage = memoria();
  const clave = clavePropietario(ana);
  for (const raw of ['{invalido', JSON.stringify({ version: 2, registros: [{ ...registro('id'), propietario: beto, sincronizado: false }] })]) {
    storage.datos.set(clave, raw);
    await assert.rejects(crearColaOffline(storage, ana).guardar(registro('nuevo')), /conservaron/);
    assert.equal(storage.datos.get(clave), raw);
  }
});

test('offline falla explicitamente al guardar sin persistencia y permite operar tras recuperacion', async () => {
  const storage = memoria();
  const escribir = storage.setItem;
  storage.setItem = async () => { throw new Error('disco lleno'); };
  const cola = crearColaOffline(storage, ana);
  await assert.rejects(cola.guardar(registro('id')), /disco lleno/);
  storage.setItem = escribir;
  await cola.guardar(registro('id'));
  assert.equal((await cola.listar()).length, 1);
});

test('offline persiste progreso de cada foto y reintenta solo las que faltan tras reiniciar', async () => {
  const storage = memoria();
  const cola = crearColaOffline(storage, ana);
  await cola.guardar(registro('id', { adjuntosLocales: [foto('uno.jpg'), foto('dos.jpg')] }));
  const subidas = [];
  const enviar = [];
  const primero = await sincronizarCola(cola, deps({ subirAdjunto: async (adjunto) => {
    subidas.push(adjunto.nombreArchivo);
    if (adjunto.nombreArchivo === 'dos.jpg') throw new Error('sin red');
    return remoto(adjunto);
  } }));
  assert.equal(primero.restantes, 1);
  const segundo = await sincronizarCola(crearColaOffline(storage, ana), deps({
    subirAdjunto: async (adjunto) => { subidas.push(adjunto.nombreArchivo); return remoto(adjunto); },
    enviar: async (item) => { enviar.push(item); return { resultado: { registros: [{ id: item.id, sincronizado: true }] } }; },
  }));
  assert.deepEqual(subidas, ['uno.jpg', 'dos.jpg', 'dos.jpg']);
  assert.equal(enviar[0].payload.adjuntos.length, 2);
  assert.equal(segundo.ok, true);
});

test('offline conserva ID y fotos subidas ante respuesta perdida del registro', async () => {
  const cola = crearColaOffline(memoria(), ana);
  await cola.guardar(registro('estable', { adjuntosLocales: [foto('uno.jpg')] }));
  let subidas = 0;
  const ids = [];
  const subirAdjunto = async (adjunto) => { subidas += 1; return remoto(adjunto); };
  await sincronizarCola(cola, deps({ subirAdjunto, enviar: async (item) => { ids.push(item.id); throw new Error('timeout'); } }));
  const resultado = await sincronizarCola(cola, deps({ subirAdjunto, enviar: async (item) => {
    ids.push(item.id); return { resultado: { registros: [{ id: item.id, sincronizado: true }] } };
  } }));
  assert.equal(subidas, 1);
  assert.deepEqual(ids, ['estable', 'estable']);
  assert.equal(resultado.sincronizados, 1);
});

test('offline no envia registro si no pudo persistir el progreso de una foto', async () => {
  const storage = memoria();
  const cola = crearColaOffline(storage, ana);
  await cola.guardar(registro('id', { adjuntosLocales: [foto('uno.jpg')] }));
  storage.setItem = async () => { throw new Error('disco lleno'); };
  let envios = 0;
  const resultado = await sincronizarCola(cola, deps({ enviar: async () => { envios += 1; } }));
  assert.equal(envios, 0);
  assert.equal(resultado.restantes, 1);
});

test('offline no inicia solicitudes despues de cambiar sesion durante una subida', async () => {
  const storage = memoria();
  const cola = crearColaOffline(storage, ana);
  await cola.guardar(registro('id', { adjuntosLocales: [foto('uno.jpg'), foto('dos.jpg')] }));
  let activa = true;
  let envios = 0;
  const resultado = await sincronizarCola(cola, deps({
    estaActiva: () => activa,
    subirAdjunto: async (adjunto) => { activa = false; return remoto(adjunto); },
    enviar: async () => { envios += 1; },
  }));
  assert.equal(envios, 0);
  assert.equal(resultado.restantes, 1);
  assert.equal((await cola.listar())[0].adjuntosLocales[0].subido.storagePath, 'uno.jpg');
  assert.deepEqual(await crearColaOffline(storage, beto).listar(), []);
});

test('offline una confirmacion en vuelo tras logout solo marca la cola original', async () => {
  const storage = memoria();
  const cola = crearColaOffline(storage, ana);
  const otra = crearColaOffline(storage, beto);
  await cola.guardar(registro('mismo'));
  await otra.guardar(registro('mismo'));
  let activa = true;
  await sincronizarCola(cola, deps({ estaActiva: () => activa, enviar: async (item) => {
    activa = false; return { resultado: { registros: [{ id: item.id, sincronizado: true }] } };
  } }));
  assert.equal((await cola.listar())[0].sincronizado, true);
  assert.equal((await otra.listar())[0].sincronizado, false);
});

test('offline procesa errores parciales y cuenta pendientes reales sin confiar en contadores remotos', async () => {
  const cola = crearColaOffline(memoria(), ana);
  await cola.guardar(registro('fallido'));
  await cola.guardar(registro('correcto'));
  const resultado = await sincronizarCola(cola, deps({ enviar: async (item) => ({ resultado: {
    pendientes: 0, registros: [{ id: item.id, sincronizado: item.id === 'correcto', error: 'campo no permitido' }],
  } }) }));
  assert.equal(resultado.ok, false);
  assert.equal(resultado.restantes, 1);
  assert.equal(resultado.sincronizados, 1);
});

test('offline no marca nada con confirmacion ausente, ajena o de tipo incorrecto', async () => {
  for (const respuesta of [{}, { resultado: { registros: [{ id: 'ajeno', sincronizado: true }] } },
    { resultado: { registros: [{ id: 'id', sincronizado: 'true' }] } }]) {
    const cola = crearColaOffline(memoria(), ana);
    await cola.guardar(registro('id'));
    const resultado = await sincronizarCola(cola, deps({ enviar: async () => respuesta }));
    assert.equal(resultado.restantes, 1);
    assert.equal(resultado.ok, false);
  }
});

test('offline bloquea dos sincronizaciones simultaneas y conserva nuevas cargas durante el envio', async () => {
  const storage = memoria();
  const cola = crearColaOffline(storage, ana);
  await cola.guardar(registro('inicial'));
  let terminar;
  let empezo;
  const iniciado = new Promise((resolve) => { empezo = resolve; });
  const envio = new Promise((resolve) => { terminar = resolve; });
  const primera = sincronizarCola(cola, deps({ enviar: async (item) => {
    empezo(); await envio;
    return { resultado: { registros: [{ id: item.id, sincronizado: true }] } };
  } }));
  await iniciado;
  await assert.rejects(sincronizarCola(crearColaOffline(storage, ana), deps()), /en curso/);
  await cola.guardar(registro('nuevo'));
  terminar();
  const resultado = await primera;
  assert.equal(resultado.restantes, 1);
  assert.equal((await cola.listar()).length, 2);
});
