import { Badge } from "@/components/ui/badge";
import {
  THERAPIST_STATUS_LABEL,
  THERAPIST_STATUS_TONE,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from "@/lib/status-labels";
import type { BookingStatus, TherapistStatus, PaymentStatus } from "@prisma/client";

export function TherapistStatusPill({ status }: { status: TherapistStatus }) {
  return <Badge tone={THERAPIST_STATUS_TONE[status]}>{THERAPIST_STATUS_LABEL[status]}</Badge>;
}

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  return <Badge tone={BOOKING_STATUS_TONE[status]}>{BOOKING_STATUS_LABEL[status]}</Badge>;
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}
