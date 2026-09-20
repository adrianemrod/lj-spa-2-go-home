import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { getTherapistPerformance } from "@/lib/performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { Download } from "lucide-react";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requirePermission("reports:read");
  const { month } = await searchParams;
  const currentMonth = month ?? new Date().toISOString().slice(0, 7);
  const start = new Date(`${currentMonth}-01T00:00:00+08:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const [salesAgg, expensesAgg, statusCounts, performance] = await Promise.all([
    prisma.booking.aggregate({
      where: { status: "COMPLETED", scheduledStart: { gte: start, lt: end } },
      _sum: { amount: true, discount: true, tip: true },
    }),
    prisma.expense.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.booking.groupBy({ by: ["status"], where: { scheduledStart: { gte: start, lt: end } }, _count: true }),
    getTherapistPerformance({ start, end }),
  ]);

  const sales = Number(salesAgg._sum.amount ?? 0) - Number(salesAgg._sum.discount ?? 0) + Number(salesAgg._sum.tip ?? 0);
  const expenses = Number(expensesAgg._sum.amount ?? 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-fg">Monthly Reports</h1>
          <p className="text-sm text-fg-muted">{currentMonth}</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input type="month" name="month" defaultValue={currentMonth} className="h-10 rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-sm" />
          <Button type="submit" variant="secondary" size="sm">
            View
          </Button>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Monthly Sales</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{formatCurrency(sales)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Monthly Expenses</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{formatCurrency(expenses)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Monthly Net</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{formatCurrency(sales - expenses)}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bookings by Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          {statusCounts.map((s) => (
            <div key={s.status}>
              <p className="text-xs uppercase tracking-wide text-fg-muted">{s.status.replace("_", " ")}</p>
              <p className="text-xl font-semibold text-fg">{s._count}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Therapist Monthly Performance</CardTitle>
          <a href={`/api/reports/monthly-csv?month=${currentMonth}`}>
            <Button variant="secondary" size="sm">
              <Download size={14} /> Export CSV
            </Button>
          </a>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <th className="px-5 py-3 font-medium">Therapist</th>
                <th className="px-5 py-3 font-medium">Bookings</th>
                <th className="px-5 py-3 font-medium">Revenue</th>
                <th className="px-5 py-3 font-medium">Service Hours</th>
                <th className="px-5 py-3 font-medium">Travel Hours</th>
                <th className="px-5 py-3 font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((p) => (
                <tr key={p.therapistId} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-fg">{p.name}</td>
                  <td className="px-5 py-3 text-fg-muted">{p.totalBookings}</td>
                  <td className="px-5 py-3 text-fg-muted">{formatCurrency(p.revenue)}</td>
                  <td className="px-5 py-3 text-fg-muted">{p.serviceHours}h</td>
                  <td className="px-5 py-3 text-fg-muted">{p.travelHours}h</td>
                  <td className="px-5 py-3 text-fg-muted">{formatCurrency(p.commissionEarned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
