import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { getPublicAvailability } from "@/lib/scheduling/public-availability";

const bodySchema = z.object({
  serviceId: z.string().uuid(),
  date: z.coerce.date(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const availability = await getPublicAvailability({
      serviceId: body.serviceId,
      date: body.date,
      destination: { lat: body.lat, lng: body.lng },
    });
    return NextResponse.json({ availability });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
