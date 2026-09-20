"use client";

import { useState } from "react";
import { CheckCircle2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatCurrency, minutesToDurationLabel } from "@/lib/format";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
}

interface Availability {
  therapistId: string;
  name: string;
  photoUrl: string | null;
  ratingAvg: number | null;
  availableNow: boolean;
  nextAvailableLabel: string;
  nextAvailableStart: string | null;
}

type Step = "service" | "location" | "therapist" | "details" | "confirmation";

export function BookingWizard({ services }: { services: Service[] }) {
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [locating, setLocating] = useState(false);
  const [availability, setAvailability] = useState<Availability[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);
  const [anyAvailable, setAnyAvailable] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ bookingNumber: string; scheduledStart: string } | null>(null);

  const selectedService = services.find((s) => s.id === serviceId);

  function useMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  async function checkAvailability() {
    setError(null);
    if (!serviceId || !lat || !lng) {
      setError("Choose a service and set your location first.");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/public/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, date, lat: Number(lat), lng: Number(lng) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not check availability.");
        return;
      }
      setAvailability(data.availability);
      setStep("therapist");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setChecking(false);
    }
  }

  async function submitBooking() {
    setError(null);
    if (!name || !phone || !addressLine) {
      setError("Please fill in your name, phone, and address.");
      return;
    }
    const chosen = availability?.find((a) => a.therapistId === selectedTherapistId);
    if (!anyAvailable && !chosen?.nextAvailableStart) {
      setError("Please choose a therapist and time, or select any available therapist.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newClient: { name, phone, email },
          serviceId,
          therapistId: anyAvailable ? undefined : selectedTherapistId,
          anyAvailableTherapist: anyAvailable,
          date,
          scheduledStart: anyAvailable ? `${date}T09:00:00` : chosen!.nextAvailableStart,
          clientAddressLine: addressLine,
          landmark,
          latitude: Number(lat),
          longitude: Number(lng),
          notes,
          discount: 0,
          amountPaidNow: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create your booking.");
        return;
      }
      setConfirmation(data);
      setStep("confirmation");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "confirmation" && confirmation) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-4 text-success" />
        <h2 className="font-serif text-xl text-fg">Booking Requested</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Booking #{confirmation.bookingNumber}
          <br />
          {new Date(confirmation.scheduledStart).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
        </p>
        <p className="mt-4 text-sm text-fg-muted">
          We&apos;ll text or call you shortly to confirm. Payment is collected by your therapist on arrival unless
          arranged otherwise.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {error && <FieldError>{error}</FieldError>}

      {step === "service" && (
        <div className="space-y-3">
          <h2 className="font-serif text-xl text-fg">Choose a service</h2>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setServiceId(s.id);
                setStep("location");
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
                serviceId === s.id ? "border-accent bg-accent/10" : "border-border hover:bg-fg/5"
              )}
            >
              <div>
                <p className="font-medium text-fg">{s.name}</p>
                <p className="text-sm text-fg-muted">{minutesToDurationLabel(s.durationMinutes)}</p>
              </div>
              <p className="font-serif text-lg text-accent">{formatCurrency(s.price)}</p>
            </button>
          ))}
        </div>
      )}

      {step === "location" && selectedService && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl text-fg">Where should we come?</h2>
          <div>
            <Label htmlFor="addressLine">Address</Label>
            <Input id="addressLine" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="landmark">Landmark (optional)</Label>
            <Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" onClick={useMyLocation} disabled={locating}>
            {locating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />} Use my current location
          </Button>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="date">Preferred date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button onClick={checkAvailability} disabled={checking} className="w-full">
            {checking ? "Checking availability…" : "See Available Therapists"}
          </Button>
        </div>
      )}

      {step === "therapist" && availability && (
        <div className="space-y-3">
          <h2 className="font-serif text-xl text-fg">Choose your therapist</h2>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={anyAvailable}
              onChange={(e) => {
                setAnyAvailable(e.target.checked);
                setSelectedTherapistId(null);
              }}
            />
            Any available therapist
          </label>
          {availability.map((a) => (
            <button
              key={a.therapistId}
              disabled={!a.availableNow && !a.nextAvailableStart}
              onClick={() => setSelectedTherapistId(a.therapistId)}
              className={cn(
                "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
                selectedTherapistId === a.therapistId ? "border-accent bg-accent/10" : "border-border hover:bg-fg/5"
              )}
            >
              <div>
                <p className="font-medium text-fg">{a.name}</p>
                <p className="text-sm text-fg-muted">{a.nextAvailableLabel}</p>
              </div>
              {a.availableNow && <span className="text-xs font-medium text-success">Available Now</span>}
            </button>
          ))}
          {availability.length === 0 && <p className="text-sm text-fg-muted">No therapists available for this service in your area.</p>}
          <Button
            className="w-full"
            disabled={!anyAvailable && !selectedTherapistId}
            onClick={() => setStep("details")}
          >
            Continue
          </Button>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl text-fg">Your details</h2>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Special instructions</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button onClick={submitBooking} disabled={submitting} className="w-full">
            {submitting ? "Booking…" : "Confirm Booking"}
          </Button>
        </div>
      )}
    </div>
  );
}
