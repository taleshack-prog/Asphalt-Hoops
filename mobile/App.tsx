import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/services/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MapScreen from './src/screens/MapScreen';
import CourtDetailScreen from './src/screens/CourtDetailScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1c1c1e' },
        headerTintColor: '#F97316',
        tabBarStyle: { backgroundColor: '#1c1c1e', borderTopColor: '#333' },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tab.Screen
        name="Mapa"
        component={MapScreen}
        options={{ tabBarIcon: () => <Text>🗺</Text>, title: 'Quadras' }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ tabBarIcon: () => <Text>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#111' }}>
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1c1c1e' },
        headerTintColor: '#F97316',
        contentStyle: { backgroundColor: '#111' },
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Home" component={AppTabs} options={{ headerShown: false }} />
          <Stack.Screen name="CourtDetail" component={CourtDetailScreen} options={{ title: 'Quadra' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat da Partida' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
