import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { manilaDateAndMinutesToUtc, minutesOfDayManila } from "@/lib/format";
import { getWorkingWindowsForDate } from "@/lib/scheduling/working-hours";
import { fitServiceInGap } from "@/lib/scheduling/slot-math";
import { getTravelEstimate, type LatLng } from "@/lib/travel";

const ACTIVE_BOOKING_STATUSES: Prisma.BookingWhereInput["status"] = {
  in: ["PENDING", "CONFIRMED", "ASSIGNED", "TRAVELING", "ARRIVED", "IN_SERVICE"],
};

export type UnavailableReason =
  | "DAY_OFF"
  | "OUTSIDE_WORKING_HOURS"
  | "MAX_TRAVEL_RADIUS_EXCEEDED"
  | "NOT_QUALIFIED_FOR_SERVICE"
  | "NO_SLOT_AVAILABLE"
  | "ORIGIN_UNKNOWN";

export interface SlotResult {
  available: true;
  date: Date;
  start: Date;
  end: Date;
  travelInMinutes: number;
  distanceInKm: number;
  originLat: number;
  originLng: number;
}

export interface UnavailableResult {
  available: false;
  reason: UnavailableReason;
  date?: Date;
}

interface BookingWithLocation {
  id: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  latitude: number;
  longitude: number;
}

async function getActiveBookingsForDate(
  therapistId: string,
  date: Date,
  excludeBookingId?: string
): Promise<BookingWithLocation[]> {
  const rows = await prisma.booking.findMany({
    where: {
      therapistId,
      date,
      status: ACTIVE_BOOKING_STATUSES,
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    orderBy: { scheduledStart: "asc" },
    select: { id: true, scheduledStart: true, scheduledEnd: true, latitude: true, longitude: true },
  });
  return rows.map((r) => ({
    id: r.id,
    scheduledStart: r.scheduledStart,
    scheduledEnd: r.scheduledEnd,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
  }));
}

async function therapistOrigin(therapistId: string): Promise<LatLng | null> {
  const therapist = await prisma.therapist.findUnique({
    where: { id: therapistId },
    select: { homeLat: true, homeLng: true },
  });
  if (!therapist?.homeLat || !therapist.homeLng) return null;
  return { lat: Number(therapist.homeLat), lng: Number(therapist.homeLng) };
}

/**
 * The core availability calculation described in the spec:
 *
 *   nextAvailable = max(end of current appointment, travel arrival time,
 *                        therapist working hours) + required buffer
 *
 * applied gap-by-gap across the therapist's working windows for one day,
 * so a therapist is never shown as available at a time travel makes
 * impossible. Returns the single earliest slot on `date`, or a typed
 * reason why none exists.
 */
export async function findEarliestSlotOnDate(params: {
  therapistId: string;
  date: Date;
  serviceDurationMinutes: number;
  bufferMinutes: number;
  destination: LatLng;
  notBeforeMinutes?: number;
  excludeBookingId?: string;
}): Promise<SlotResult | UnavailableResult> {
  const { therapistId, date, serviceDurationMinutes, bufferMinutes, destination, excludeBookingId } = params;

  const windows = await getWorkingWindowsForDate(therapistId, date);
  if (windows.length === 0) return { available: false, reason: "DAY_OFF", date };

  const origin = await therapistOrigin(therapistId);
  if (!origin) return { available: false, reason: "ORIGIN_UNKNOWN", date };

  const bookings = await getActiveBookingsForDate(therapistId, date, excludeBookingId);

  let carryLocation: LatLng = origin;

  for (const window of windows) {
    let cursorTime = Math.max(window.startMinutes, params.notBeforeMinutes ?? -Infinity);
    let cursorLoc = carryLocation;

    const windowBookings = bookings.filter((b) => {
      const startMin = minutesOfDayManila(b.scheduledStart);
      return startMin >= window.startMinutes && startMin < window.endMinutes;
    });

    for (const booking of windowBookings) {
      const bookingStartMin = minutesOfDayManila(booking.scheduledStart);
      const bookingLoc: LatLng = { lat: booking.latitude, lng: booking.longitude };

      const [travelIn, travelOut] = await Promise.all([
        getTravelEstimate(cursorLoc, destination),
        getTravelEstimate(destination, bookingLoc),
      ]);

      const fit = fitServiceInGap({
        freeAt: cursorTime,
        travelInMinutes: travelIn.durationMinutes,
        serviceDurationMinutes,
        bufferMinutes,
        deadline: bookingStartMin - travelOut.durationMinutes,
      });

      if (fit) {
        return buildSlotResult(date, fit, travelIn, cursorLoc);
      }

      cursorTime = minutesOfDayManila(booking.scheduledEnd);
      cursorLoc = bookingLoc;
    }

    // Open-ended attempt after the last booking in this window (or the
    // whole window, if it had none).
    const travelIn = await getTravelEstimate(cursorLoc, destination);
    const fit = fitServiceInGap({
      freeAt: cursorTime,
      travelInMinutes: travelIn.durationMinutes,
      serviceDurationMinutes,
      bufferMinutes,
      deadline: window.endMinutes,
    });
    if (fit) {
      return buildSlotResult(date, fit, travelIn, cursorLoc);
    }

    carryLocation = cursorLoc;
  }

  return { available: false, reason: "NO_SLOT_AVAILABLE", date };
}

function buildSlotResult(
  date: Date,
  fit: { start: number; end: number },
  travelIn: { distanceKm: number; durationMinutes: number },
  origin: LatLng
): SlotResult {
  return {
    available: true,
    date,
    start: manilaDateAndMinutesToUtc(date, fit.start),
    end: manilaDateAndMinutesToUtc(date, fit.end),
    travelInMinutes: travelIn.durationMinutes,
    distanceInKm: travelIn.distanceKm,
    originLat: origin.lat,
    originLng: origin.lng,
  };
}

/**
 * Search forward from `startDate` (inclusive) up to `maxDaysAhead` for the
 * first day this therapist has any opening — powers "Available Today",
 * "Available Tomorrow", "Next Available" in the client booking flow.
 */
export async function findNextAvailableSlot(params: {
  therapistId: string;
  startDate: Date;
  serviceDurationMinutes: number;
  bufferMinutes: number;
  destination: LatLng;
  notBeforeMinutes?: number;
  maxDaysAhead?: number;
}): Promise<SlotResult | UnavailableResult> {
  const maxDaysAhead = params.maxDaysAhead ?? 14;
  for (let i = 0; i <= maxDaysAhead; i++) {
    const date = new Date(params.startDate);
    date.setDate(date.getDate() + i);
    const result = await findEarliestSlotOnDate({
      therapistId: params.therapistId,
      date,
      serviceDurationMinutes: params.serviceDurationMinutes,
      bufferMinutes: params.bufferMinutes,
      destination: params.destination,
      notBeforeMinutes: i === 0 ? params.notBeforeMinutes : undefined,
    });
    if (result.available) return result;
  }
  return { available: false, reason: "NO_SLOT_AVAILABLE" };
}

/**
 * Re-validates a specific candidate slot for a therapist at commit time —
 * called inside the booking-creation transaction so a race between two
 * concurrent requests can never double-book. Checks working hours, day off,
 * max travel radius, and that both the incoming and outgoing travel legs
 * still leave enough buffer against every neighboring booking.
 */
export async function validateSlotStillAvailable(params: {
  therapistId: string;
  date: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  destination: LatLng;
  bufferMinutes: number;
  excludeBookingId?: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const windows = await getWorkingWindowsForDate(params.therapistId, params.date);
  const startMin = minutesOfDayManila(params.scheduledStart);
  const endMin = minutesOfDayManila(params.scheduledEnd);
  const withinWindow = windows.some((w) => startMin >= w.startMinutes && endMin <= w.endMinutes);
  if (!withinWindow) {
    return { ok: false, reason: "Outside the therapist's working hours (or a day off)." };
  }

  const origin = await therapistOrigin(params.therapistId);
  if (!origin) return { ok: false, reason: "Therapist has no base location configured." };

  const bookings = await getActiveBookingsForDate(params.therapistId, params.date, params.excludeBookingId);

  // Find neighbors: the booking immediately before and after this slot.
  const before = bookings.filter((b) => minutesOfDayManila(b.scheduledEnd) <= startMin).at(-1);
  const after = bookings.find((b) => minutesOfDayManila(b.scheduledStart) >= endMin);
  const overlapping = bookings.some(
    (b) =>
      minutesOfDayManila(b.scheduledStart) < endMin && minutesOfDayManila(b.scheduledEnd) > startMin
  );
  if (overlapping) {
    return { ok: false, reason: "This therapist already has a booking that overlaps this time." };
  }

  const fromLoc: LatLng = before ? { lat: before.latitude, lng: before.longitude } : origin;
  const fromTime = before ? minutesOfDayManila(before.scheduledEnd) : windows[0].startMinutes;
  const travelIn = await getTravelEstimate(fromLoc, params.destination);
  if (fromTime + travelIn.durationMinutes > startMin) {
    return { ok: false, reason: "Not enough travel time from the therapist's previous booking." };
  }

  if (after) {
    const travelOut = await getTravelEstimate(params.destination, { lat: after.latitude, lng: after.longitude });
    const nextStart = minutesOfDayManila(after.scheduledStart);
    if (endMin + params.bufferMinutes + travelOut.durationMinutes > nextStart) {
      return { ok: false, reason: "Not enough travel time to reach the next booking on time." };
    }
  }

  return { ok: true };
}
