import "server-only";
import { prisma } from "@/lib/prisma";
import { FriendlyError } from "@/lib/api-error";
import { nextBookingNumber } from "@/lib/booking-number";
import { validateSlotStillAvailable } from "@/lib/scheduling/availability-engine";
import { recommendTherapistsForBooking } from "@/lib/scheduling/recommend";
import { getTravelEstimate } from "@/lib/travel";
import { minutesOfDayManila } from "@/lib/format";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { activePaymentProvider } from "@/lib/payments";
import type { CreateBookingInput } from "@/lib/validation/booking";

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "ASSIGNED", "TRAVELING", "ARRIVED", "IN_SERVICE"] as const;

/**
 * Creates a booking through the scheduling engine. Two phases:
 *
 *  1. Resolve a (therapist, start time) pair — either re-validating the
 *     caller's specific choice, or running the recommendation engine for
 *     "any available therapist" — including a travel-provider call, so
 *     this happens OUTSIDE a database transaction.
 *  2. A short, DB-only transaction that re-checks for an overlap one more
 *     time immediately before insert (closing the race window between
 *     step 1 and the write) and creates the booking, its travel snapshot,
 *     and its first status event atomically.
 */
export async function createBooking(input: CreateBookingInput, createdById: string) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } });
  if (!service.active) throw new FriendlyError("This service is not currently offered.");

  const destination = { lat: input.latitude, lng: input.longitude };
  const scheduledEnd = new Date(input.scheduledStart.getTime() + service.durationMinutes * 60_000);

  let therapistId = input.therapistId ?? null;
  let scheduledStart = input.scheduledStart;
  let travel: { distanceKm: number; durationMinutes: number };
  let origin: { lat: number; lng: number };

  if (therapistId) {
    const validation = await validateSlotStillAvailable({
      therapistId,
      date: input.date,
      scheduledStart,
      scheduledEnd,
      destination,
      bufferMinutes: service.bufferMinutes,
    });
    if (!validation.ok) throw new FriendlyError(validation.reason);

    // validateSlotStillAvailable confirmed feasibility; recompute the actual
    // leg here for the stored snapshot (origin = therapist's current or home location).
    const therapist = await prisma.therapist.findUniqueOrThrow({ where: { id: therapistId } });
    origin =
      therapist.currentLat && therapist.currentLng
        ? { lat: Number(therapist.currentLat), lng: Number(therapist.currentLng) }
        : { lat: Number(therapist.homeLat), lng: Number(therapist.homeLng) };
    travel = await getTravelEstimate(origin, destination);
  } else {
    const recommendations = await recommendTherapistsForBooking({
      serviceId: input.serviceId,
      date: input.date,
      destination,
      notBeforeMinutes: minutesOfDayManila(input.scheduledStart),
    });
    const best = recommendations.find((r) => r.today.available);
    if (!best || !best.today.available) {
      throw new FriendlyError("No therapist is available for this service at the requested time.");
    }
    therapistId = best.therapistId;
    scheduledStart = best.today.start;
    travel = { distanceKm: best.today.distanceInKm, durationMinutes: best.today.travelInMinutes };
    origin = { lat: best.today.originLat, lng: best.today.originLng };
  }

  const finalScheduledEnd = new Date(scheduledStart.getTime() + service.durationMinutes * 60_000);

  const booking = await prisma.$transaction(async (tx) => {
    const overlap = await tx.booking.findFirst({
      where: {
        therapistId,
        status: { in: [...ACTIVE_STATUSES] },
        scheduledStart: { lt: finalScheduledEnd },
        scheduledEnd: { gt: scheduledStart },
      },
    });
    if (overlap) {
      throw new FriendlyError("This therapist was just booked for an overlapping time. Please pick another slot.");
    }

    let clientId = input.clientId ?? null;
    if (!clientId) {
      if (!input.newClient) throw new FriendlyError("A client is required.");
      const existing = await tx.client.findFirst({ where: { phone: input.newClient.phone } });
      clientId = existing
        ? existing.id
        : (
            await tx.client.create({
              data: {
                name: input.newClient.name,
                phone: input.newClient.phone,
                email: input.newClient.email || undefined,
              },
            })
          ).id;
    }

    const bookingNumber = await nextBookingNumber(tx, scheduledStart.getFullYear());
    const netAmount = Number(service.price) - input.discount;
    const isFullyPaid = input.amountPaidNow >= netAmount;

    const created = await tx.booking.create({
      data: {
        bookingNumber,
        clientId,
        therapistId,
        serviceId: input.serviceId,
        addressId: input.addressId,
        clientAddressLine: input.clientAddressLine,
        landmark: input.landmark,
        latitude: input.latitude,
        longitude: input.longitude,
        date: input.date,
        scheduledStart,
        scheduledEnd: finalScheduledEnd,
        status: therapistId ? "ASSIGNED" : "PENDING",
        travelMinutes: travel.durationMinutes,
        distanceKm: travel.distanceKm,
        travelBufferMinutes: service.bufferMinutes,
        estimatedArrival: scheduledStart,
        amount: service.price,
        discount: input.discount,
        anyAvailableTherapist: input.anyAvailableTherapist,
        notes: input.notes,
        internalNotes: input.internalNotes,
        createdById,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.amountPaidNow > 0 ? (isFullyPaid ? "PAID" : "PARTIAL") : "UNPAID",
      },
    });

    await tx.bookingStatusEvent.create({
      data: { bookingId: created.id, toStatus: created.status, changedById: createdById },
    });

    await tx.bookingTravel.create({
      data: {
        bookingId: created.id,
        fromLat: origin.lat,
        fromLng: origin.lng,
        toLat: input.latitude,
        toLng: input.longitude,
        distanceKm: travel.distanceKm,
        durationMinutes: travel.durationMinutes,
        provider: "engine",
        isEstimate: true,
      },
    });

    if (input.amountPaidNow > 0 && input.paymentMethod) {
      // manualProvider resolves synchronously, so it's safe inside the
      // transaction — a real async gateway (PayMongo/Stripe) would need
      // this call moved outside, same as the travel-provider pattern
      // above, so a slow network call never holds a DB transaction open.
      const charge = await activePaymentProvider().charge({
        amount: input.amountPaidNow,
        currency: "PHP",
        reference: bookingNumber,
      });
      if (!charge.ok) {
        throw new FriendlyError(charge.error ?? "Payment could not be processed. Please try again.");
      }
      await tx.payment.create({
        data: {
          bookingId: created.id,
          amount: input.amountPaidNow,
          method: input.paymentMethod,
          status: isFullyPaid ? "PAID" : "PARTIAL",
          reference: charge.reference,
          isDeposit: !isFullyPaid,
          recordedById: createdById,
        },
      });
    }

    return created;
  });

  await recordAudit({ userId: createdById, action: "CREATE", entity: "Booking", entityId: booking.id, after: booking });

  if (booking.therapistId) {
    const therapistUser = await prisma.therapist.findUnique({
      where: { id: booking.therapistId },
      select: { userId: true, user: { select: { phone: true } } },
    });
    if (therapistUser) {
      await notify({
        userId: therapistUser.userId,
        channel: "SMS",
        type: "BOOKING_ASSIGNED",
        title: "New booking assigned",
        body: `New booking ${booking.bookingNumber} on ${scheduledStart.toLocaleDateString("en-PH")} at ${scheduledStart.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}.`,
        to: therapistUser.user.phone ?? undefined,
        bookingId: booking.id,
      }).catch((err) => console.error("Failed to notify therapist of new booking", err));
    }
  }

  return booking;
}
