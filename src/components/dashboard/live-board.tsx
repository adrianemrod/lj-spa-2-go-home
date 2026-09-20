import Link from "next/link";
import { Card } from "@/components/ui/card";
import { TherapistStatusPill } from "@/components/ui/status-pill";
import { formatTimeManila } from "@/lib/format";
import type { CommandCenterSummary } from "@/lib/dashboard/summary";
import type { TherapistStatus } from "@prisma/client";

const COLUMNS: { title: string; statuses: TherapistStatus[] }[] = [
  { title: "Available", statuses: ["AVAILABLE"] },
  { title: "Booked / Reserved", statuses: ["RESERVED", "CONFIRMED"] },
  { title: "Traveling", statuses: ["TRAVELING", "ARRIVED"] },
  { title: "In Service", statuses: ["IN_SERVICE"] },
  { title: "Off Duty / Offline", statuses: ["OFF_DUTY", "OFFLINE", "ON_BREAK"] },
  { title: "Needs Attention", statuses: ["EMERGENCY", "LOCATION_UNAVAILABLE"] },
];

export function LiveBoard({ board }: { board: CommandCenterSummary["board"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {COLUMNS.map((col) => {
        const cards = board.filter((t) => col.statuses.includes(t.status));
        return (
          <div key={col.title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
              {col.title} ({cards.length})
            </h3>
            <div className="space-y-2">
              {cards.map((t) => (
                <Link key={t.therapistId} href={`/therapists/${t.therapistId}`}>
                  <Card className="p-3 transition-shadow hover:shadow-md">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium text-fg">{t.name}</p>
                      <TherapistStatusPill status={t.status} />
                    </div>
                    {t.current && (
                      <p className="text-xs text-fg-muted">
                        {t.current.serviceName} · {t.current.clientName}
                        <br />
                        {formatTimeManila(new Date(t.current.start))}–{formatTimeManila(new Date(t.current.end))}
                      </p>
                    )}
                    {!t.current && t.next && (
                      <p className="text-xs text-fg-muted">
                        Next: {formatTimeManila(new Date(t.next.start))} · {t.next.clientName}
                      </p>
                    )}
                    {!t.current && !t.next && <p className="text-xs text-fg-muted">No bookings today</p>}
                  </Card>
                </Link>
              ))}
              {cards.length === 0 && <p className="text-xs text-fg-muted">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
