import { useState, type RefObject } from 'react';
import { Alert } from 'react-native';
import type { CampoApp, LoteApp, SesionUsuario } from '@agro/tipos';
import { prepararAdjuntosLocalesPendientes } from '../services/adjuntosLocales';
import { obtenerColaSesion, type AdjuntoLocalPendiente } from '../services/almacenamientoLocal';
import { useFotoObservacion } from './useFotoObservacion';

export function useFormularioRegistrosMobile(
  sesionActiva: SesionUsuario,
  sesionActual: RefObject<SesionUsuario | null>,
  campoSeleccionado: CampoApp | undefined,
  loteSeleccionado: LoteApp | undefined,
  sincronizarRegistrosPendientes: () => Promise<void>,
) {
  const [milimetros, setMilimetros] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [tituloObservacion, setTituloObservacion] = useState('');
  const [descripcionObservacion, setDescripcionObservacion] = useState('');
  const [severidadObservacion, setSeveridadObservacion] = useState<'baja' | 'media' | 'alta'>('media');
  const [latitudObservacion, setLatitudObservacion] = useState('');
  const [longitudObservacion, setLongitudObservacion] = useState('');
  const [guardandoPrecipitacion, setGuardandoPrecipitacion] = useState(false);
  const [guardandoObservacion, setGuardandoObservacion] = useState(false);
  const foto = useFotoObservacion(sesionActiva, sesionActual);
  const { fotoSeleccionada, setFotoSeleccionada } = foto;
  async function guardarPrecipitacionMobile() {
    const milimetrosNumericos = Number(milimetros);

    if (!campoSeleccionado || !Number.isFinite(milimetrosNumericos) || milimetrosNumericos <= 0) {
      Alert.alert('Precipitaciones', 'Selecciona campo e informa milimetros mayores a cero.');
      return;
    }

    const payload = {
      campoAppId: campoSeleccionado.id,
      loteAppId: loteSeleccionado?.id,
      milimetros: milimetrosNumericos,
      fechaEvento: new Date().toISOString(),
      observaciones: observaciones.trim() || undefined,
      origen: 'mobile' as const,
    };

    setGuardandoPrecipitacion(true);
    try {
      const cola = await obtenerColaSesion(sesionActiva);
      await cola.guardar({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tipo: 'precipitacion',
        payload,
        creadoEn: new Date().toISOString(),
      });
      if (sesionActual.current !== sesionActiva) return;
      setMilimetros('');
      setObservaciones('');
      await sincronizarRegistrosPendientes();
    } catch (error) {
      if (sesionActual.current === sesionActiva) Alert.alert('Precipitaciones', error instanceof Error ? error.message : 'No se pudo guardar el registro localmente.');
    } finally {
      if (sesionActual.current === sesionActiva) setGuardandoPrecipitacion(false);
    }
  }

  async function guardarObservacionMobile() {
    if (!campoSeleccionado || !tituloObservacion.trim() || !descripcionObservacion.trim()) {
      Alert.alert('Observaciones', 'Selecciona campo, titulo y descripcion.');
      return;
    }

    const latitud = latitudObservacion.trim() ? Number(latitudObservacion) : undefined;
    const longitud = longitudObservacion.trim() ? Number(longitudObservacion) : undefined;

    if ((latitud !== undefined && !Number.isFinite(latitud)) || (longitud !== undefined && !Number.isFinite(longitud))) {
      Alert.alert('Observaciones', 'Las coordenadas deben ser numericas.');
      return;
    }

    const nombreFoto = fotoSeleccionada?.fileName || `observacion-${Date.now()}.jpg`;
    const mimeFoto = fotoSeleccionada?.mimeType || 'image/jpeg';
    const tamanioFoto = fotoSeleccionada?.fileSize || 1;
    const adjuntosSeleccionados: AdjuntoLocalPendiente[] = fotoSeleccionada
      ? [{
        uri: fotoSeleccionada.uri,
        nombreArchivo: nombreFoto,
        mimeType: mimeFoto,
        tamanioBytes: tamanioFoto,
      }]
      : [];

    const payload = {
      campoAppId: campoSeleccionado.id,
      loteAppId: loteSeleccionado?.id,
      titulo: tituloObservacion.trim(),
      descripcion: descripcionObservacion.trim(),
      severidad: severidadObservacion,
      latitud,
      longitud,
      fechaEvento: new Date().toISOString(),
      origen: 'mobile' as const,
    };

    setGuardandoObservacion(true);
    try {
      const cola = await obtenerColaSesion(sesionActiva);
      const adjuntosLocales = await prepararAdjuntosLocalesPendientes(adjuntosSeleccionados);
      await cola.guardar({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tipo: 'observacion', payload, adjuntosLocales, creadoEn: new Date().toISOString(),
      });
      if (sesionActual.current !== sesionActiva) return;
      setTituloObservacion('');
      setDescripcionObservacion('');
      setLatitudObservacion('');
      setLongitudObservacion('');
      setFotoSeleccionada(null);
      await sincronizarRegistrosPendientes();
    } catch (error) {
      if (sesionActual.current === sesionActiva) Alert.alert('Observaciones', error instanceof Error ? error.message : 'No se pudo preservar la observacion localmente.');
    } finally {
      if (sesionActual.current === sesionActiva) setGuardandoObservacion(false);
    }
  }

  return { milimetros, setMilimetros, observaciones, setObservaciones, tituloObservacion, setTituloObservacion,
    descripcionObservacion, setDescripcionObservacion, severidadObservacion, setSeveridadObservacion, latitudObservacion,
    setLatitudObservacion, longitudObservacion, setLongitudObservacion, guardandoPrecipitacion, guardandoObservacion,
    guardarPrecipitacionMobile, guardarObservacionMobile, ...foto };
}
