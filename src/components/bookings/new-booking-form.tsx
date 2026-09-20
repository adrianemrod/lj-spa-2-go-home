"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

interface ClientOption {
  id: string;
  name: string;
  phone: string;
}

interface Recommendation {
  therapistId: string;
  name: string;
  distanceKm: number;
  today: { available: true; start: string; travelInMinutes: number } | { available: false; reason: string };
  next?: { available: true; start: string } | { available: false; reason: string };
}

const UNAVAILABLE_LABEL: Record<string, string> = {
  DAY_OFF: "Day off",
  ORIGIN_UNKNOWN: "No base location set",
  NO_SLOT_AVAILABLE: "Fully booked",
};

export function NewBookingForm({ services, clients }: { services: ServiceOption[]; clients: ClientOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    serviceId: "",
    clientId: "",
    newClientName: "",
    newClientPhone: "",
    addressLine: "",
    landmark: "",
    lat: "",
    lng: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    notes: "",
  });
  const [useNewClient, setUseNewClient] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);
  const [anyAvailable, setAnyAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function checkAvailability() {
    if (!form.serviceId || !form.lat || !form.lng || !form.date) {
      setError("Choose a service, date, and location first.");
      return;
    }
    setChecking(true);
    setError(null);
    setRecommendations(null);
    setSelectedTherapistId(null);
    try {
      const notBefore = form.time ? new Date(`${form.date}T${form.time}:00`) : undefined;
      const res = await fetch("/api/scheduling/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: form.serviceId,
          date: form.date,
          lat: Number(form.lat),
          lng: Number(form.lng),
          notBefore,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not check availability.");
        return;
      }
      setRecommendations(data.recommendations);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setChecking(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!anyAvailable && !selectedTherapistId) {
      setError("Pick a therapist and time slot (or choose \"any available therapist\").");
      return;
    }
    const chosen = recommendations?.find((r) => r.therapistId === selectedTherapistId);
    const scheduledStart =
      chosen && chosen.today.available ? chosen.today.start : form.time ? `${form.date}T${form.time}:00` : null;
    if (!anyAvailable && !scheduledStart) {
      setError("This therapist has no available slot today.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: useNewClient ? undefined : form.clientId,
          newClient: useNewClient ? { name: form.newClientName, phone: form.newClientPhone } : undefined,
          serviceId: form.serviceId,
          therapistId: anyAvailable ? undefined : selectedTherapistId,
          anyAvailableTherapist: anyAvailable,
          date: form.date,
          scheduledStart: anyAvailable ? `${form.date}T${form.time || "09:00"}:00` : scheduledStart,
          clientAddressLine: form.addressLine,
          landmark: form.landmark,
          latitude: Number(form.lat),
          longitude: Number(form.lng),
          notes: form.notes,
          discount: 0,
          amountPaidNow: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create this booking.");
        return;
      }
      router.push(`/bookings/${data.booking.id}`);
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
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={!useNewClient} onChange={() => setUseNewClient(false)} /> Existing client
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={useNewClient} onChange={() => setUseNewClient(true)} /> New client
            </label>
          </div>
          {useNewClient ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newClientName">Name</Label>
                <Input
                  id="newClientName"
                  required={useNewClient}
                  value={form.newClientName}
                  onChange={(e) => setForm({ ...form, newClientName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="newClientPhone">Phone</Label>
                <Input
                  id="newClientPhone"
                  required={useNewClient}
                  value={form.newClientPhone}
                  onChange={(e) => setForm({ ...form, newClientPhone: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </Select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service &amp; Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="service">Service</Label>
            <Select id="service" required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
              <option value="">Select a service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.durationMinutes} min
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="addressLine">Client address</Label>
            <Input
              id="addressLine"
              required
              value={form.addressLine}
              onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="landmark">Landmark</Label>
              <Input id="landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" type="number" step="any" required value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" type="number" step="any" required value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="time">Earliest requested time (optional)</Label>
              <Input id="time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={checkAvailability} disabled={checking}>
            <Search size={16} /> {checking ? "Checking…" : "Check Availability"}
          </Button>
        </CardContent>
      </Card>

      {recommendations && (
        <Card>
          <CardHeader>
            <CardTitle>Available Therapists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="mb-2 flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={anyAvailable}
                onChange={(e) => {
                  setAnyAvailable(e.target.checked);
                  setSelectedTherapistId(null);
                }}
              />
              Any available therapist (system picks the earliest match)
            </label>
            {recommendations.map((r) => (
              <button
                type="button"
                key={r.therapistId}
                disabled={!r.today.available || anyAvailable}
                onClick={() => setSelectedTherapistId(r.therapistId)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[var(--radius-sm)] border px-3 py-2.5 text-left text-sm transition-colors",
                  selectedTherapistId === r.therapistId ? "border-accent bg-accent/10" : "border-border",
                  !r.today.available && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  {r.today.available ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : (
                    <XCircle size={16} className="text-critical" />
                  )}
                  <span className="font-medium text-fg">{r.name}</span>
                  <Badge>{r.distanceKm} km</Badge>
                </div>
                {r.today.available ? (
                  <span className="text-fg-muted">
                    {new Date(r.today.start).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })} ·{" "}
                    {r.today.travelInMinutes} min travel
                  </span>
                ) : (
                  <span className="text-fg-muted">
                    {UNAVAILABLE_LABEL[r.today.reason] ?? r.today.reason}
                    {r.next?.available && (
                      <>
                        {" "}
                        · Next:{" "}
                        {new Date(r.next.start).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </>
                    )}
                  </span>
                )}
              </button>
            ))}
            {recommendations.length === 0 && (
              <p className="text-sm text-fg-muted">No qualified therapists found within range for this service.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </CardContent>
      </Card>

      <FieldError>{error ?? undefined}</FieldError>
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Booking…" : "Confirm Booking"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/bookings")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
