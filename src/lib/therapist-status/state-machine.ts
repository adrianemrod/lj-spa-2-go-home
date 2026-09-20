import "server-only";
import type { TherapistStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Allowed therapist status transitions. This is the single source of truth
 * — Therapist.status is never written outside transitionTherapistStatus(),
 * so an invalid jump (e.g. AVAILABLE straight to IN_SERVICE, skipping
 * TRAVELING/ARRIVED) is rejected rather than silently accepted.
 */
const TRANSITIONS: Record<TherapistStatus, TherapistStatus[]> = {
  OFFLINE: ["AVAILABLE"],
  AVAILABLE: ["RESERVED", "CONFIRMED", "TRAVELING", "ON_BREAK", "OFF_DUTY", "EMERGENCY", "OFFLINE"],
  RESERVED: ["CONFIRMED", "TRAVELING", "AVAILABLE", "EMERGENCY"],
  CONFIRMED: ["TRAVELING", "AVAILABLE", "EMERGENCY"],
  TRAVELING: ["ARRIVED", "LOCATION_UNAVAILABLE", "EMERGENCY", "AVAILABLE"],
  ARRIVED: ["IN_SERVICE", "EMERGENCY", "AVAILABLE"],
  IN_SERVICE: ["COMPLETED", "EMERGENCY"],
  COMPLETED: ["AVAILABLE", "TRAVELING", "ON_BREAK", "OFF_DUTY"],
  ON_BREAK: ["AVAILABLE", "OFF_DUTY"],
  OFF_DUTY: ["OFFLINE", "AVAILABLE"],
  EMERGENCY: ["AVAILABLE", "OFFLINE"],
  LOCATION_UNAVAILABLE: ["TRAVELING", "AVAILABLE", "EMERGENCY"],
};

export function canTransitionTherapistStatus(from: TherapistStatus, to: TherapistStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidTherapistTransitionError extends Error {
  constructor(from: TherapistStatus, to: TherapistStatus) {
    super(`Cannot move a therapist from ${from} to ${to}.`);
  }
}

export async function transitionTherapistStatus(
  therapistId: string,
  to: TherapistStatus,
  opts: { bookingId?: string; note?: string } = {}
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const therapist = await tx.therapist.findUniqueOrThrow({
      where: { id: therapistId },
      select: { status: true },
    });
    if (!canTransitionTherapistStatus(therapist.status, to)) {
      throw new InvalidTherapistTransitionError(therapist.status, to);
    }
    await tx.therapist.update({
      where: { id: therapistId },
      data: { status: to, statusUpdatedAt: new Date() },
    });
    await tx.therapistStatusEvent.create({
      data: {
        therapistId,
        fromStatus: therapist.status,
        toStatus: to,
        bookingId: opts.bookingId,
        note: opts.note,
      },
    });
  });
}
