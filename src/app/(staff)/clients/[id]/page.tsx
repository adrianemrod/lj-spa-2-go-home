import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { can } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusPill } from "@/components/ui/status-pill";
import { formatCurrency, formatDateTimeManila } from "@/lib/format";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  if (session.role !== "CLIENT" || session.clientId !== id) {
    await requirePermission("clients:read");
  }
  const canSeeFinancials = session.role === "CLIENT" || can(session.role, "sales:read");

  const client = await prisma.client.findUniqueOrThrow({
    where: { id },
    include: {
      addresses: { orderBy: { isDefault: "desc" } },
      bookings: {
        orderBy: { scheduledStart: "desc" },
        include: { service: true, therapist: { include: { user: { select: { name: true } } } } },
      },
    },
  });

  const totalSpend = client.bookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + Number(b.amount) - Number(b.discount), 0);
  const lastVisit = client.bookings.find((b) => b.status === "COMPLETED");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-fg">{client.name}</h1>
        <p className="text-sm text-fg-muted">
          {client.phone} {client.email && `· ${client.email}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total Bookings" value={String(client.bookings.length)} />
        <StatTile
          label="Lifetime Spend"
          value={canSeeFinancials ? formatCurrency(totalSpend) : "—"}
        />
        <StatTile label="Last Visit" value={lastVisit ? formatDateTimeManila(lastVisit.scheduledStart, "MMM d") : "—"} />
        <StatTile label="Addresses" value={String(client.addresses.length)} />
      </div>

      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-fg">{client.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {client.bookings.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm hover:bg-fg/5"
            >
              <div>
                <p className="font-medium text-fg">{b.service.name}</p>
                <p className="text-xs text-fg-muted">
                  {formatDateTimeManila(b.scheduledStart)} · {b.therapist?.user.name ?? "Unassigned"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {canSeeFinancials && <span className="text-fg-muted">{formatCurrency(b.amount.toString())}</span>}
                <BookingStatusPill status={b.status} />
              </div>
            </Link>
          ))}
          {client.bookings.length === 0 && <p className="text-sm text-fg-muted">No bookings yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-fg">{value}</p>
    </Card>
  );
}
