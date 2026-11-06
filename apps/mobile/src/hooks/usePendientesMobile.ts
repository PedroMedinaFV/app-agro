import { useEffect, useState, type RefObject } from 'react';
import { Alert } from 'react-native';
import type { SesionUsuario } from '@agro/tipos';
import { obtenerColaSesion, hayPendientesAnteriores } from '../services/almacenamientoLocal';
import { sincronizarPendientes } from '../services/sincronizacion';

export function usePendientesMobile(sesionActiva: SesionUsuario, sesionActual: RefObject<SesionUsuario | null>) {
  const [pendientesAnteriores, setPendientesAnteriores] = useState(false);
  const [pendientesOffline, setPendientesOffline] = useState(0);
  const [sincronizandoOffline, setSincronizandoOffline] = useState(false);
  useEffect(() => {
    let cancelada = false;
    async function cargar() {
      try {
        const registros = await (await obtenerColaSesion(sesionActiva)).listar();
        const anteriores = await hayPendientesAnteriores();
        if (cancelada || sesionActual.current !== sesionActiva) return;
        setPendientesOffline(registros.filter((registro) => !registro.sincronizado).length);
        setPendientesAnteriores(anteriores);
      } catch (error) {
        if (!cancelada && sesionActual.current === sesionActiva) Alert.alert('Pendientes', error instanceof Error ? error.message : 'No se pudieron leer los pendientes.');
      }
    }
    void cargar();
    return () => { cancelada = true; };
  }, [sesionActiva, sesionActual]);
  async function sincronizarRegistrosPendientes() {
    setSincronizandoOffline(true);
    try {
      const previos = await (await obtenerColaSesion(sesionActiva)).listar();
      if (sesionActual.current !== sesionActiva) return;
      setPendientesOffline(previos.filter((item) => !item.sincronizado).length);
      const resultado = await sincronizarPendientes(sesionActiva, () => sesionActual.current === sesionActiva);
      const registros = await (await obtenerColaSesion(sesionActiva)).listar();
      if (sesionActual.current !== sesionActiva) return;
      setPendientesOffline(registros.filter((item) => !item.sincronizado).length);

      if (resultado.ok) {
        Alert.alert('Sincronizacion', `Registros sincronizados: ${resultado.sincronizados}`);
      } else {
        Alert.alert('Sincronizacion', resultado.error || `Quedan pendientes: ${resultado.restantes}`);
      }
    } catch (error) {
      if (sesionActual.current === sesionActiva) Alert.alert('Sincronizacion', error instanceof Error ? error.message : 'Los pendientes se conservaron localmente.');
    } finally {
      if (sesionActual.current === sesionActiva) setSincronizandoOffline(false);
    }
  }

  return { pendientesAnteriores, pendientesOffline, sincronizandoOffline, sincronizarRegistrosPendientes };
}
