import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { Card } from "@/components/ui/card";
import { LiveMapClient } from "@/components/live-map/live-map-client";

export default async function LiveMapPage() {
  await requirePermission("therapists:gps:read");

  const therapists = await prisma.therapist.findMany({
    where: { active: true },
    select: {
      id: true,
      status: true,
      currentLat: true,
      currentLng: true,
      homeLat: true,
      homeLng: true,
      locationUpdatedAt: true,
      user: { select: { name: true } },
    },
  });

  const initial = therapists.map((t) => ({
    therapistId: t.id,
    name: t.user.name,
    status: t.status,
    lat: t.currentLat ? Number(t.currentLat) : t.homeLat ? Number(t.homeLat) : null,
    lng: t.currentLng ? Number(t.currentLng) : t.homeLng ? Number(t.homeLng) : null,
    isLive: Boolean(t.currentLat && t.currentLng),
    locationUpdatedAt: t.locationUpdatedAt ? t.locationUpdatedAt.toISOString() : null,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-fg">Live Map</h1>
        <p className="text-sm text-fg-muted">
          Operational location only — never shown to clients (spec section 11/32). Refreshes every 15 seconds.
        </p>
      </div>
      <Card className="p-2">
        <LiveMapClient initial={initial} />
      </Card>
    </div>
  );
}
