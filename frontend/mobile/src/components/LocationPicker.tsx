/**
 * src/components/LocationPicker.tsx (mobile)
 * Reusable location picker with "Use my current location", map pin selection,
 * address editing, permission handling, and robust fallback when maps are unavailable.
 */

import React, { Component, ReactNode, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { colors, radius, spacing } from '../utils/colors';
import { isGoogleMapsKeyAvailable } from '../utils/maps';

// Try to require react-native-maps lazily to avoid top-level crashes
let RNMaps: any = null;
try {
  RNMaps = require('react-native-maps');
} catch (e) {
  RNMaps = null;
}

export interface LocationValue {
  latitude: number;
  longitude: number;
  address: string;
}

export interface LocationPickerProps {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
  height?: number;
  error?: string;
}

export interface LocationPickerErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

export interface LocationPickerErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class LocationPickerErrorBoundary extends Component<
  LocationPickerErrorBoundaryProps,
  LocationPickerErrorBoundaryState
> {
  state: LocationPickerErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): LocationPickerErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.warn('[LocationPicker] Render error caught by boundary:', error?.message, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

function InternalLocationPicker({
  value,
  onChange,
  height = 180,
  error,
}: LocationPickerProps) {
  const mapRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);
  const [mapError, setMapError] = useState(false);

  const hasKey = isGoogleMapsKeyAvailable();
  const NativeMap = RNMaps?.default;
  const Marker = RNMaps?.Marker;
  const canRenderMap = hasKey && !mapError && Boolean(NativeMap) && Boolean(Marker);

  const lat =
    typeof value?.latitude === 'number' && !isNaN(value.latitude)
      ? value.latitude
      : 13.0827;
  const lng =
    typeof value?.longitude === 'number' && !isNaN(value.longitude)
      ? value.longitude
      : 80.2707;
  const address = typeof value?.address === 'string' ? value.address : '';

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    setGeoError(null);
    setShowSettingsBtn(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGeoError('Location permission was denied. Please enable location permissions in settings.');
        setShowSettingsBtn(true);
        setLocating(false);
        return;
      }

      const hasServices = await Location.hasServicesEnabledAsync();
      if (!hasServices) {
        setGeoError('GPS / location services are disabled on this device. Please turn them on.');
        setShowSettingsBtn(true);
        setLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const curLat = Number(position.coords.latitude.toFixed(6));
      const curLng = Number(position.coords.longitude.toFixed(6));

      // Attempt reverse geocoding
      let addressStr = address;
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: curLat,
          longitude: curLng,
        });
        if (reverseResults && reverseResults.length > 0) {
          const item = reverseResults[0];
          const parts = [
            item.name || item.street,
            item.district,
            item.city || item.subregion,
            item.region,
          ].filter(Boolean);
          if (parts.length > 0) {
            addressStr = parts.join(', ');
          }
        }
      } catch {
        // Fallback to existing or coordinates
      }

      onChange({
        latitude: curLat,
        longitude: curLng,
        address: addressStr || `${curLat}, ${curLng}`,
      });

      // Animate map if mounted and available
      if (mapRef.current && canRenderMap) {
        try {
          mapRef.current.animateToRegion(
            {
              latitude: curLat,
              longitude: curLng,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            },
            500,
          );
        } catch {
          // Ignore animation failure
        }
      }
    } catch (err: any) {
      setGeoError(err?.message || 'Could not retrieve your current location.');
      setShowSettingsBtn(true);
    } finally {
      setLocating(false);
    }
  };

  const handleMapPress = (e: any) => {
    const coords = e.nativeEvent?.coordinate;
    if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
      onChange({
        latitude: Number(coords.latitude.toFixed(6)),
        longitude: Number(coords.longitude.toFixed(6)),
        address,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header action */}
      <View style={styles.headerRow}>
        <Text style={styles.label}>
          Pickup Address & Location <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.gpsBtn}
          onPress={handleUseCurrentLocation}
          disabled={locating}
          activeOpacity={0.8}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary[600]} />
          ) : (
            <>
              <Text style={styles.gpsBtnIcon}>🎯</Text>
              <Text style={styles.gpsBtnText}>Use my location</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Geo Error / Settings Alert */}
      {geoError ? (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>{geoError}</Text>
          {showSettingsBtn && (
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}
            >
              <Text style={styles.settingsBtnText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Address text input */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={address}
          onChangeText={(text) =>
            onChange({
              latitude: lat,
              longitude: lng,
              address: text,
            })
          }
          placeholder="e.g. Anna Nagar, Chennai (or landmark)"
          placeholderTextColor={colors.neutral[400]}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Map display or fallback */}
      {canRenderMap ? (
        <View style={[styles.mapContainer, { height }]}>
          <NativeMap
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            onPress={handleMapPress}
            onError={() => setMapError(true)}
          >
            <Marker
              coordinate={{ latitude: lat, longitude: lng }}
              draggable
              onDragEnd={handleMapPress}
              pinColor="#16a34a"
              title="Pickup Point"
            />
          </NativeMap>
          <View style={styles.mapTip}>
            <Text style={styles.mapTipText}>Tap map or drag pin to adjust</Text>
          </View>
        </View>
      ) : (
        <View style={styles.fallbackContainer}>
          <View style={styles.fallbackHeaderRow}>
            <Text style={styles.fallbackTitle}>📍 Selected Coordinates</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {!hasKey ? 'Map key missing' : 'Map unavailable'}
              </Text>
            </View>
          </View>

          <View style={styles.coordsRow}>
            <View style={styles.coordField}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <TextInput
                style={styles.coordInput}
                value={String(lat)}
                onChangeText={(text) => {
                  const val = parseFloat(text);
                  onChange({
                    latitude: isNaN(val) ? lat : val,
                    longitude: lng,
                    address,
                  });
                }}
                keyboardType="numeric"
                placeholder="13.0827"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
            <View style={styles.coordField}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <TextInput
                style={styles.coordInput}
                value={String(lng)}
                onChangeText={(text) => {
                  const val = parseFloat(text);
                  onChange({
                    latitude: lat,
                    longitude: isNaN(val) ? lng : val,
                    address,
                  });
                }}
                keyboardType="numeric"
                placeholder="80.2707"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
          </View>

          <Text style={styles.fallbackNote}>
            Enter your pickup address above or tap "Use my location" to autofill your GPS position.
          </Text>
        </View>
      )}
    </View>
  );
}

export function LocationPicker(props: LocationPickerProps) {
  const lat =
    typeof props.value?.latitude === 'number' && !isNaN(props.value.latitude)
      ? props.value.latitude
      : 13.0827;
  const lng =
    typeof props.value?.longitude === 'number' && !isNaN(props.value.longitude)
      ? props.value.longitude
      : 80.2707;
  const address = typeof props.value?.address === 'string' ? props.value.address : '';

  return (
    <LocationPickerErrorBoundary
      fallback={() => (
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.label}>
              Pickup Address & Location <Text style={styles.required}>*</Text>
            </Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, props.error ? styles.inputError : null]}
              value={address}
              onChangeText={(text) =>
                props.onChange({
                  latitude: lat,
                  longitude: lng,
                  address: text,
                })
              }
              placeholder="e.g. Anna Nagar, Chennai"
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
          {props.error ? <Text style={styles.errorText}>{props.error}</Text> : null}
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackTitle}>📍 Coordinates</Text>
            <Text style={styles.fallbackCoords}>
              Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
            </Text>
            <Text style={styles.fallbackNote}>
              Location map is temporarily unavailable. Address text will be used for pickup.
            </Text>
          </View>
        </View>
      )}
    >
      <InternalLocationPicker {...props} />
    </LocationPickerErrorBoundary>
  );
}

export default LocationPicker;

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  required: {
    color: colors.error,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gpsBtnIcon: {
    fontSize: 12,
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[700],
  },
  alertBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
  },
  alertText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  settingsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[600],
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  settingsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  inputWrapper: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: colors.neutral[900],
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: -4,
  },
  mapContainer: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    position: 'relative',
    backgroundColor: colors.neutral[100],
  },
  mapTip: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  mapTipText: {
    fontSize: 11,
    color: colors.neutral[600],
    fontWeight: '500',
  },
  fallbackContainer: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    gap: spacing.sm,
  },
  fallbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fallbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  badge: {
    backgroundColor: colors.neutral[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    color: colors.neutral[700],
    fontWeight: '600',
  },
  coordsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  coordField: {
    flex: 1,
    gap: 4,
  },
  coordLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  coordInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 13,
    color: colors.neutral[800],
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  fallbackCoords: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    color: colors.neutral[700],
  },
  fallbackNote: {
    fontSize: 11,
    color: colors.neutral[500],
    lineHeight: 15,
  },
});
