import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { manilaTodayRange } from "@/lib/dashboard/summary";

export default async function SalesPage() {
  await requirePermission("sales:read");

  const { start: todayStart, end: todayEnd } = manilaTodayRange();
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(todayStart);
  monthStart.setDate(1);

  const [today, thisWeek, thisMonth, byService, byPaymentMethod] = await Promise.all([
    salesTotal(todayStart, todayEnd),
    salesTotal(weekStart, todayEnd),
    salesTotal(monthStart, todayEnd),
    prisma.booking.groupBy({
      by: ["serviceId"],
      where: { status: "COMPLETED", scheduledStart: { gte: monthStart, lt: todayEnd } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.booking.groupBy({
      by: ["paymentMethod"],
      where: { status: "COMPLETED", scheduledStart: { gte: monthStart, lt: todayEnd } },
      _sum: { amount: true },
    }),
  ]);

  const services = await prisma.service.findMany({ where: { id: { in: byService.map((s) => s.serviceId) } } });

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-fg">Sales</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Today</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{formatCurrency(today)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-fg-muted">This Week</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{formatCurrency(thisWeek)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-fg-muted">This Month</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{formatCurrency(thisMonth)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Service (This Month)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byService.map((s) => {
              const service = services.find((sv) => sv.id === s.serviceId);
              return (
                <div key={s.serviceId} className="flex items-center justify-between text-sm">
                  <span className="text-fg">{service?.name ?? "Unknown"}</span>
                  <span className="text-fg-muted">
                    {s._count} bookings · {formatCurrency(s._sum.amount?.toString() ?? "0")}
                  </span>
                </div>
              );
            })}
            {byService.length === 0 && <p className="text-sm text-fg-muted">No completed bookings this month.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Payment Method (This Month)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byPaymentMethod.map((p) => (
              <div key={p.paymentMethod ?? "none"} className="flex items-center justify-between text-sm">
                <span className="text-fg">{p.paymentMethod?.replace("_", " ") ?? "Unspecified"}</span>
                <span className="text-fg-muted">{formatCurrency(p._sum.amount?.toString() ?? "0")}</span>
              </div>
            ))}
            {byPaymentMethod.length === 0 && <p className="text-sm text-fg-muted">No completed bookings this month.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function salesTotal(start: Date, end: Date): Promise<number> {
  const agg = await prisma.booking.aggregate({
    where: { status: "COMPLETED", scheduledStart: { gte: start, lt: end } },
    _sum: { amount: true, discount: true, tip: true },
  });
  return Number(agg._sum.amount ?? 0) - Number(agg._sum.discount ?? 0) + Number(agg._sum.tip ?? 0);
}
