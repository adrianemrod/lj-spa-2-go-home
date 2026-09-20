import type { LatLng, TravelEstimate, TravelProvider } from "@/lib/travel/types";

const EARTH_RADIUS_KM = 6371;
// Rough Metro Manila average moving speed accounting for city traffic —
// deliberately conservative. This is a DEVELOPMENT FALLBACK, not a routed
// ETA: it ignores roads, one-ways, and real-time traffic. Configure
// MAPS_PROVIDER=google with GOOGLE_MAPS_API_KEY for real routing.
const ASSUMED_AVERAGE_SPEED_KMH = 22;
// Straight-line distance always understates actual road distance.
const ROAD_DISTANCE_FACTOR = 1.35;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export const haversineProvider: TravelProvider = {
  name: "haversine-estimate",
  async getTravelEstimate(from: LatLng, to: LatLng): Promise<TravelEstimate> {
    const straightLineKm = haversineDistanceKm(from, to);
    const distanceKm = Math.round(straightLineKm * ROAD_DISTANCE_FACTOR * 10) / 10;
    const durationMinutes = Math.max(5, Math.round((distanceKm / ASSUMED_AVERAGE_SPEED_KMH) * 60));
    return { distanceKm, durationMinutes, provider: this.name, isEstimate: true };
  },
};
