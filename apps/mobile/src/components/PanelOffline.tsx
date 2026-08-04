import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { leerRegistrosLocales } from '../services/almacenamientoLocal';

export function PanelOffline() {
  const [cantidad, setCantidad] = useState(0);

  useEffect(() => {
    async function cargarCantidad() {
      const registros = await leerRegistrosLocales();
      setCantidad(registros.length);
    }
    cargarCantidad();
  }, []);

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
