import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusPill, PaymentStatusPill } from "@/components/ui/status-pill";
import { BookingStatusActions } from "@/components/bookings/status-actions";
import { formatCurrency, formatDateTimeManila, minutesToDurationLabel } from "@/lib/format";
import { BOOKING_STATUS_LABEL } from "@/lib/status-labels";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("bookings:read:all");
  const { id } = await params;

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id },
    include: {
      client: true,
      therapist: { include: { user: { select: { name: true, phone: true } } } },
      service: true,
      statusEvents: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      payments: true,
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl text-fg">{booking.bookingNumber}</h1>
          <p className="text-sm text-fg-muted">
            {booking.service.name} · {minutesToDurationLabel(booking.service.durationMinutes)}
          </p>
        </div>
        <BookingStatusPill status={booking.status} />
      </div>

      <BookingStatusActions bookingId={booking.id} status={booking.status} />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-fg-muted">Client</p>
            <p className="text-fg">
              {booking.client.name} · {booking.client.phone}
            </p>
          </div>
          <div>
            <p className="text-fg-muted">Therapist</p>
            <p className="text-fg">{booking.therapist?.user.name ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="text-fg-muted">Scheduled</p>
            <p className="text-fg">{formatDateTimeManila(booking.scheduledStart)}</p>
          </div>
          <div>
            <p className="text-fg-muted">Address</p>
            <p className="text-fg">
              {booking.clientAddressLine}
              {booking.landmark && ` (near ${booking.landmark})`}
            </p>
          </div>
          <div>
            <p className="text-fg-muted">Travel</p>
            <p className="text-fg">
              {booking.travelMinutes} min · {booking.distanceKm?.toString()} km
            </p>
          </div>
          <div>
            <p className="text-fg-muted">Amount</p>
            <p className="text-fg">
              {formatCurrency(booking.amount.toString())}{" "}
              <PaymentStatusPill status={booking.paymentStatus} />
            </p>
          </div>
          {booking.notes && (
            <div className="col-span-2">
              <p className="text-fg-muted">Notes</p>
              <p className="text-fg">{booking.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {booking.statusEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-fg">{BOOKING_STATUS_LABEL[e.toStatus]}</span>
                <span className="text-fg-muted">
                  {formatDateTimeManila(e.createdAt)} {e.changedBy && `· ${e.changedBy.name}`}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
