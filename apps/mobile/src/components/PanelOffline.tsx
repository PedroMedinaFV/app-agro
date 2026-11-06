import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SesionUsuario } from '@agro/tipos';
import { obtenerColaSesion } from '../services/almacenamientoLocal';

export function PanelOffline({ sesion }: { sesion: SesionUsuario }) {
  const [cantidad, setCantidad] = useState(0);

  useEffect(() => {
    let cancelada = false;
    async function cargarCantidad() {
      const registros = await (await obtenerColaSesion(sesion)).listar();
      if (!cancelada) setCantidad(registros.filter((registro) => !registro.sincronizado).length);
    }
    setCantidad(0);
    void cargarCantidad().catch(() => { if (!cancelada) setCantidad(0); });
    return () => { cancelada = true; };
  }, [sesion]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Modo offline</Text>
      <Text style={styles.body}>Registros guardados localmente: {cantidad}</Text>
      <Text style={styles.body}>Listo para sincronizar cuando vuelva la conexión.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  body: {
    marginTop: 6,
    color: '#374151',
  },
});
