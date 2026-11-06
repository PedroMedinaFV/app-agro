import * as FileSystem from 'expo-file-system/legacy';
import type { AdjuntoLocalPendiente } from './offline/tipos';

const esReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

async function preservarAdjunto(adjunto: AdjuntoLocalPendiente): Promise<AdjuntoLocalPendiente> {
  if (!esReactNative) {
    // Las URLs blob del picker no sobreviven una recarga: preservar el contenido.
    const respuesta = await fetch(adjunto.uri);
    if (!respuesta.ok) throw new Error('No se pudo leer la foto seleccionada.');
    const blob = await respuesta.blob();
    const uri = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onerror = lector.onabort = () => reject(new Error('No se pudo preservar la foto.'));
      lector.onload = () => resolve(String(lector.result));
      lector.readAsDataURL(blob);
    });
    return { ...adjunto, uri, tamanioBytes: blob.size };
  }

  const raiz = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!raiz) throw new Error('No hay almacenamiento local disponible para preservar la foto.');
  const directorio = `${raiz}agro-app/observaciones/`;
  const extension = adjunto.nombreArchivo.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase()
    || ({ 'image/png': '.png', 'image/webp': '.webp' }[adjunto.mimeType] || '.jpg');
  const destino = `${directorio}${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;
  await FileSystem.makeDirectoryAsync(directorio, { intermediates: true });
  await FileSystem.copyAsync({ from: adjunto.uri, to: destino });
  return { ...adjunto, uri: destino };
}

export async function prepararAdjuntosLocalesPendientes(adjuntos: AdjuntoLocalPendiente[]) {
  const preparados: AdjuntoLocalPendiente[] = [];
  for (const adjunto of adjuntos) preparados.push(await preservarAdjunto(adjunto));
  return preparados;
}
