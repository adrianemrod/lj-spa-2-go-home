import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/require-permission";
import { apiErrorResponse } from "@/lib/api-error";
import { recommendTherapistsForBooking } from "@/lib/scheduling/recommend";
import { minutesOfDayManila } from "@/lib/format";

const bodySchema = z.object({
  serviceId: z.string().uuid(),
  date: z.coerce.date(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  notBefore: z.coerce.date().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requirePermission("bookings:create");
    const body = bodySchema.parse(await req.json());

    const recommendations = await recommendTherapistsForBooking({
      serviceId: body.serviceId,
      date: body.date,
      destination: { lat: body.lat, lng: body.lng },
      notBeforeMinutes: body.notBefore ? minutesOfDayManila(body.notBefore) : undefined,
      includeNextAvailable: true,
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
