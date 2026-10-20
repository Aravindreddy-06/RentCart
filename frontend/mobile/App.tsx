/**
 * App.tsx (mobile)
 * Root entry component for RentCart mobile application.
 * Configures push notifications listener and foreground handler via the guarded push service.
 */

import React, { useEffect } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { colors } from './src/utils/colors';
import {
  setupForegroundHandler,
  setupNotificationChannels,
  setupNotificationResponseListener,
} from './src/services/push';
import type { AppStackParamList } from './src/navigation/types';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

function RootNavigation() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });
  const { user, loading } = useAuth();
  const { isDark, themeColors } = useTheme();

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary[500],
          background: themeColors.background,
          card: themeColors.surface,
          text: themeColors.text,
          border: themeColors.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary[500],
          background: themeColors.background,
          card: themeColors.surface,
          text: themeColors.text,
          border: themeColors.border,
        },
      };

  // Keep Splash screen visible until both icon fonts are loaded and auth state is ready
  if ((!fontsLoaded && !fontError) || loading) {
    return <SplashScreen />;
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={themeColors.surface}
      />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {user ? <AppNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </>
  );
}

export default function App() {
  useEffect(() => {
    // Setup foreground behavior and channel (guarded, no-op in Expo Go)
    setupForegroundHandler();
    void setupNotificationChannels().catch(() => {});

    // Listen for notification taps (guarded, no-op in Expo Go)
    const unsubscribe = setupNotificationResponseListener((data) => {
      if (navigationRef.isReady()) {
        if (data.type === 'NEW_MESSAGE' && data.rentalId) {
          navigationRef.navigate('Chat', { rentalId: data.rentalId });
        } else if (data.type === 'REVIEW_RECEIVED' && data.targetUserId) {
          navigationRef.navigate('PublicProfile', { userId: data.targetUserId });
        } else if (
          (data.type === 'HANDOVER_PIN_READY' || data.type === 'HANDOVER_CONFIRMED') &&
          data.rentalId
        ) {
          navigationRef.navigate('RentalDetail', { rentalId: data.rentalId });
        } else if (data.rentalId) {
          navigationRef.navigate('RentalDetail', { rentalId: data.rentalId });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <RootNavigation />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

