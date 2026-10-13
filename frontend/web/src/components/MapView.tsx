/**
 * src/components/MapView.tsx (web)
 * Reusable Leaflet map component with OpenStreetMap tiles.
 * Supports primary marker, optional second marker, and auto-fitting bounds.
 */

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet icons in Vite bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface MapMarker {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  type?: 'pickup' | 'borrower' | 'user' | 'default';
}

export interface MapViewProps {
  marker?: MapMarker;
  secondMarker?: MapMarker;
  pickupMarker?: { latitude: number; longitude: number; label?: string };
  borrowerMarker?: { latitude: number; longitude: number; label?: string };
  center?: [number, number];
  zoom?: number;
  height?: string | number;
  className?: string;
  autoFitBounds?: boolean;
}

function createCustomIcon(type: 'pickup' | 'borrower' | 'user' | 'default' = 'default') {
  if (type === 'pickup') {
    return L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div style="
          background: #16a34a;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.45);
          border: 2px solid white;
        ">
          <span style="transform: rotate(45deg); font-size: 16px;">📍</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  }

  if (type === 'borrower') {
    return L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div style="
          background: #2563eb;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
          border: 2px solid white;
          animation: bounce 1s infinite alternate;
        ">
          <span style="transform: rotate(45deg); font-size: 16px;">🚗</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  }

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div style="
        background: #4f46e5;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4);
        border: 2px solid white;
      ">
        <span style="transform: rotate(45deg); font-size: 14px;">📍</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

function BoundsFitter({
  marker,
  secondMarker,
}: {
  marker?: MapMarker;
  secondMarker?: MapMarker;
}) {
  const map = useMap();

  useEffect(() => {
    if (marker && secondMarker) {
      const bounds = L.latLngBounds([
        [marker.lat, marker.lng],
        [secondMarker.lat, secondMarker.lng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (marker) {
      map.setView([marker.lat, marker.lng], map.getZoom() || 14);
    }
  }, [map, marker, secondMarker]);

  return null;
}

export function MapView({
  marker,
  secondMarker,
  pickupMarker,
  borrowerMarker,
  center,
  zoom = 13,
  height = '320px',
  className = '',
  autoFitBounds = true,
}: MapViewProps) {
  const activeMarker = useMemo(() => {
    if (marker) return marker;
    if (pickupMarker) {
      return {
        lat: pickupMarker.latitude,
        lng: pickupMarker.longitude,
        title: pickupMarker.label || 'Pickup Point',
        type: 'pickup' as const,
      };
    }
    return undefined;
  }, [marker, pickupMarker]);

  const activeSecondMarker = useMemo(() => {
    if (secondMarker) return secondMarker;
    if (borrowerMarker) {
      return {
        lat: borrowerMarker.latitude,
        lng: borrowerMarker.longitude,
        title: borrowerMarker.label || "Borrower's Location",
        type: 'borrower' as const,
      };
    }
    return undefined;
  }, [secondMarker, borrowerMarker]);

  const initialCenter: [number, number] = useMemo(() => {
    if (activeMarker) return [activeMarker.lat, activeMarker.lng];
    if (activeSecondMarker) return [activeSecondMarker.lat, activeSecondMarker.lng];
    if (center) return center;
    return [37.7749, -122.4194]; // Default San Francisco
  }, [activeMarker, activeSecondMarker, center]);

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  const marker1Icon = useMemo(() => createCustomIcon(activeMarker?.type || 'pickup'), [activeMarker?.type]);
  const marker2Icon = useMemo(
    () => createCustomIcon(activeSecondMarker?.type || 'borrower'),
    [activeSecondMarker?.type],
  );

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-sm border border-neutral-200 z-0 ${className}`}
      style={{ height: heightStyle, width: '100%' }}
    >
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {activeMarker && (
          <Marker position={[activeMarker.lat, activeMarker.lng]} icon={marker1Icon}>
            {(activeMarker.title || activeMarker.description) && (
              <Popup>
                <div className="text-sm">
                  {activeMarker.title && <p className="font-semibold text-neutral-900">{activeMarker.title}</p>}
                  {activeMarker.description && <p className="text-neutral-600 text-xs mt-1">{activeMarker.description}</p>}
                </div>
              </Popup>
            )}
          </Marker>
        )}

        {activeSecondMarker && (
          <Marker position={[activeSecondMarker.lat, activeSecondMarker.lng]} icon={marker2Icon}>
            {(activeSecondMarker.title || activeSecondMarker.description) && (
              <Popup>
                <div className="text-sm">
                  {activeSecondMarker.title && (
                    <p className="font-semibold text-neutral-900">{activeSecondMarker.title}</p>
                  )}
                  {activeSecondMarker.description && (
                    <p className="text-neutral-600 text-xs mt-1">{activeSecondMarker.description}</p>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        )}

        {autoFitBounds && (
          <BoundsFitter marker={activeMarker} secondMarker={activeSecondMarker} />
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;
