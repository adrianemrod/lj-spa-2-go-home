"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export interface ServiceFormTherapist {
  id: string;
  name: string;
}

export interface ServiceFormValues {
  id?: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  commissionType: "FLAT" | "PERCENTAGE";
  commissionValue: number;
  bufferMinutes: number;
  active: boolean;
  therapistIds: string[];
}

const DEFAULTS: ServiceFormValues = {
  name: "",
  description: "",
  durationMinutes: 60,
  price: 0,
  commissionType: "PERCENTAGE",
  commissionValue: 30,
  bufferMinutes: 15,
  active: true,
  therapistIds: [],
};

export function ServiceForm({
  initial,
  therapists,
}: {
  initial?: ServiceFormValues;
  therapists: ServiceFormTherapist[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ServiceFormValues>(initial ?? DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(values.id ? `/api/services/${values.id}` : "/api/services", {
        method: values.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, requiredSkillTags: [] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save this service.");
        return;
      }
      router.push("/services");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  function toggleTherapist(id: string) {
    setValues((v) => ({
      ...v,
      therapistIds: v.therapistIds.includes(id) ? v.therapistIds.filter((t) => t !== id) : [...v.therapistIds, id],
    }));
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      <Card>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Service name</Label>
            <Input id="name" required value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                step={15}
                required
                value={values.durationMinutes}
                onChange={(e) => setValues({ ...values, durationMinutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="price">Price (₱)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={1}
                required
                value={values.price}
                onChange={(e) => setValues({ ...values, price: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="commissionType">Commission type</Label>
              <Select
                id="commissionType"
                value={values.commissionType}
                onChange={(e) => setValues({ ...values, commissionType: e.target.value as "FLAT" | "PERCENTAGE" })}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT">Flat amount</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="commissionValue">
                Commission {values.commissionType === "PERCENTAGE" ? "(%)" : "(₱)"}
              </Label>
              <Input
                id="commissionValue"
                type="number"
                min={0}
                value={values.commissionValue}
                onChange={(e) => setValues({ ...values, commissionValue: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="buffer">Buffer after (min)</Label>
              <Input
                id="buffer"
                type="number"
                min={0}
                value={values.bufferMinutes}
                onChange={(e) => setValues({ ...values, bufferMinutes: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={values.active}
              onChange={(e) => setValues({ ...values, active: e.target.checked })}
            />
            Active (bookable by clients and staff)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Label className="mb-3">Therapists who can perform this service</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {therapists.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={values.therapistIds.includes(t.id)}
                  onChange={() => toggleTherapist(t.id)}
                />
                {t.name}
              </label>
            ))}
            {therapists.length === 0 && <p className="text-sm text-fg-muted">No therapists yet.</p>}
          </div>
        </CardContent>
      </Card>

      <FieldError>{error ?? undefined}</FieldError>
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Service"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/services")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
