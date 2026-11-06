const { readFileSync, existsSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { createRequire } = require('node:module');
const { compileFunction } = require('node:vm');
const ts = require('typescript');

const raiz = resolve(__dirname, '../../apps/mobile/src');
const requireMobile = createRequire(resolve(raiz, '../package.json'));
const React = requireMobile('react');
const renderer = requireMobile('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Carga el codigo TS/TSX real; solo sustituye adaptadores nativos, red y storage. */
function cargarAppMobile({ api, almacenamiento, sincronizacion, adjuntos = {}, picker = {} }) {
  const alertas = [];
  const nativos = Object.fromEntries(['Button', 'ScrollView', 'Text', 'TextInput', 'View'].map((nombre) => [nombre, nombre]));
  nativos.StyleSheet = { create: (estilos) => estilos };
  nativos.Alert = { alert: (...args) => alertas.push(args) };
  const sustituciones = new Map([
    [resolve(raiz, 'services/api.ts'), api],
    [resolve(raiz, 'services/almacenamientoLocal.ts'), almacenamiento],
    [resolve(raiz, 'services/sincronizacion.ts'), sincronizacion],
    [resolve(raiz, 'services/adjuntosLocales.ts'), adjuntos],
  ]);
  const cache = new Map();
  function cargar(archivo) {
    if (sustituciones.has(archivo)) return sustituciones.get(archivo);
    if (cache.has(archivo)) return cache.get(archivo).exports;
    const modulo = { exports: {} };
    cache.set(archivo, modulo);
    const codigo = ts.transpileModule(readFileSync(archivo, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: archivo,
    }).outputText;
    const importar = (id) => {
      if (id === 'react-native') return nativos;
      if (id === 'expo-image-picker') return picker;
      if (!id.startsWith('.')) return requireMobile(id);
      const base = resolve(dirname(archivo), id);
      const destino = ['.ts', '.tsx'].map((extension) => base + extension).find(existsSync);
      if (!destino) throw new Error(`Import local no soportado: ${id}`);
      return cargar(destino);
    };
    compileFunction(codigo, ['require', 'module', 'exports'], { filename: archivo })(importar, modulo, modulo.exports);
    return modulo.exports;
  }
  return { App: cargar(resolve(raiz, 'App.tsx')).default, alertas };
}

module.exports = { cargarAppMobile, React, renderer };
