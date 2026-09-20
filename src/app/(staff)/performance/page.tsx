import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { requirePermission } from "@/lib/auth/require-permission";
import { getTherapistPerformance, type TherapistPerformanceRow } from "@/lib/performance";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type SortKey = keyof Omit<TherapistPerformanceRow, "therapistId" | "name">;

const COLUMNS: { key: SortKey; label: string; format: (v: number) => string }[] = [
  { key: "totalBookings", label: "Bookings", format: (v) => String(v) },
  { key: "completed", label: "Completed", format: (v) => String(v) },
  { key: "cancelled", label: "Cancelled", format: (v) => String(v) },
  { key: "noShow", label: "No-Shows", format: (v) => String(v) },
  { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v) },
  { key: "avgBookingValue", label: "Avg Booking Value", format: (v) => formatCurrency(v) },
  { key: "serviceHours", label: "Service Hours", format: (v) => `${v}h` },
  { key: "travelHours", label: "Travel Hours", format: (v) => `${v}h` },
  { key: "utilizationPct", label: "Utilization", format: (v) => `${v}%` },
  { key: "commissionEarned", label: "Commission", format: (v) => formatCurrency(v) },
  { key: "repeatClients", label: "Repeat Clients", format: (v) => String(v) },
  { key: "newClients", label: "New Clients", format: (v) => String(v) },
];

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  await requirePermission("performance:read");
  const { sort, dir } = await searchParams;
  const sortKey: SortKey = (COLUMNS.find((c) => c.key === sort)?.key ?? "revenue") as SortKey;
  const direction = dir === "asc" ? "asc" : "desc";

  const rows = await getTherapistPerformance();
  const sorted = [...rows].sort((a, b) => (direction === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-fg">Therapist Performance</h1>
        <p className="text-sm text-fg-muted">
          Compare therapists by any individual metric — sort by clicking a column. No opaque combined score.
        </p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
              <th className="whitespace-nowrap px-4 py-3 font-medium">Therapist</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3 font-medium">
                  <Link
                    href={`/performance?sort=${c.key}&dir=${sortKey === c.key && direction === "desc" ? "asc" : "desc"}`}
                    className="flex items-center gap-1 hover:text-fg"
                  >
                    {c.label}
                    <ArrowUpDown size={12} className={sortKey === c.key ? "text-accent" : "text-fg-muted"} />
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.therapistId} className="border-b border-border last:border-0 hover:bg-fg/[0.02]">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link href={`/therapists/${r.therapistId}`} className="font-medium text-fg hover:text-accent">
                    {r.name}
                  </Link>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-4 py-3 text-fg-muted">
                    {c.format(r[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-4 py-10 text-center text-fg-muted">
                  No therapists yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
