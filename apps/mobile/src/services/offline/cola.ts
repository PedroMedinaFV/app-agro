import type { CrearAdjuntoObservacionInput } from '@agro/tipos';
import type { AlmacenamientoOffline, NuevoRegistroLocal, PropietarioOffline, RegistroLocal } from './tipos';

const escrituras = new WeakMap<AlmacenamientoOffline, Map<string, Promise<unknown>>>();
const sincronizaciones = new WeakMap<AlmacenamientoOffline, Set<string>>();

export function clavePropietario(propietario: PropietarioOffline) {
  if (!propietario.clienteId?.trim() || !propietario.usuarioId?.trim()) {
    throw new Error('Se necesita una sesion con cliente y usuario para usar los pendientes.');
  }
  return `agro-app-registros-v2:${encodeURIComponent(propietario.clienteId)}:${encodeURIComponent(propietario.usuarioId)}`;
}

export function crearColaOffline(storage: AlmacenamientoOffline, propietario: PropietarioOffline) {
  const identidad = Object.freeze({ ...propietario });
  const clave = clavePropietario(identidad);
  const operaciones = escrituras.get(storage) || new Map<string, Promise<unknown>>();
  escrituras.set(storage, operaciones);
  const enCurso = sincronizaciones.get(storage) || new Set<string>();
  sincronizaciones.set(storage, enCurso);

  function exclusiva<T>(operacion: () => Promise<T>): Promise<T> {
    const anterior = operaciones.get(clave) || Promise.resolve();
    const actual = anterior.catch(() => undefined).then(operacion);
    operaciones.set(clave, actual);
    void actual.finally(() => {
      if (operaciones.get(clave) === actual) operaciones.delete(clave);
    }).catch(() => undefined);
    return actual;
  }

  async function leer(): Promise<RegistroLocal[]> {
    const raw = await storage.getItem(clave);
    if (raw === null) return [];
    try {
      const datos = JSON.parse(raw);
      if (datos.version !== 2 || !Array.isArray(datos.registros)) throw new Error();
      const ids = new Set<string>();
      for (const registro of datos.registros) {
        if (!registro || typeof registro.id !== 'string' || !registro.id || ids.has(registro.id)
          || typeof registro.tipo !== 'string' || typeof registro.creadoEn !== 'string'
          || typeof registro.sincronizado !== 'boolean' || !registro.payload || typeof registro.payload !== 'object'
          || Array.isArray(registro.payload)
          || registro.propietario?.clienteId !== identidad.clienteId
          || registro.propietario?.usuarioId !== identidad.usuarioId
          || (registro.adjuntosLocales !== undefined && !Array.isArray(registro.adjuntosLocales))) throw new Error();
        ids.add(registro.id);
      }
      return datos.registros;
    } catch {
      throw new Error('No se pudieron leer los pendientes. Los datos locales se conservaron para recuperacion.');
    }
  }

  async function escribir(registros: RegistroLocal[]) {
    await storage.setItem(clave, JSON.stringify({ version: 2, registros }));
    return registros;
  }

  async function modificar(id: string, cambio: (registro: RegistroLocal) => RegistroLocal) {
    const registros = await leer();
    if (!registros.some((registro) => registro.id === id)) throw new Error('El pendiente no pertenece a esta cola.');
    return escribir(registros.map((registro) => registro.id === id ? cambio(registro) : registro));
  }

  return {
    listar: () => exclusiva(leer),
    guardar: (registro: NuevoRegistroLocal) => exclusiva(async () => {
      if (!registro.id?.trim()) throw new Error('El pendiente necesita un identificador estable.');
      const registros = await leer();
      if (registros.some((item) => item.id === registro.id)) throw new Error('Ya existe un pendiente con ese identificador.');
      return escribir([...registros, { ...registro, propietario: identidad, sincronizado: false }]);
    }),
    marcarSincronizado: (id: string) => exclusiva(() => modificar(id, (registro) => ({ ...registro, sincronizado: true }))),
    guardarAdjuntoSubido: (id: string, indice: number, subido: CrearAdjuntoObservacionInput) => exclusiva(() => modificar(id, (registro) => {
      if (!registro.adjuntosLocales?.[indice]) throw new Error('No existe el adjunto pendiente.');
      return { ...registro, adjuntosLocales: registro.adjuntosLocales.map((adjunto, i) => i === indice ? { ...adjunto, subido } : adjunto) };
    })),
    limpiarSincronizados: () => exclusiva(async () => escribir((await leer()).filter((registro) => !registro.sincronizado))),
    async sincronizarExclusivamente<T>(operacion: () => Promise<T>) {
      if (enCurso.has(clave)) throw new Error('Ya hay una sincronizacion en curso para este usuario.');
      enCurso.add(clave);
      try { return await operacion(); } finally { enCurso.delete(clave); }
    },
  };
}

export type ColaOffline = ReturnType<typeof crearColaOffline>;
