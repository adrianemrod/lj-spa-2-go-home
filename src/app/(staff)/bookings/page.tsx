import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatusPill, PaymentStatusPill } from "@/components/ui/status-pill";
import { formatCurrency, formatDateTimeManila } from "@/lib/format";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission("bookings:read:all");
  const { status } = await searchParams;

  const bookings = await prisma.booking.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      client: { select: { name: true } },
      therapist: { include: { user: { select: { name: true } } } },
      service: { select: { name: true } },
    },
    orderBy: { scheduledStart: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-fg">Bookings</h1>
          <p className="text-sm text-fg-muted">Every booking, past and upcoming.</p>
        </div>
        <Link href="/bookings/new">
          <Button>
            <Plus size={16} /> New Booking
          </Button>
        </Link>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="px-5 py-3 font-medium">Booking #</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Service</th>
              <th className="px-5 py-3 font-medium">Therapist</th>
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Payment</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0 hover:bg-fg/[0.02]">
                <td className="px-5 py-3">
                  <Link href={`/bookings/${b.id}`} className="font-medium text-fg hover:text-accent">
                    {b.bookingNumber}
                  </Link>
                </td>
                <td className="px-5 py-3 text-fg-muted">{b.client.name}</td>
                <td className="px-5 py-3 text-fg-muted">{b.service.name}</td>
                <td className="px-5 py-3 text-fg-muted">{b.therapist?.user.name ?? "Unassigned"}</td>
                <td className="px-5 py-3 text-fg-muted">{formatDateTimeManila(b.scheduledStart)}</td>
                <td className="px-5 py-3 text-fg-muted">{formatCurrency(b.amount.toString())}</td>
                <td className="px-5 py-3">
                  <PaymentStatusPill status={b.paymentStatus} />
                </td>
                <td className="px-5 py-3">
                  <BookingStatusPill status={b.status} />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-fg-muted">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
