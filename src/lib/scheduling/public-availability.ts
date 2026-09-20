import "server-only";
import { recommendTherapistsForBooking, type TherapistRecommendation } from "@/lib/scheduling/recommend";
import { formatDateManila, formatTimeManila } from "@/lib/format";
import type { LatLng } from "@/lib/travel";

/**
 * Client-safe view of the recommendation engine (spec section 13/11):
 * name, photo, rating, and a human next-available label — never exact
 * therapist coordinates, never the internal UnavailableReason enum, never
 * another client's data. `recommendTherapistsForBooking` computes real
 * origin lat/lng for the scheduling math; this mapper is the one place
 * that data gets thrown away before anything leaves the server.
 */
export interface PublicTherapistAvailability {
  therapistId: string;
  name: string;
  photoUrl: string | null;
  ratingAvg: number | null;
  availableNow: boolean;
  nextAvailableLabel: string;
  nextAvailableStart: string | null;
}

export function toPublicAvailability(r: TherapistRecommendation): PublicTherapistAvailability {
  if (r.today.available) {
    return {
      therapistId: r.therapistId,
      name: r.name,
      photoUrl: r.photoUrl,
      ratingAvg: r.ratingAvg,
      availableNow: true,
      nextAvailableLabel: `Today — ${formatTimeManila(r.today.start)}`,
      nextAvailableStart: r.today.start.toISOString(),
    };
  }
  if (r.next?.available) {
    return {
      therapistId: r.therapistId,
      name: r.name,
      photoUrl: r.photoUrl,
      ratingAvg: r.ratingAvg,
      availableNow: false,
      nextAvailableLabel: `${formatDateManila(r.next.start, "EEE, MMM d")} — ${formatTimeManila(r.next.start)}`,
      nextAvailableStart: r.next.start.toISOString(),
    };
  }
  return {
    therapistId: r.therapistId,
    name: r.name,
    photoUrl: r.photoUrl,
    ratingAvg: r.ratingAvg,
    availableNow: false,
    nextAvailableLabel: "Not available in the next two weeks",
    nextAvailableStart: null,
  };
}

export async function getPublicAvailability(params: {
  serviceId: string;
  date: Date;
  destination: LatLng;
}): Promise<PublicTherapistAvailability[]> {
  const recommendations = await recommendTherapistsForBooking({ ...params, includeNextAvailable: true });
  return recommendations.map(toPublicAvailability).sort((a, b) => {
    if (a.availableNow !== b.availableNow) return a.availableNow ? -1 : 1;
    if (!a.nextAvailableStart || !b.nextAvailableStart) return 0;
    return a.nextAvailableStart.localeCompare(b.nextAvailableStart);
  });
}
