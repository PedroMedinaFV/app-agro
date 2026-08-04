export type RegistroLocal = {
  id: string;
  tipo: string;
  payload: unknown;
  creadoEn: string;
  sincronizado: boolean;
};

const clave = 'agro-app-registros-local';

const esReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

async function obtenerAlmacenamiento() {
  if (!esReactNative) {
    return null;
  }

  const AsyncStorage = await import('@react-native-async-storage/async-storage');
  return AsyncStorage.default;
}

async function leerRaw(): Promise<RegistroLocal[]> {
  if (esReactNative) {
    const storage = await obtenerAlmacenamiento();
    if (!storage) {
      return [];
    }
    const valor = await storage.getItem(clave);
    return valor ? JSON.parse(valor) : [];
  }

  if (typeof localStorage === 'undefined') {
    return [];
  }

  const valor = localStorage.getItem(clave);
  return valor ? JSON.parse(valor) : [];
}

async function escribirRaw(registros: RegistroLocal[]) {
  if (esReactNative) {
    const storage = await obtenerAlmacenamiento();
    if (!storage) {
      return;
    }
    await storage.setItem(clave, JSON.stringify(registros));
    return;
  }

  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(clave, JSON.stringify(registros));
}

export async function guardarRegistroLocal(registro: RegistroLocal) {
  const actual = await leerRaw();
  const siguiente = [...actual, registro];
  await escribirRaw(siguiente);
  return siguiente;
}

export async function leerRegistrosLocales(): Promise<RegistroLocal[]> {
  return leerRaw();
}

export async function marcarRegistroSincronizado(id: string) {
  const actual = (await leerRaw()).map((item) =>
    item.id === id ? { ...item, sincronizado: true } : item
  );
  await escribirRaw(actual);
  return actual;
}

export async function limpiarRegistrosSincronizados() {
  const actual = (await leerRaw()).filter((item) => !item.sincronizado);
  await escribirRaw(actual);
  return actual;
}
