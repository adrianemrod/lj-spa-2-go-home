"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Day {
  dayOfWeek: number;
  isActive: boolean;
  startMinutes: number;
  endMinutes: number;
  breakStartMinutes: number | null;
  breakEndMinutes: number | null;
}

function toTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function fromTimeInput(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function WorkingHoursEditor({ therapistId, initial }: { therapistId: string; initial: Day[] }) {
  const [days, setDays] = useState<Day[]>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function update(dayOfWeek: number, patch: Partial<Day>) {
    setDays((d) => d.map((x) => (x.dayOfWeek === dayOfWeek ? { ...x, ...patch } : x)));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/therapists/${therapistId}/working-hours`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    setSaving(false);
    setMessage(res.ok ? "Working hours saved." : "Could not save working hours.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Hours (Asia/Manila)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-0">
            <label className="flex w-28 items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={day.isActive}
                onChange={(e) => update(day.dayOfWeek, { isActive: e.target.checked })}
              />
              {DAY_LABELS[day.dayOfWeek]}
            </label>
            {day.isActive && (
              <>
                <Input
                  type="time"
                  className="w-32"
                  value={toTimeInput(day.startMinutes)}
                  onChange={(e) => update(day.dayOfWeek, { startMinutes: fromTimeInput(e.target.value) })}
                />
                <span className="text-fg-muted">to</span>
                <Input
                  type="time"
                  className="w-32"
                  value={toTimeInput(day.endMinutes)}
                  onChange={(e) => update(day.dayOfWeek, { endMinutes: fromTimeInput(e.target.value) })}
                />
                <span className="ml-2 text-xs text-fg-muted">Break</span>
                <Input
                  type="time"
                  className="w-32"
                  value={day.breakStartMinutes != null ? toTimeInput(day.breakStartMinutes) : ""}
                  onChange={(e) =>
                    update(day.dayOfWeek, {
                      breakStartMinutes: e.target.value ? fromTimeInput(e.target.value) : null,
                    })
                  }
                />
                <span className="text-fg-muted">to</span>
                <Input
                  type="time"
                  className="w-32"
                  value={day.breakEndMinutes != null ? toTimeInput(day.breakEndMinutes) : ""}
                  onChange={(e) =>
                    update(day.dayOfWeek, { breakEndMinutes: e.target.value ? fromTimeInput(e.target.value) : null })
                  }
                />
              </>
            )}
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Working Hours"}
          </Button>
          {message && <span className="text-sm text-fg-muted">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
