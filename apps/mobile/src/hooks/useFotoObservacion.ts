import { useState, type RefObject } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { SesionUsuario } from '@agro/tipos';

export function useFotoObservacion(sesionActiva: SesionUsuario, sesionActual: RefObject<SesionUsuario | null>) {
  const [fotoSeleccionada, setFotoSeleccionada] = useState<ImagePicker.ImagePickerAsset | null>(null);
  async function seleccionarFotoObservacion() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (sesionActual.current !== sesionActiva) return;

    if (!permiso.granted) {
      Alert.alert('Observaciones', 'Necesitamos permiso para acceder a tus fotos.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.82,
    });

    if (!resultado.canceled && sesionActual.current === sesionActiva) {
      setFotoSeleccionada(resultado.assets[0]);
    }
  }

  async function tomarFotoObservacion() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (sesionActual.current !== sesionActiva) return;

    if (!permiso.granted) {
      Alert.alert('Observaciones', 'Necesitamos permiso para usar la camara.');
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.82,
    });

    if (!resultado.canceled && sesionActual.current === sesionActiva) {
      setFotoSeleccionada(resultado.assets[0]);
    }
  }

  return { fotoSeleccionada, setFotoSeleccionada, seleccionarFotoObservacion, tomarFotoObservacion };
}
