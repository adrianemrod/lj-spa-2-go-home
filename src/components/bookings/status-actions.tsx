"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@prisma/client";

const NEXT_STATUS: Partial<Record<BookingStatus, { label: string; status: BookingStatus }[]>> = {
  PENDING: [{ label: "Confirm", status: "CONFIRMED" }],
  ASSIGNED: [{ label: "Start Travel", status: "TRAVELING" }],
  TRAVELING: [{ label: "Mark Arrived", status: "ARRIVED" }],
  ARRIVED: [{ label: "Start Service", status: "IN_SERVICE" }],
  IN_SERVICE: [{ label: "Complete Service", status: "COMPLETED" }],
};

export function BookingStatusActions({ bookingId, status }: { bookingId: string; status: BookingStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = NEXT_STATUS[status] ?? [];
  const cancellable = status !== "COMPLETED" && status !== "CANCELLED" && status !== "NO_SHOW";

  async function transition(next: BookingStatus, reason?: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not update the booking status.");
      return;
    }
    router.refresh();
  }

  function cancel() {
    const reason = window.prompt("Reason for cancellation:");
    if (!reason) return;
    transition("CANCELLED", reason);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button key={o.status} size="sm" disabled={busy} onClick={() => transition(o.status)}>
            {o.label}
          </Button>
        ))}
        {cancellable && (
          <Button size="sm" variant="danger" disabled={busy} onClick={cancel}>
            Cancel Booking
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
