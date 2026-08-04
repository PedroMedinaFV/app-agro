import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { loginUsuario, registrarUsuario, obtenerUsuarios } from '../services/api';

export function PantallaInicio() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [modoRegistro, setModoRegistro] = useState(false);
  const [logueado, setLogueado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [token, setToken] = useState('');
  const [usuarios, setUsuarios] = useState<Array<{ id: string; email: string; nombre?: string | null }>>([]);

  const cargarUsuarios = async (jwt: string) => {
    const datos = await obtenerUsuarios(jwt);
    setUsuarios(datos);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validación', 'Completá correo y contraseña');
      return;
    }

    setCargando(true);
    try {
      const data = await loginUsuario(email, password);
      setToken(data.token);
      setMensaje(`Bienvenido ${data.usuario?.nombre || data.usuario?.email}`);
      setLogueado(true);
      await cargarUsuarios(data.token);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error inesperado');
    } finally {
      setCargando(false);
    }
  };

  const handleRegistro = async () => {
    if (!email || !password || !nombre) {
      Alert.alert('Validación', 'Completá nombre, correo y contraseña');
      return;
    }

    setCargando(true);
    try {
      const data = await registrarUsuario(email, nombre, password);
      setToken(data.token);
      setMensaje(`Cuenta creada para ${data.usuario?.email}`);
      setModoRegistro(false);
      setLogueado(true);
      await cargarUsuarios(data.token);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error inesperado');
    } finally {
      setCargando(false);
    }
  };

  if (logueado) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Panel de control</Text>
        <Text style={styles.message}>{mensaje}</Text>
        <Text style={styles.subtitle}>Token guardado para llamadas protegidas.</Text>
        <Text style={styles.subtitle}>Usuarios cargados desde el backend:</Text>
        {usuarios.map((usuario) => (
          <Text key={usuario.id} style={styles.userItem}>{usuario.nombre || usuario.email}</Text>
        ))}
        <View style={styles.buttonSpacing}>
          <Button title="Cerrar sesión" onPress={() => {
            setLogueado(false);
            setToken('');
            setMensaje('');
            setUsuarios([]);
          }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{modoRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</Text>

      {modoRegistro && (
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          value={nombre}
          onChangeText={setNombre}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Correo"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {cargando ? <ActivityIndicator size="large" style={styles.spinner} /> : (
        <Button title={modoRegistro ? 'Registrar' : 'Entrar'} onPress={modoRegistro ? handleRegistro : handleLogin} />
      )}

      <View style={styles.linkContainer}>
        <Text style={styles.linkText} onPress={() => setModoRegistro(!modoRegistro)}>
          {modoRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f7fb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  subtitle: {
    marginTop: 12,
    color: '#4b5563',
  },
  linkContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
  },
  userItem: {
    marginTop: 6,
    color: '#374151',
  },
  buttonSpacing: {
    marginTop: 16,
  },
  spinner: {
    marginVertical: 12,
  },
});
