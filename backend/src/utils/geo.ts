/**
 * src/utils/geo.ts
 * Geolocation utility functions: Haversine distance and ETA calculations.
 */

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateEtaMinutes(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  speedKmH = 25,
): number {
  const distanceKm = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
  return Math.round((distanceKm / speedKmH) * 60);
}
