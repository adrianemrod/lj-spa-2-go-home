"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { THERAPIST_STATUS_LABEL } from "@/lib/status-labels";
import type { TherapistStatus } from "@prisma/client";

interface TherapistLocation {
  therapistId: string;
  name: string;
  status: TherapistStatus;
  lat: number | null;
  lng: number | null;
  isLive: boolean;
  locationUpdatedAt: string | null;
}

const STATUS_COLOR: Record<TherapistStatus, string> = {
  OFFLINE: "#8a8a8a",
  AVAILABLE: "#1e7d4f",
  RESERVED: "#3a5a78",
  CONFIRMED: "#3a5a78",
  TRAVELING: "#b3241f",
  ARRIVED: "#b3241f",
  IN_SERVICE: "#b56a00",
  COMPLETED: "#8a8a8a",
  ON_BREAK: "#8a8a8a",
  OFF_DUTY: "#8a8a8a",
  EMERGENCY: "#b3261e",
  LOCATION_UNAVAILABLE: "#b3261e",
};

const METRO_MANILA_CENTER: [number, number] = [14.5995, 121.02];

export function TherapistMap({ initial }: { initial: TherapistLocation[] }) {
  const [therapists, setTherapists] = useState(initial);

  useEffect(() => {
    const timer = setInterval(async () => {
      const res = await fetch("/api/therapists/locations");
      if (res.ok) {
        const data = await res.json();
        setTherapists(data.therapists);
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, []);

  const withLocation = therapists.filter((t): t is TherapistLocation & { lat: number; lng: number } => t.lat != null && t.lng != null);

  return (
    <MapContainer center={METRO_MANILA_CENTER} zoom={11} style={{ height: "600px", width: "100%", borderRadius: "var(--radius-lg)" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withLocation.map((t) => (
        <CircleMarker
          key={t.therapistId}
          center={[t.lat, t.lng]}
          radius={10}
          pathOptions={{ color: STATUS_COLOR[t.status], fillColor: STATUS_COLOR[t.status], fillOpacity: 0.8 }}
        >
          <Popup>
            <strong>{t.name}</strong>
            <br />
            {THERAPIST_STATUS_LABEL[t.status]}
            <br />
            {t.isLive
              ? `Last GPS: ${t.locationUpdatedAt ? new Date(t.locationUpdatedAt).toLocaleTimeString("en-PH") : "unknown"}`
              : "Showing base location (no live GPS yet today)"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
