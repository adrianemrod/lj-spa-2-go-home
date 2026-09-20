"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateManila } from "@/lib/format";

interface DayOff {
  id: string;
  date: string;
  reason: string | null;
}

export function DaysOffManager({ therapistId, initial }: { therapistId: string; initial: DayOff[] }) {
  const [daysOff, setDaysOff] = useState(initial);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addDayOff() {
    if (!date) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/therapists/${therapistId}/days-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, reason }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add this day off.");
      return;
    }
    setDaysOff((d) => [...d, data.dayOff].sort((a, b) => a.date.localeCompare(b.date)));
    setDate("");
    setReason("");
  }

  async function removeDayOff(id: string) {
    await fetch(`/api/therapists/${therapistId}/days-off/${id}`, { method: "DELETE" });
    setDaysOff((d) => d.filter((x) => x.id !== id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Days Off</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {daysOff.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-fg/5 px-3 py-2 text-sm">
              <span>
                {formatDateManila(new Date(d.date))} {d.reason && <span className="text-fg-muted">— {d.reason}</span>}
              </span>
              <button onClick={() => removeDayOff(d.id)} className="text-fg-muted hover:text-critical" aria-label="Remove">
                <X size={14} />
              </button>
            </li>
          ))}
          {daysOff.length === 0 && <p className="text-sm text-fg-muted">No upcoming days off.</p>}
        </ul>
        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input placeholder="Reason (optional)" className="w-48" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button type="button" size="sm" onClick={addDayOff} disabled={saving || !date}>
            Add
          </Button>
        </div>
        {error && <p className="text-xs text-critical">{error}</p>}
      </CardContent>
    </Card>
  );
}
