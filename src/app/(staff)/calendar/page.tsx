import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BOOKING_STATUS_TONE } from "@/lib/status-labels";
import { minutesOfDayManila } from "@/lib/format";

const DAY_START_MIN = 7 * 60; // 7 AM
const DAY_END_MIN = 21 * 60; // 9 PM
const PIXELS_PER_MIN = 1.4;

const TONE_BG: Record<string, string> = {
  neutral: "bg-fg/15",
  success: "bg-success/70",
  warning: "bg-warning/70",
  critical: "bg-critical/70",
  info: "bg-info/70",
  accent: "bg-accent/70",
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requirePermission("bookings:read:all");
  const { date } = await searchParams;
  const day = date ?? new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${day}T00:00:00+08:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [therapists, bookings] = await Promise.all([
    prisma.therapist.findMany({ where: { active: true }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.booking.findMany({
      where: { scheduledStart: { gte: dayStart, lt: dayEnd }, status: { not: "CANCELLED" } },
      include: { client: { select: { name: true } }, service: { select: { name: true } } },
    }),
  ]);

  const prevDay = shiftDay(day, -1);
  const nextDay = shiftDay(day, 1);
  const hourMarks = Array.from({ length: (DAY_END_MIN - DAY_START_MIN) / 60 + 1 }, (_, i) => DAY_START_MIN + i * 60);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-fg">Calendar</h1>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?date=${prevDay}`}>
            <Button variant="secondary" size="sm">
              ← Prev
            </Button>
          </Link>
          <span className="text-sm text-fg-muted">{day}</span>
          <Link href={`/calendar?date=${nextDay}`}>
            <Button variant="secondary" size="sm">
              Next →
            </Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-x-auto p-4">
        <div className="flex" style={{ minWidth: therapists.length * 180 + 60 }}>
          <div className="w-14 shrink-0">
            <div className="h-8" />
            {hourMarks.map((m) => (
              <div key={m} style={{ height: 60 * PIXELS_PER_MIN }} className="text-xs text-fg-muted">
                {formatHour(m)}
              </div>
            ))}
          </div>
          {therapists.map((t) => {
            const dayBookings = bookings.filter((b) => b.therapistId === t.id);
            return (
              <div key={t.id} className="w-[180px] shrink-0 border-l border-border pl-2">
                <div className="mb-1 h-8 truncate text-sm font-medium text-fg">{t.user.name}</div>
                <div
                  className="relative rounded-[var(--radius-sm)] bg-fg/[0.03]"
                  style={{ height: (DAY_END_MIN - DAY_START_MIN) * PIXELS_PER_MIN }}
                >
                  {dayBookings.map((b) => {
                    const startMin = minutesOfDayManila(b.scheduledStart);
                    const endMin = minutesOfDayManila(b.scheduledEnd);
                    const top = (startMin - DAY_START_MIN) * PIXELS_PER_MIN;
                    const height = Math.max(20, (endMin - startMin) * PIXELS_PER_MIN);
                    const tone = BOOKING_STATUS_TONE[b.status];
                    return (
                      <Link
                        key={b.id}
                        href={`/bookings/${b.id}`}
                        className={`absolute left-1 right-1 overflow-hidden rounded-[4px] p-1 text-[11px] text-white ${TONE_BG[tone]}`}
                        style={{ top, height }}
                        title={`${b.service.name} — ${b.client.name}`}
                      >
                        {b.service.name}
                        <br />
                        {b.client.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {therapists.length === 0 && <p className="p-4 text-sm text-fg-muted">No active therapists.</p>}
        </div>
      </Card>
    </div>
  );
}

function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour} ${period}`;
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00+08:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
