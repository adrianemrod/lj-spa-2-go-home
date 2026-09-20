"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { BusinessSettings } from "@/lib/validation/settings";

export function BusinessSettingsForm({ initial }: { initial: BusinessSettings }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save settings.");
        return;
      }
      setValues(data.settings);
      setSaved(true);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <Card>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={values.businessName}
              onChange={(e) => setValues({ ...values, businessName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buffer">Default travel buffer (min)</Label>
              <Input
                id="buffer"
                type="number"
                min={0}
                value={values.defaultTravelBufferMinutes}
                onChange={(e) => setValues({ ...values, defaultTravelBufferMinutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="advance">Max advance booking (days)</Label>
              <Input
                id="advance"
                type="number"
                min={1}
                value={values.maxAdvanceBookingDays}
                onChange={(e) => setValues({ ...values, maxAdvanceBookingDays: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cancellation">Cancellation policy</Label>
            <Textarea
              id="cancellation"
              value={values.cancellationPolicy}
              onChange={(e) => setValues({ ...values, cancellationPolicy: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="noshow">No-show policy</Label>
            <Textarea id="noshow" value={values.noShowPolicy} onChange={(e) => setValues({ ...values, noShowPolicy: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="reminders">Reminder timing (hours before, comma-separated)</Label>
            <Input
              id="reminders"
              value={values.reminderHoursBefore.join(", ")}
              onChange={(e) =>
                setValues({
                  ...values,
                  reminderHoursBefore: e.target.value
                    .split(",")
                    .map((s) => Number(s.trim()))
                    .filter((n) => !Number.isNaN(n)),
                })
              }
            />
          </div>
        </CardContent>
      </Card>
      <FieldError>{error ?? undefined}</FieldError>
      {saved && <p className="text-sm text-success">Settings saved.</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </form>
  );
}
