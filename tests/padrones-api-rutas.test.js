const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { compileFunction } = require('node:vm');
const ts = require('typescript');

function cargarApi(archivo, importar, fetch) {
  const filename = path.resolve(__dirname, '..', archivo);
  const codigo = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  }).outputText;
  const modulo = { exports: {} };
  compileFunction(codigo, ['require', 'module', 'exports', 'fetch'], { filename })(importar, modulo, modulo.exports, fetch);
  return modulo.exports;
}

test('web API: los siete padrones y consultas preservan IDs reservados como un unico segmento, sin modificar el body', async () => {
  const llamadas = [];
  const request = async (ruta, opciones = {}) => { llamadas.push({ ruta, opciones }); return {}; };
  const api = cargarApi('apps/web/src/services/api.ts', (id) => {
    if (id === './apiClient') return { request, invalidarCache: () => {}, obtenerConCache: (_cache, ruta) => request(ruta) };
    if (id === '../utils/backendActivity') return { startBackendActivity: () => () => {} };
    throw new Error(`Import no esperado: ${id}`);
  });
  const id = 'especie-app-cliente%3Auno:especie%3A39/con espacio?#';
  for (const [nombre, ruta] of [['Zona', 'zonas-app'], ['Campo', 'campos-app'], ['Lote', 'lotes-app'], ['Especie', 'especies-app'], ['Actividad', 'actividades-app'], ['Insumo', 'insumos-app'], ['Servicio', 'servicios-app']]) {
    const body = { registro: { id } };
    await api[`guardar${nombre}App`](id, body, 'token-testing');
    const llamada = llamadas.at(-1);
    assert.equal(llamada.ruta, `/${ruta}/${encodeURIComponent(id)}`);
    assert.equal(llamada.ruta.split('/').length, 3);
    assert.equal(decodeURIComponent(llamada.ruta.split('/')[2]), id);
    assert.deepEqual(JSON.parse(llamada.opciones.body), body);
  }
  await api.obtenerFichaLoteOperativo(id, 'token-testing');
  assert.equal(llamadas.at(-1).ruta, `/operativo/lotes/${encodeURIComponent(id)}/ficha`);
});

test('mobile API: la ficha de un lote con ID escapado llega intacta y conserva el token de la sesion', async () => {
  const llamadas = [];
  const api = cargarApi('apps/mobile/src/services/api.ts', (id) => { throw new Error(`Import no esperado: ${id}`); }, async (url, opciones) => {
    llamadas.push({ url, opciones });
    return { ok: true, json: async () => ({ lote: { id: 'canonico' } }) };
  });
  const id = 'lote-app-cliente:empresa%3A1%3Alote%3A2/con espacio?#';
  await api.obtenerFichaLoteOperativo(id, 'token-mobile-testing');
  assert.equal(new URL(llamadas[0].url).pathname, `/operativo/lotes/${encodeURIComponent(id)}/ficha`);
  assert.equal(llamadas[0].opciones.headers.Authorization, 'Bearer token-mobile-testing');
});
