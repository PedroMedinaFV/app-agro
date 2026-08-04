import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PantallaInicio } from '../screens/PantallaInicio';

const Stack = createNativeStackNavigator();

export function NavegadorApp() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Inicio" component={PantallaInicio} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
