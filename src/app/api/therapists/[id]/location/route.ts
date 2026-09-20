import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";
import { can } from "@/lib/auth/permissions";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";

interface Params {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  bookingId: z.string().uuid().optional(),
});

/**
 * GPS ping from the therapist PWA. Per spec section 11 (LOCATION PRIVACY),
 * this is only meaningful — and only accepted — while the therapist is on
 * an active shift (not OFFLINE). We don't track anyone 24/7: a therapist
 * who has gone OFFLINE has nothing to report, and the client stops
 * requesting geolocation once they do.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const isSelf = session.role === "THERAPIST" && session.therapistId === id;
    if (!isSelf && !can(session.role, "therapists:manage")) {
      throw new FriendlyError("Not authorized to update this therapist's location.");
    }
    const body = bodySchema.parse(await req.json());

    const therapist = await prisma.therapist.findUniqueOrThrow({ where: { id }, select: { status: true } });
    if (therapist.status === "OFFLINE") {
      throw new FriendlyError("Cannot record location for a therapist who is offline.");
    }

    await prisma.$transaction([
      prisma.therapist.update({
        where: { id },
        data: {
          currentLat: body.lat,
          currentLng: body.lng,
          locationUpdatedAt: new Date(),
          locationSharingActive: true,
        },
      }),
      prisma.therapistLocationLog.create({
        data: { therapistId: id, lat: body.lat, lng: body.lng, bookingId: body.bookingId },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
