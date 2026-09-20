import "server-only";
import type { LatLng, TravelEstimate } from "@/lib/travel/types";
import { haversineProvider } from "@/lib/travel/haversine-provider";
import { googleProvider } from "@/lib/travel/google-provider";

export type { LatLng, TravelEstimate } from "@/lib/travel/types";
export { haversineDistanceKm } from "@/lib/travel/haversine-provider";

function activeProvider() {
  switch (process.env.MAPS_PROVIDER) {
    case "google":
      return googleProvider;
    default:
      return haversineProvider;
  }
}

export async function getTravelEstimate(from: LatLng, to: LatLng): Promise<TravelEstimate> {
  return activeProvider().getTravelEstimate(from, to);
}
