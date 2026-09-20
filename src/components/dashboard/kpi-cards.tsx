import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { CommandCenterSummary } from "@/lib/dashboard/summary";

export function KpiCards({ kpis }: { kpis: CommandCenterSummary["kpis"] }) {
  const tiles: { label: string; value: string; tone?: "critical" | "warning" }[] = [
    { label: "Today's Bookings", value: String(kpis.todaysBookings) },
    { label: "Active Therapists", value: String(kpis.activeTherapists) },
    { label: "Available Now", value: String(kpis.availableNow) },
    { label: "Traveling", value: String(kpis.traveling) },
    { label: "In Service", value: String(kpis.inService) },
    { label: "Completed Today", value: String(kpis.completedToday) },
    { label: "Pending Bookings", value: String(kpis.pendingBookings), tone: kpis.pendingBookings > 0 ? "warning" : undefined },
    { label: "Today's Sales", value: formatCurrency(kpis.todaysSales) },
    { label: "Today's Expenses", value: formatCurrency(kpis.todaysExpenses) },
    { label: "Today's Net", value: formatCurrency(kpis.todaysNet) },
    { label: "Cancellations", value: String(kpis.cancellations), tone: kpis.cancellations > 0 ? "critical" : undefined },
    { label: "No-Shows", value: String(kpis.noShows), tone: kpis.noShows > 0 ? "critical" : undefined },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <Card key={t.label} className="p-4">
          <p className="text-xs uppercase tracking-wide text-fg-muted">{t.label}</p>
          <p
            className={
              "mt-1 text-xl font-semibold " +
              (t.tone === "critical" ? "text-critical" : t.tone === "warning" ? "text-warning" : "text-fg")
            }
          >
            {t.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
