import "server-only";
import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canTransitionBooking, InvalidBookingTransitionError } from "@/lib/booking/status-machine";
import { canTransitionTherapistStatus } from "@/lib/therapist-status/state-machine";
import { calculateCommission, resolveCommissionRule } from "@/lib/booking/commission";
import { recordAudit } from "@/lib/audit";

/**
 * A booking transition is never just a status column write — it drives the
 * therapist's live status (spec section 8's state machine), stamps
 * actual start/end times, and — on COMPLETED — creates the commission
 * record. All of it happens in one transaction so the booking and the
 * therapist's status can never drift out of sync with each other.
 */
export async function transitionBooking(params: {
  bookingId: string;
  toStatus: BookingStatus;
  changedById: string | null;
  note?: string;
  cancelReason?: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: params.bookingId },
      include: { service: true },
    });

    if (!canTransitionBooking(booking.status, params.toStatus)) {
      throw new InvalidBookingTransitionError(booking.status, params.toStatus);
    }

    const now = new Date();
    const data: Parameters<typeof tx.booking.update>[0]["data"] = { status: params.toStatus };
    if (params.toStatus === "IN_SERVICE") data.actualStart = now;
    if (params.toStatus === "COMPLETED") data.actualEnd = now;
    if (params.toStatus === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelReason = params.cancelReason;
    }
    if (params.toStatus === "NO_SHOW") data.noShowAt = now;

    await tx.booking.update({ where: { id: booking.id }, data });
    await tx.bookingStatusEvent.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: params.toStatus,
        changedById: params.changedById,
        note: params.note,
      },
    });

    if (booking.therapistId) {
      await syncTherapistStatus(tx, booking.therapistId, booking.id, params.toStatus);
    }

    if (params.toStatus === "COMPLETED" && booking.therapistId) {
      const override = await tx.therapistService.findUnique({
        where: { therapistId_serviceId: { therapistId: booking.therapistId, serviceId: booking.serviceId } },
      });
      const rule = resolveCommissionRule({
        service: { commissionType: booking.service.commissionType, commissionValue: Number(booking.service.commissionValue) },
        therapistOverride: override
          ? {
              customCommissionType: override.customCommissionType,
              customCommissionValue: override.customCommissionValue ? Number(override.customCommissionValue) : null,
            }
          : null,
      });
      const commissionAmount = calculateCommission(Number(booking.amount) - Number(booking.discount), rule.type, rule.value);
      await tx.commission.create({
        data: {
          bookingId: booking.id,
          therapistId: booking.therapistId,
          baseAmount: Number(booking.amount) - Number(booking.discount),
          commissionType: rule.type,
          commissionValue: rule.value,
          commissionAmount,
        },
      });
    }

    await recordAudit({
      userId: params.changedById,
      action: "BOOKING_STATUS_CHANGE",
      entity: "Booking",
      entityId: booking.id,
      before: { status: booking.status },
      after: { status: params.toStatus },
    });
  });
}

type Tx = Prisma.TransactionClient;

const BOOKING_TO_THERAPIST_STATUS: Partial<Record<BookingStatus, "RESERVED" | "TRAVELING" | "ARRIVED" | "IN_SERVICE">> = {
  ASSIGNED: "RESERVED",
  TRAVELING: "TRAVELING",
  ARRIVED: "ARRIVED",
  IN_SERVICE: "IN_SERVICE",
};

async function syncTherapistStatus(tx: Tx, therapistId: string, bookingId: string, toStatus: BookingStatus) {
  const therapist = await tx.therapist.findUniqueOrThrow({ where: { id: therapistId }, select: { status: true } });

  const target = BOOKING_TO_THERAPIST_STATUS[toStatus];
  if (target && canTransitionTherapistStatus(therapist.status, target)) {
    await writeTherapistStatus(tx, therapistId, therapist.status, target, bookingId);
    return;
  }

  if (toStatus === "COMPLETED" && canTransitionTherapistStatus(therapist.status, "COMPLETED")) {
    await writeTherapistStatus(tx, therapistId, therapist.status, "COMPLETED", bookingId);
    await writeTherapistStatus(tx, therapistId, "COMPLETED", "AVAILABLE", bookingId);
    return;
  }

  if (toStatus === "CANCELLED" || toStatus === "NO_SHOW") {
    // Only reclaim the therapist's live status if it was this booking that
    // put them there — an unrelated in-progress job must not be touched.
    const lastEvent = await tx.therapistStatusEvent.findFirst({
      where: { therapistId },
      orderBy: { createdAt: "desc" },
    });
    if (lastEvent?.bookingId === bookingId && canTransitionTherapistStatus(therapist.status, "AVAILABLE")) {
      await writeTherapistStatus(tx, therapistId, therapist.status, "AVAILABLE", bookingId);
    }
  }
}

async function writeTherapistStatus(
  tx: Tx,
  therapistId: string,
  from: string,
  to: "RESERVED" | "TRAVELING" | "ARRIVED" | "IN_SERVICE" | "COMPLETED" | "AVAILABLE",
  bookingId: string
) {
  await tx.therapist.update({ where: { id: therapistId }, data: { status: to, statusUpdatedAt: new Date() } });
  await tx.therapistStatusEvent.create({
    data: { therapistId, fromStatus: from as never, toStatus: to, bookingId },
  });
}
