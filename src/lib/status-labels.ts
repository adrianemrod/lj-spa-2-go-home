import type { BookingStatus, TherapistStatus, PaymentStatus } from "@prisma/client";

type Tone = "neutral" | "success" | "warning" | "critical" | "info" | "accent";

export const THERAPIST_STATUS_LABEL: Record<TherapistStatus, string> = {
  OFFLINE: "Offline",
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  CONFIRMED: "Confirmed",
  TRAVELING: "Traveling",
  ARRIVED: "Arrived",
  IN_SERVICE: "In Service",
  COMPLETED: "Completed",
  ON_BREAK: "On Break",
  OFF_DUTY: "Off Duty",
  EMERGENCY: "Emergency",
  LOCATION_UNAVAILABLE: "Location Unavailable",
};

export const THERAPIST_STATUS_TONE: Record<TherapistStatus, Tone> = {
  OFFLINE: "neutral",
  AVAILABLE: "success",
  RESERVED: "info",
  CONFIRMED: "info",
  TRAVELING: "accent",
  ARRIVED: "accent",
  IN_SERVICE: "warning",
  COMPLETED: "neutral",
  ON_BREAK: "neutral",
  OFF_DUTY: "neutral",
  EMERGENCY: "critical",
  LOCATION_UNAVAILABLE: "critical",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  TRAVELING: "Traveling",
  ARRIVED: "Arrived",
  IN_SERVICE: "In Service",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-Show",
};

export const BOOKING_STATUS_TONE: Record<BookingStatus, Tone> = {
  PENDING: "warning",
  CONFIRMED: "info",
  ASSIGNED: "info",
  TRAVELING: "accent",
  ARRIVED: "accent",
  IN_SERVICE: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
  NO_SHOW: "critical",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially Refunded",
  VOID: "Void",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  UNPAID: "critical",
  PARTIAL: "warning",
  PAID: "success",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "neutral",
  VOID: "neutral",
};
