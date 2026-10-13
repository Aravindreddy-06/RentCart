/**
 * src/components/LocationPicker.tsx (web)
 * Reusable location picker with draggable Leaflet map pin,
 * "Use my current location" button, and address input.
 */

import { useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface LocationValue {
  latitude: number;
  longitude: number;
  address: string;
}

export interface LocationPickerProps {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
  className?: string;
  error?: string;
  height?: string | number;
}

const draggablePinIcon = L.divIcon({
  className: 'draggable-map-pin',
  html: `
    <div style="
      background: #16a34a;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(22, 163, 74, 0.45);
      border: 3px solid white;
      cursor: grab;
    ">
      <span style="transform: rotate(45deg); font-size: 18px;">📍</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  value,
  onChange,
  className = '',
  error,
  height = '260px',
}: LocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const lat = typeof value.latitude === 'number' && !isNaN(value.latitude) ? value.latitude : 37.7749;
  const lng = typeof value.longitude === 'number' && !isNaN(value.longitude) ? value.longitude : -122.4194;

  const eventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker != null) {
          const newPos = marker.getLatLng();
          const cleanLat = Number(newPos.lat.toFixed(6));
          const cleanLng = Number(newPos.lng.toFixed(6));
          onChange({
            ...value,
            latitude: cleanLat,
            longitude: cleanLng,
          });
        }
      },
    }),
    [onChange, value],
  );

  const handleMapClick = useCallback(
    (newLat: number, newLng: number) => {
      onChange({
        ...value,
        latitude: Number(newLat.toFixed(6)),
        longitude: Number(newLng.toFixed(6)),
      });
    },
    [onChange, value],
  );

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const curLat = Number(pos.coords.latitude.toFixed(6));
        const curLng = Number(pos.coords.longitude.toFixed(6));

        // Try reverse geocoding via OpenStreetMap Nominatim for convenience
        let foundAddress = value.address;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${curLat}&lon=${curLng}`,
            { headers: { 'Accept-Language': 'en' } },
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data?.display_name && !value.address) {
              foundAddress = data.display_name;
            }
          }
        } catch {
          // Non-blocking; keep existing address
        }

        onChange({
          latitude: curLat,
          longitude: curLng,
          address: foundAddress,
        });
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. You can manually drag the pin or edit address.');
        } else {
          setGeoError('Could not retrieve your location. Please drag the pin on the map.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="block text-sm font-semibold text-neutral-800">
          Pickup Location & Address <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
        >
          {locating ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-primary-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Locating...</span>
            </>
          ) : (
            <>
              <span>🎯</span>
              <span>Use my current location</span>
            </>
          )}
        </button>
      </div>

      {geoError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {geoError}
        </p>
      )}

      {/* Address Input */}
      <div>
        <input
          type="text"
          value={value.address || ''}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="e.g. 742 Evergreen Terrace, Springfield (or street address)"
          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      {/* Interactive Map Picker */}
      <div
        className="relative rounded-xl overflow-hidden border border-neutral-200 shadow-sm z-0"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[lat, lng]}
            draggable={true}
            eventHandlers={eventHandlers}
            icon={draggablePinIcon}
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
        </MapContainer>

        <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-neutral-200/80 text-[11px] text-neutral-600 flex items-center justify-between pointer-events-none shadow-sm z-10">
          <span>💡 Click map or drag the green pin to set location</span>
          <span className="font-mono text-neutral-500">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LocationPicker;
