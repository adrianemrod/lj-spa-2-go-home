"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { TherapistMap } from "@/components/live-map/therapist-map";

const Map = dynamic(() => import("@/components/live-map/therapist-map").then((m) => m.TherapistMap), {
  ssr: false,
  loading: () => <div className="flex h-[600px] items-center justify-center text-fg-muted">Loading map…</div>,
});

export function LiveMapClient(props: ComponentProps<typeof TherapistMap>) {
  return <Map {...props} />;
}
