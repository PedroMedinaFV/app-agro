import { Button, Text, TextInput, View } from 'react-native';
import { styles } from '../styles/mobile';
import type { useSesionMobile } from '../hooks/useSesionMobile';

type Props = Pick<ReturnType<typeof useSesionMobile>, 'email' | 'password' | 'setEmail' | 'setPassword' | 'iniciarSesion'>;
export function PantallaLogin({ email, password, setEmail, setPassword, iniciarSesion }: Props) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Iniciar sesion</Text>
        <Text style={styles.subtitle}>Agro App mobile</Text>
        <TextInput style={styles.input} placeholder="Correo" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Contrasena" secureTextEntry value={password} onChangeText={setPassword} />
        <View style={styles.buttonSpacing}>
          <Button title="Ingresar" onPress={iniciarSesion} />
        </View>
        <View style={styles.buttonSpacing}>
          <Button title="Continuar con Microsoft" onPress={() => {}} />
        </View>
        <Text style={styles.note}>Ingresa con un usuario creado por el administrador.</Text>
      </View>
    </View>
  );
}
