import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * Operational location feed for the admin Live Map. Gated to
 * therapists:gps:read — this is exactly the data spec section 32 says
 * must never reach a client ("exact therapist GPS"); it is admin/
 * dispatcher/manager only, and even they see it purely for dispatch.
 */
export async function GET() {
  try {
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

    return NextResponse.json({
      therapists: therapists.map((t) => ({
        therapistId: t.id,
        name: t.user.name,
        status: t.status,
        lat: t.currentLat ? Number(t.currentLat) : t.homeLat ? Number(t.homeLat) : null,
        lng: t.currentLng ? Number(t.currentLng) : t.homeLng ? Number(t.homeLng) : null,
        isLive: Boolean(t.currentLat && t.currentLng),
        locationUpdatedAt: t.locationUpdatedAt,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
