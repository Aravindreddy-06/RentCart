/**
 * App.tsx (mobile)
 * Root entry component for RentCart mobile application.
 * Configures push notifications listener and foreground handler via the guarded push service.
 */

import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import {
  setupForegroundHandler,
  setupNotificationChannels,
  setupNotificationResponseListener,
} from './src/services/push';
import type { AppStackParamList } from './src/navigation/types';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

function RootContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return user ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  useEffect(() => {
    // Setup foreground behavior and channel (guarded, no-op in Expo Go)
    setupForegroundHandler();
    void setupNotificationChannels().catch(() => {});

    // Listen for notification taps (guarded, no-op in Expo Go)
    const unsubscribe = setupNotificationResponseListener((rentalId) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('RentalDetail', { rentalId });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <NavigationContainer ref={navigationRef}>
        <RootContent />
      </NavigationContainer>
    </AuthProvider>
  );
}
