import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, ScrollView } from 'react-native';
import {
  guardarRegistroLocal,
  leerRegistrosLocales,
  RegistroLocal,
} from './services/almacenamientoLocal';
import { sincronizarPendientes } from './services/sincronizacion';

export default function App() {
  const [registros, setRegistros] = useState<RegistroLocal[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('Listo para operar en modo offline.');

  const cargarRegistros = async () => {
    const datos = await leerRegistrosLocales();
    setRegistros(datos);
  };

  useEffect(() => {
    cargarRegistros();
  }, []);

  const crearRegistroOffline = async () => {
    const nuevo: RegistroLocal = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tipo: 'registro-campo',
      payload: {
        lote: `Lote ${registros.length + 1}`,
        estado: 'pendiente',
      },
      creadoEn: new Date().toISOString(),
      sincronizado: false,
    };

    await guardarRegistroLocal(nuevo);
    setMensaje('Registro guardado localmente.');
    cargarRegistros();
  };

  const ejecutarSincronizacion = async () => {
    setCargando(true);
    const resultado = await sincronizarPendientes();

    if (resultado.ok) {
      setMensaje(`Sincronizados ${resultado.sincronizados} registros.`);
    } else {
      Alert.alert('Sincronización', resultado.error || 'Error al sincronizar');
      setMensaje('No se pudo sincronizar. Se conservaron los registros locales.');
    }

    await cargarRegistros();
    setCargando(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Agro App Offline</Text>
      <Text style={styles.subtitle}>{mensaje}</Text>

      <View style={styles.botonera}>
        <Button title="Guardar registro offline" onPress={crearRegistroOffline} disabled={cargando} />
      </View>
      <View style={styles.botonera}>
        <Button title="Sincronizar pendientes" onPress={ejecutarSincronizacion} disabled={cargando || registros.length === 0} />
      </View>

      <View style={styles.cajaResumen}>
        <Text style={styles.resumenTitulo}>Registros locales</Text>
        {registros.length === 0 ? (
          <Text style={styles.resumenTexto}>No hay registros pendientes.</Text>
        ) : (
          registros.map((registro) => (
            <View key={registro.id} style={styles.registroCard}>
              <Text style={styles.registroTipo}>{registro.tipo}</Text>
              <Text style={styles.registroTexto}>{JSON.stringify(registro.payload)}</Text>
              <Text style={styles.registroEstado}>
                Estado: {registro.sincronizado ? 'sincronizado' : 'pendiente'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f4f8f3',
    padding: 24,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#14532d',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 24,
  },
  botonera: {
    marginBottom: 14,
  },
  cajaResumen: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resumenTitulo: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#134e4a',
  },
  resumenTexto: {
    color: '#475569',
  },
  registroCard: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  registroTipo: {
    fontWeight: '700',
    color: '#065f46',
  },
  registroTexto: {
    marginTop: 6,
    color: '#334155',
  },
  registroEstado: {
    marginTop: 8,
    fontSize: 13,
    color: '#1d4ed8',
  },
});
