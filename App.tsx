import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import GrabScreen from './src/screens/GrabScreen';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#e63946" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#e63946' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Dania 抢票' }}
        />
        <Stack.Screen
          name="Config"
          component={ConfigScreen}
          options={{ title: '抢票配置' }}
        />
        <Stack.Screen
          name="Grab"
          component={GrabScreen}
          options={{ title: '自动抢票' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
