/**
 * src/utils/maps.ts (mobile)
 * Utility to verify whether Google Maps is properly configured and safe to render natively.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Returns true if Google Maps API key is configured and valid for native map rendering.
 * On Android, react-native-maps crashes natively if the Google Maps API key is missing
 * or invalid in the standalone APK build. On iOS, native Apple Maps is used by default.
 */
export function isGoogleMapsKeyAvailable(): boolean {
  if (Platform.OS !== 'android') {
    // iOS uses Apple Maps natively by default in react-native-maps
    return true;
  }

  const apiKey =
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
    (Constants.manifest as any)?.android?.config?.googleMaps?.apiKey ||
    (Constants.manifest2 as any)?.extra?.expoClient?.android?.config?.googleMaps?.apiKey ||
    Constants.expoConfig?.extra?.googleMapsApiKey ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  const trimmed = apiKey.trim();
  if (
    trimmed === '' ||
    trimmed === 'GOOGLE_MAPS_API_KEY' ||
    trimmed === 'YOUR_API_KEY' ||
    trimmed === 'your_api_key' ||
    trimmed.startsWith('AIzaSyDummy')
  ) {
    return false;
  }

  return true;
}
