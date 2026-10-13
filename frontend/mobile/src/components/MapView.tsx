/**
 * src/components/MapView.tsx (mobile)
 * Reusable map view using react-native-maps with robust fallback if native maps
 * fails or is unavailable in the environment.
 */

import React, { Component, ReactNode, useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../utils/colors';

// Try to require react-native-maps lazily to avoid top-level crashes
let RNMaps: any = null;
try {
  RNMaps = require('react-native-maps');
} catch (e) {
  RNMaps = null;
}

export interface MapPoint {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface MapViewProps {
  pickupMarker?: MapPoint;
  borrowerMarker?: MapPoint;
  height?: number;
  address?: string;
  showNavigateButton?: boolean;
  style?: ViewStyle;
}

export async function openMapNavigation(latitude: number, longitude: number, label?: string) {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const nativeScheme = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(label || 'Pickup')}&ll=${latitude},${longitude}`,
    android: `geo:0,0?q=${latitude},${longitude}(${encodeURIComponent(label || 'Pickup')})`,
    default: googleMapsUrl,
  });

  try {
    await Linking.openURL(googleMapsUrl);
    return;
  } catch {
    // Try native scheme as fallback
  }

  try {
    if (nativeScheme) {
      await Linking.openURL(nativeScheme);
    }
  } catch (err) {
    console.warn('Could not open map navigation:', err);
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.warn('[MapView] Render error caught by boundary:', error.message, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

function FallbackView({
  pickupMarker,
  address,
  height = 200,
  showNavigateButton = true,
}: {
  pickupMarker?: MapPoint;
  address?: string;
  height?: number;
  showNavigateButton?: boolean;
}) {
  return (
    <View style={[styles.fallbackContainer, { height }]}>
      <View style={styles.fallbackHeader}>
        <Text style={styles.fallbackIcon}>📍</Text>
        <View style={styles.fallbackInfo}>
          <Text style={styles.fallbackTitle}>Pickup Point</Text>
          {address ? (
            <Text style={styles.fallbackAddress} numberOfLines={2}>
              {address}
            </Text>
          ) : null}
          {pickupMarker ? (
            <Text style={styles.fallbackCoords}>
              {pickupMarker.latitude.toFixed(4)}, {pickupMarker.longitude.toFixed(4)}
            </Text>
          ) : null}
        </View>
      </View>

      {showNavigateButton && pickupMarker ? (
        <TouchableOpacity
          style={styles.navigateBtn}
          onPress={() => openMapNavigation(pickupMarker.latitude, pickupMarker.longitude, pickupMarker.label)}
          activeOpacity={0.8}
        >
          <Text style={styles.navigateBtnText}>🧭 Navigate in Maps</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function InternalMapView({
  pickupMarker,
  borrowerMarker,
  height = 200,
  address,
  showNavigateButton = true,
  style,
}: MapViewProps) {
  const mapRef = useRef<any>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (mapRef.current && pickupMarker && borrowerMarker) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: pickupMarker.latitude, longitude: pickupMarker.longitude },
          { latitude: borrowerMarker.latitude, longitude: borrowerMarker.longitude },
        ],
        {
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
          animated: true,
        },
      );
    }
  }, [pickupMarker?.latitude, pickupMarker?.longitude, borrowerMarker?.latitude, borrowerMarker?.longitude]);

  if (mapFailed || !RNMaps || !RNMaps.default) {
    return (
      <FallbackView
        pickupMarker={pickupMarker}
        address={address}
        height={height}
        showNavigateButton={showNavigateButton}
      />
    );
  }

  const NativeMap = RNMaps.default;
  const Marker = RNMaps.Marker;

  const centerLat = pickupMarker?.latitude ?? 37.7749;
  const centerLng = pickupMarker?.longitude ?? -122.4194;

  return (
    <View style={[styles.mapContainer, { height }, style]}>
      <NativeMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onError={() => setMapFailed(true)}
      >
        {pickupMarker && (
          <Marker
            coordinate={{
              latitude: pickupMarker.latitude,
              longitude: pickupMarker.longitude,
            }}
            title={pickupMarker.label || 'Pickup Location'}
            pinColor="#16a34a"
          />
        )}

        {borrowerMarker && (
          <Marker
            coordinate={{
              latitude: borrowerMarker.latitude,
              longitude: borrowerMarker.longitude,
            }}
            title={borrowerMarker.label || "Borrower's Location"}
            pinColor="#2563eb"
          />
        )}
      </NativeMap>

      {showNavigateButton && pickupMarker && (
        <TouchableOpacity
          style={styles.floatingNavigateBtn}
          onPress={() => openMapNavigation(pickupMarker.latitude, pickupMarker.longitude, pickupMarker.label)}
          activeOpacity={0.85}
        >
          <Text style={styles.floatingNavigateBtnText}>🧭 Navigate</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function MapView(props: MapViewProps) {
  return (
    <MapErrorBoundary
      fallback={() => (
        <FallbackView
          pickupMarker={props.pickupMarker}
          address={props.address}
          height={props.height}
          showNavigateButton={props.showNavigateButton}
        />
      )}
    >
      <InternalMapView {...props} />
    </MapErrorBoundary>
  );
}

export default MapView;

const styles = StyleSheet.create({
  mapContainer: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    position: 'relative',
    backgroundColor: colors.neutral[100],
  },
  fallbackContainer: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fallbackIcon: {
    fontSize: 24,
  },
  fallbackInfo: {
    flex: 1,
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  fallbackAddress: {
    fontSize: 13,
    color: colors.neutral[700],
    marginTop: 2,
  },
  fallbackCoords: {
    fontSize: 11,
    color: colors.neutral[400],
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  navigateBtn: {
    backgroundColor: colors.primary[600],
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  navigateBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  floatingNavigateBtn: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.lg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  floatingNavigateBtnText: {
    color: colors.neutral[800],
    fontSize: 12,
    fontWeight: '700',
  },
});
