import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import AsyncStorage from '@react-native-async-storage/async-storage';
enableScreens();

import { AuthProvider, useAuth } from './src/services/AuthContext';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MapScreen from './src/screens/MapScreen';
import CourtDetailScreen from './src/screens/CourtDetailScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerStyle: { backgroundColor: '#1c1c1e' },
      headerTintColor: '#F97316',
      tabBarStyle: { backgroundColor: '#1c1c1e', borderTopColor: '#333' },
      tabBarActiveTintColor: '#F97316',
      tabBarInactiveTintColor: '#555',
    }}>
      <Tab.Screen name="Mapa" component={MapScreen}
        options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺️</Text>, title: 'Quadras' }} />
      <Tab.Screen name="Chats" component={ChatListScreen}
        options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>💬</Text>, title: 'Chats' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen}
        options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((val) => {
      setShowOnboarding(val !== 'true');
    });
  }, []);

  if (isLoading || showOnboarding === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
        <ActivityIndicator color="#F97316" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: '#1c1c1e' },
      headerTintColor: '#F97316',
      contentStyle: { backgroundColor: '#111' },
    }}>
      {showOnboarding && !user ? (
        <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
          {(props) => (
            <OnboardingScreen
              {...props}
              navigation={{
                ...props.navigation,
                replace: (screen: string) => {
                  AsyncStorage.setItem('onboarding_done', 'true');
                  setShowOnboarding(false);
                },
              }}
            />
          )}
        </Stack.Screen>
      ) : user ? (
        <>
          <Stack.Screen name="Home" component={AppTabs} options={{ headerShown: false }} />
          <Stack.Screen name="CourtDetail" component={CourtDetailScreen} options={{ title: 'Quadra' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
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
