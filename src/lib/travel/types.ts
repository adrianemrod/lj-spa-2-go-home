export interface LatLng {
  lat: number;
  lng: number;
}

export interface TravelEstimate {
  distanceKm: number;
  durationMinutes: number;
  provider: string;
  /** true when this came from the straight-line fallback, not a real routing API. */
  isEstimate: boolean;
}

export interface TravelProvider {
  name: string;
  getTravelEstimate(from: LatLng, to: LatLng): Promise<TravelEstimate>;
}
