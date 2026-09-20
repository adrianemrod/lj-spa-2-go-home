import "server-only";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm, type LatLng } from "@/lib/travel";
import { findEarliestSlotOnDate, findNextAvailableSlot, type SlotResult, type UnavailableResult } from "@/lib/scheduling/availability-engine";

export interface TherapistRecommendation {
  therapistId: string;
  name: string;
  photoUrl: string | null;
  ratingAvg: number | null;
  distanceKm: number;
  today: SlotResult | UnavailableResult;
  /** Only computed when `today` isn't available — the next day this therapist opens up. */
  next?: SlotResult | UnavailableResult;
}

/**
 * Smart Booking Recommendation Engine (spec section 28). Evaluates every
 * therapist qualified for a service — service capability, active status,
 * and within their configured max travel radius — against the real
 * scheduling engine, and returns them ranked by earliest availability.
 * Never auto-assigns; a human always makes the final call.
 */
export async function recommendTherapistsForBooking(params: {
  serviceId: string;
  date: Date;
  destination: LatLng;
  notBeforeMinutes?: number;
  includeNextAvailable?: boolean;
}): Promise<TherapistRecommendation[]> {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: params.serviceId } });

  const candidates = await prisma.therapist.findMany({
    where: { active: true, services: { some: { serviceId: params.serviceId } } },
    include: { user: { select: { name: true } } },
  });

  const results = await Promise.all(
    candidates.map(async (t): Promise<TherapistRecommendation | null> => {
      if (!t.homeLat || !t.homeLng) return null;
      const origin: LatLng = { lat: Number(t.homeLat), lng: Number(t.homeLng) };
      const distanceKm = haversineDistanceKm(origin, params.destination);
      if (distanceKm > Number(t.maxTravelRadiusKm)) return null;

      const today = await findEarliestSlotOnDate({
        therapistId: t.id,
        date: params.date,
        serviceDurationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
        destination: params.destination,
        notBeforeMinutes: params.notBeforeMinutes,
      });

      let next: TherapistRecommendation["next"];
      if (!today.available && params.includeNextAvailable) {
        const startDate = new Date(params.date);
        startDate.setDate(startDate.getDate() + 1);
        next = await findNextAvailableSlot({
          therapistId: t.id,
          startDate,
          serviceDurationMinutes: service.durationMinutes,
          bufferMinutes: service.bufferMinutes,
          destination: params.destination,
        });
      }

      return {
        therapistId: t.id,
        name: t.user.name,
        photoUrl: t.photoUrl,
        ratingAvg: t.ratingAvg ? Number(t.ratingAvg) : null,
        distanceKm: Math.round(distanceKm * 10) / 10,
        today,
        next,
      };
    })
  );

  return results
    .filter((r): r is TherapistRecommendation => r !== null)
    .sort((a, b) => {
      if (a.today.available && b.today.available) return a.today.start.getTime() - b.today.start.getTime();
      if (a.today.available) return -1;
      if (b.today.available) return 1;
      return 0;
    });
}
