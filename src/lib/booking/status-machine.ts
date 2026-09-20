import type { BookingStatus } from "@prisma/client";

/**
 * Allowed booking status transitions (spec section 40/41 timeline: Created
 * -> Confirmed -> Assigned -> Traveling -> Arrived -> Started -> Completed).
 * Completed and Cancelled are terminal — a completed financial record is
 * never mutated back, only reversed via a Refund row.
 */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "ASSIGNED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["TRAVELING", "CANCELLED", "NO_SHOW"],
  TRAVELING: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["IN_SERVICE", "NO_SHOW"],
  IN_SERVICE: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidBookingTransitionError extends Error {
  constructor(from: BookingStatus, to: BookingStatus) {
    super(`Cannot move a booking from ${from} to ${to}.`);
  }
}
