/**
 * src/services/push.ts (mobile)
 * Push notification wrapper module.
 * 
 * IMPORTANT:
 * Remote push notifications functionality was removed from Expo Go starting in SDK 53.
 * Importing or initializing expo-notifications at top-level crashes Expo Go on Android.
 * This wrapper checks if running in Expo Go (Constants.executionEnvironment === 'storeClient').
 * When in Expo Go, all functions return immediately as no-ops.
 * expo-notifications is ONLY loaded lazily via require() inside functions when NOT in Expo Go.
 */

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { notificationsService } from './notifications.service';

const PUSH_TOKEN_STORAGE_KEY = 'rentcart_expo_push_token';

/**
 * Check if the app is currently running inside Expo Go.
 */
export function isExpoGo(): boolean {
  const env = (Constants.executionEnvironment as unknown as string) || '';
  return env === 'storeClient';
}

/**
 * Setup notification channel on Android.
 * No-op in Expo Go.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (isExpoGo() || Platform.OS !== 'android') {
    return;
  }

  try {
    const Notifications = require('expo-notifications');
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16a34a',
    });
  } catch (err) {
    // Non-blocking best effort
  }
}

/**
 * Configure foreground notification behavior.
 * No-op in Expo Go.
 */
export function setupForegroundHandler(): void {
  if (isExpoGo()) {
    return;
  }

  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      }),
    });
  } catch (err) {
    // Non-blocking best effort
  }
}

/**
 * Setup notification response listener (taps on notification).
 * No-op in Expo Go.
 */
export function setupNotificationResponseListener(
  onNotificationResponse: (rentalId: string) => void,
): () => void {
  if (isExpoGo()) {
    return () => {};
  }

  try {
    const Notifications = require('expo-notifications');
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const rentalId = response?.notification?.request?.content?.data?.rentalId;
        if (typeof rentalId === 'string' && rentalId) {
          onNotificationResponse(rentalId);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  } catch (err) {
    return () => {};
  }
}

/**
 * Register push token with the backend.
 * No-op in Expo Go.
 * Wrapped in try/catch so push errors never crash the app or block login.
 */
export async function registerForPush(): Promise<string | null> {
  if (isExpoGo()) {
    return null;
  }

  try {
    const Device = require('expo-device');
    if (!Device.isDevice) {
      return null;
    }

    await setupNotificationChannels();

    const Notifications = require('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data;

    if (token) {
      await SecureStore.setItemAsync(PUSH_TOKEN_STORAGE_KEY, token);
      await notificationsService.registerPushToken(token, Platform.OS);
      return token;
    }

    return null;
  } catch (err) {
    // Non-blocking; never throw to caller
    return null;
  }
}

/**
 * Remove push token on logout.
 * No-op in Expo Go.
 */
export async function unregisterPush(): Promise<void> {
  if (isExpoGo()) {
    return;
  }

  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_STORAGE_KEY);
    if (token) {
      await notificationsService.unregisterPushToken(token);
      await SecureStore.deleteItemAsync(PUSH_TOKEN_STORAGE_KEY);
    } else {
      await notificationsService.unregisterPushToken();
    }
  } catch (err) {
    // Non-blocking
  }
}
