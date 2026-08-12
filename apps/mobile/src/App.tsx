import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { obtenerPermisosRol, RolUsuario, SesionUsuario } from '@agro/tipos';

export default function App() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [email, setEmail] = useState('demo@agroapp.local');
  const [rol, setRol] = useState<RolUsuario>('usuario');

  function entrarModoDemo() {
    // Mobile mantiene el mismo contrato de sesion que web/backend mientras no haya API disponible.
    setSesion({
      token: 'demo-mobile-token',
      usuario: { id: 'demo-mobile', email, nombre: 'Usuario Demo', rol },
      origen: 'demo',
      permisos: obtenerPermisosRol(rol),
    });
  }

  if (sesion) {
    return (
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>Panel mobile</Text>
          <Text style={styles.subtitle}>Sesion demo activa para {sesion.usuario.email}</Text>
          <Text style={styles.note}>Rol: {sesion.usuario.rol}</Text>
          <Button title="Cerrar sesion" onPress={() => setSesion(null)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Iniciar sesion</Text>
        <Text style={styles.subtitle}>Agro App - mobile demo</Text>
        <TextInput style={styles.input} placeholder="Correo" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Contrasena" secureTextEntry />
        <View style={styles.buttonSpacing}>
          <Button title={`Rol: ${rol}`} onPress={() => setRol(rol === 'admin' ? 'usuario' : 'admin')} />
        </View>
        <View style={styles.buttonSpacing}>
          <Button title="Entrar en modo demo" onPress={entrarModoDemo} />
        </View>
        <View style={styles.buttonSpacing}>
          <Button title="Continuar con Microsoft" onPress={() => {}} />
        </View>
        <Text style={styles.note}>Pantalla local de prueba. La autenticacion real se conecta despues con backend y Microsoft.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 720,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fb',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    color: '#4b5563',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  buttonSpacing: {
    marginTop: 12,
  },
  note: {
    marginTop: 18,
    color: '#6b7280',
    fontSize: 13,
  },
});
