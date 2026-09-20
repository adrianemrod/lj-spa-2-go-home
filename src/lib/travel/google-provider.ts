import "server-only";
import type { LatLng, TravelEstimate, TravelProvider } from "@/lib/travel/types";
import { haversineProvider } from "@/lib/travel/haversine-provider";

interface DistanceMatrixResponse {
  status: string;
  rows: Array<{
    elements: Array<{
      status: string;
      distance?: { value: number };
      duration_in_traffic?: { value: number };
      duration?: { value: number };
    }>;
  }>;
}

/**
 * Google Distance Matrix-backed provider. Requires GOOGLE_MAPS_API_KEY.
 * Falls back to the Haversine estimator (never throws to the caller) if the
 * key is missing, the request fails, or Google returns a non-OK element —
 * dispatch must keep working even if the maps API is degraded, just with a
 * clearly flagged estimate instead of a routed ETA.
 */
export const googleProvider: TravelProvider = {
  name: "google-distance-matrix",
  async getTravelEstimate(from: LatLng, to: LatLng): Promise<TravelEstimate> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return haversineProvider.getTravelEstimate(from, to);
    }
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.set("origins", `${from.lat},${from.lng}`);
      url.searchParams.set("destinations", `${to.lat},${to.lng}`);
      url.searchParams.set("departure_time", "now");
      url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return haversineProvider.getTravelEstimate(from, to);

      const data = (await res.json()) as DistanceMatrixResponse;
      const element = data.rows?.[0]?.elements?.[0];
      if (data.status !== "OK" || !element || element.status !== "OK" || !element.distance) {
        return haversineProvider.getTravelEstimate(from, to);
      }

      const durationSeconds = element.duration_in_traffic?.value ?? element.duration?.value;
      if (durationSeconds == null) return haversineProvider.getTravelEstimate(from, to);

      return {
        distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,
        durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        provider: this.name,
        isEstimate: false,
      };
    } catch {
      return haversineProvider.getTravelEstimate(from, to);
    }
  },
};
