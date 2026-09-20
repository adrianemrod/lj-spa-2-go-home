"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TherapistStatusPill } from "@/components/ui/status-pill";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { enqueue, flushQueue, queueLength } from "@/lib/offline-queue";
import { formatCurrency, formatTimeManila } from "@/lib/format";
import type { BookingStatus, TherapistStatus } from "@prisma/client";

interface ScheduleBooking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  scheduledStart: string;
  scheduledEnd: string;
  clientAddressLine: string;
  landmark: string | null;
  latitude: string;
  longitude: string;
  client: { name: string; phone: string };
  service: { name: string; durationMinutes: number };
}

interface ScheduleData {
  therapist: { id: string; name: string; status: TherapistStatus };
  bookings: ScheduleBooking[];
  completedCount: number;
  todaysEarnings: number;
}

const NEXT_BOOKING_ACTION: Partial<Record<BookingStatus, { label: string; status: BookingStatus }>> = {
  ASSIGNED: { label: "Start Travel", status: "TRAVELING" },
  TRAVELING: { label: "Mark Arrived", status: "ARRIVED" },
  ARRIVED: { label: "Start Service", status: "IN_SERVICE" },
  IN_SERVICE: { label: "Complete Service", status: "COMPLETED" },
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function TherapistHome({ initial }: { initial: ScheduleData }) {
  const [data, setData] = useState(initial);
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(() => (typeof window === "undefined" ? 0 : queueLength()));
  const online = useOnlineStatus();

  useEffect(() => {
    if (!online) return;
    flushQueue().then(({ succeeded }) => {
      if (succeeded > 0) refresh();
      setPendingSync(queueLength());
    });
  }, [online]);

  async function refresh() {
    try {
      const res = await fetch("/api/therapists/me/schedule");
      if (res.ok) setData(await res.json());
    } catch {
      // Offline — keep showing the last cached schedule (service worker
      // serves the cached response for this same URL when fetch fails).
    }
  }

  async function setTherapistStatus(status: "AVAILABLE" | "ON_BREAK" | "OFF_DUTY") {
    const body = { status };
    const url = `/api/therapists/${data.therapist.id}/status`;
    if (!online) {
      enqueue(url, body);
      setPendingSync(queueLength());
      setData((d) => ({ ...d, therapist: { ...d.therapist, status } }));
      return;
    }
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) await refresh();
  }

  async function advanceBooking(booking: ScheduleBooking, toStatus: BookingStatus) {
    setBusyBookingId(booking.id);
    try {
      // Capture a GPS ping when heading out or arriving, per spec section
      // 11 — only while actively traveling to/from a booking, not 24/7.
      if ((toStatus === "TRAVELING" || toStatus === "ARRIVED") && "geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const locUrl = `/api/therapists/${data.therapist.id}/location`;
              const locBody = { lat: pos.coords.latitude, lng: pos.coords.longitude, bookingId: booking.id };
              if (!online) enqueue(locUrl, locBody);
              else await fetch(locUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(locBody) }).catch(() => {});
              resolve();
            },
            () => resolve(),
            { timeout: 5000 }
          );
        });
      }

      const url = `/api/bookings/${booking.id}/status`;
      const body = { status: toStatus };
      if (!online) {
        enqueue(url, body);
        setPendingSync(queueLength());
        setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === booking.id ? { ...b, status: toStatus } : b)) }));
        return;
      }
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) await refresh();
    } finally {
      setBusyBookingId(null);
    }
  }

  const isAvailable = data.therapist.status === "AVAILABLE";
  const isOffline = data.therapist.status === "OFFLINE";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-fg-muted">
          {greeting()}, {data.therapist.name.split(" ")[0]}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <TherapistStatusPill status={data.therapist.status} />
          {!online && (
            <span className="flex items-center gap-1 text-xs text-warning">
              <WifiOff size={12} /> Offline{pendingSync > 0 && ` · ${pendingSync} queued`}
            </span>
          )}
        </div>
      </div>

      {isOffline ? (
        <Button size="lg" className="w-full" onClick={() => setTherapistStatus("AVAILABLE")}>
          Go Available
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button variant={isAvailable ? "primary" : "secondary"} onClick={() => setTherapistStatus("AVAILABLE")}>
            Available
          </Button>
          <Button variant="secondary" onClick={() => setTherapistStatus("ON_BREAK")}>
            On Break
          </Button>
          <Button variant="secondary" className="col-span-2" onClick={() => setTherapistStatus("OFF_DUTY")}>
            Go Off Duty
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{data.completedCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Today&apos;s Earnings</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{formatCurrency(data.todaysEarnings)}</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">Today&apos;s Schedule</h2>
        <div className="space-y-3">
          {data.bookings.map((b) => {
            const action = NEXT_BOOKING_ACTION[b.status];
            return (
              <Card key={b.id} className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-fg">{formatTimeManila(new Date(b.scheduledStart))}</p>
                    <p className="text-sm text-fg-muted">{b.service.name}</p>
                  </div>
                  <TherapistStatusPill status={statusToTherapistStatus(b.status)} />
                </div>
                <p className="mb-1 text-sm text-fg">{b.client.name}</p>
                <p className="mb-3 text-xs text-fg-muted">
                  {b.clientAddressLine}
                  {b.landmark && ` (near ${b.landmark})`}
                </p>
                {action && (
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={busyBookingId === b.id}
                    onClick={() => advanceBooking(b, action.status)}
                  >
                    {busyBookingId === b.id ? "Updating…" : action.label}
                  </Button>
                )}
                {b.status === "COMPLETED" && <p className="text-center text-sm text-success">Service completed</p>}
              </Card>
            );
          })}
          {data.bookings.length === 0 && <p className="text-sm text-fg-muted">No bookings scheduled today.</p>}
        </div>
      </div>
    </div>
  );
}

function statusToTherapistStatus(status: BookingStatus): TherapistStatus {
  switch (status) {
    case "TRAVELING":
      return "TRAVELING";
    case "ARRIVED":
      return "ARRIVED";
    case "IN_SERVICE":
      return "IN_SERVICE";
    case "COMPLETED":
      return "COMPLETED";
    default:
      return "RESERVED";
  }
}
