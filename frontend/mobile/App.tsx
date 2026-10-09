/**
 * App.tsx (mobile)
 * Root entry component for RentCart mobile application.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';

function RootContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return user ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <NavigationContainer>
        <RootContent />
      </NavigationContainer>
    </AuthProvider>
  );
}
