"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export interface TherapistFormService {
  id: string;
  name: string;
}

export function TherapistCreateForm({ services }: { services: TherapistFormService[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    bio: "",
    maxTravelRadiusKm: 15,
    homeLat: "",
    homeLng: "",
  });
  const [serviceIds, setServiceIds] = useState<string[]>([]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/therapists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          homeLat: Number(form.homeLat),
          homeLng: Number(form.homeLng),
          serviceIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create this therapist.");
        return;
      }
      router.push(`/therapists/${data.therapist.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Login email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">Initial password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm font-medium text-fg">Base location &amp; travel</p>
          <p className="text-xs text-fg-muted">
            Where this therapist starts their day from (home or the shop) — required for the scheduling engine to
            calculate travel time to the first booking of the day.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="homeLat">Latitude</Label>
              <Input
                id="homeLat"
                type="number"
                step="any"
                required
                placeholder="14.6091"
                value={form.homeLat}
                onChange={(e) => setForm({ ...form, homeLat: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="homeLng">Longitude</Label>
              <Input
                id="homeLng"
                type="number"
                step="any"
                required
                placeholder="121.0223"
                value={form.homeLng}
                onChange={(e) => setForm({ ...form, homeLng: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="radius">Max travel radius (km)</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                value={form.maxTravelRadiusKm}
                onChange={(e) => setForm({ ...form, maxTravelRadiusKm: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Label className="mb-3">Services this therapist can perform</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.id)}
                  onChange={() =>
                    setServiceIds((ids) => (ids.includes(s.id) ? ids.filter((i) => i !== s.id) : [...ids, s.id]))
                  }
                />
                {s.name}
              </label>
            ))}
            {services.length === 0 && <p className="text-sm text-fg-muted">Create services first.</p>}
          </div>
        </CardContent>
      </Card>

      <FieldError>{error ?? undefined}</FieldError>
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create Therapist"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/therapists")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
